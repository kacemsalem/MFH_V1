from django.db import models
from django.db.models import Q, Sum
from django.core.exceptions import ValidationError


# =====================================================
# CLIENT
# =====================================================
class Client(models.Model):
    STATUT_CHOIX = [
        ("AQUEREUR", "AQUEREUR"),
        ("SOCIETE", "SOCIETE"),
    ]
    nom_prenom_client = models.CharField(max_length=150)
    cin_client        = models.CharField(max_length=20, blank=True, null=True)
    tel_client        = models.CharField(max_length=20, blank=True, null=True)
    email_client      = models.EmailField(blank=True, null=True)
    obs_client        = models.TextField(blank=True, null=True)
    statut_client     = models.CharField(max_length=20, choices=STATUT_CHOIX, blank=True, null=True)

    def __str__(self):
        return self.nom_prenom_client


# =====================================================
# NOTAIRE
# =====================================================
class Notaire(models.Model):
    nom_prenom_not = models.CharField(max_length=150)
    email_notaire  = models.EmailField(blank=True, null=True)
    tel_notaire    = models.CharField(max_length=20, blank=True, null=True)
    obs_notaire    = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_prenom_not


# =====================================================
# COMMERCIAL
# =====================================================
class Commercial(models.Model):
    nom_prenom = models.CharField(max_length=150)
    email_comm = models.EmailField(blank=True, null=True)
    tel_comm   = models.CharField(max_length=20, blank=True, null=True)
    obs_comm   = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_prenom


# =====================================================
# LOT
# =====================================================
class Lot(models.Model):
    ilot          = models.IntegerField(default=0)
    lot           = models.IntegerField(default=0)
    tranche       = models.CharField(max_length=6, blank=True)
    n_titre       = models.CharField(max_length=20, null=True, blank=True)
    categorie     = models.CharField(max_length=100, null=True)
    designation   = models.CharField(max_length=200, blank=True, null=True)
    surface       = models.IntegerField(default=0, null=True)
    prix_reference = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True)
    # situation est mis à jour automatiquement par Dossier.save()
    situation     = models.CharField(max_length=10)
    obs_lot       = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Îlot {self.ilot} - Lot {self.lot} (Tr.{self.tranche})"

    class Meta:
        ordering = ["ilot", "lot"]
        constraints = [
            models.UniqueConstraint(
                fields=["n_titre"],
                condition=Q(n_titre__isnull=False) & ~Q(n_titre=""),
                name="uniq_lot_n_titre_if_filled",
            )
        ]


# =====================================================
# DOSSIER (TABLE PRINCIPALE)
# =====================================================
class Dossier(models.Model):
    SITUATION_CHOICES = [
        ("RESERVATION", "Réservation"),
        ("VENTE",       "Vente"),
        ("DESISTEMENT", "Désistement"),
    ]

    lot        = models.ForeignKey(Lot,        on_delete=models.CASCADE,  related_name="dossiers")
    client     = models.ForeignKey(Client,     on_delete=models.CASCADE)
    notaire    = models.ForeignKey(Notaire,    null=True, blank=True, on_delete=models.SET_NULL)
    commercial = models.ForeignKey(Commercial, null=True, blank=True, on_delete=models.SET_NULL)

    date_reservation = models.DateField(null=True, blank=True)
    date_vente       = models.DateField(null=True, blank=True)
    date_desistement = models.DateField(null=True, blank=True)

    prix_vente = models.DecimalField(max_digits=12, decimal_places=2, default=0, null=True)

    situation_dossier = models.CharField(
        max_length=20,
        choices=SITUATION_CHOICES,
        default="RESERVATION",
    )
    actif = models.BooleanField(default=True)

    def __str__(self):
        return f"Dossier {self.client} — Lot {self.lot}"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["lot"],
                condition=Q(actif=True),
                name="unique_dossier_actif_par_lot",
            )
        ]

    # -------------------------
    # VALIDATION
    # -------------------------
    def clean(self):
        # Un seul dossier actif par lot
        if self.actif:
            qs = Dossier.objects.filter(lot=self.lot, actif=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError("Un dossier actif existe déjà pour ce lot.")

        if not self.prix_vente or self.prix_vente <= 0:
            raise ValidationError("Le prix de vente est obligatoire.")

        if self.situation_dossier == "RESERVATION":
            if not self.date_reservation:
                raise ValidationError("La date de réservation est obligatoire.")

        if self.situation_dossier == "VENTE":
            if not self.date_vente:
                raise ValidationError("La date de vente est obligatoire.")
            # Contrôle montant uniquement si le dossier est déjà en base
            if self.pk and self.montant_restant != 0:
                raise ValidationError(
                    "Montant global non encaissé. Impossible de valider la vente."
                )

        if self.situation_dossier == "DESISTEMENT":
            if not self.date_desistement:
                raise ValidationError("La date de désistement est obligatoire.")

    def save(self, *args, **kwargs):
        # Un désistement clôture automatiquement le dossier
        if self.situation_dossier == "DESISTEMENT":
            self.actif = False
        self.full_clean()
        super().save(*args, **kwargs)
        self._sync_lot_situation()

    # -------------------------
    # SYNCHRONISATION LOT
    # -------------------------
    def _sync_lot_situation(self):
        """Met à jour Lot.situation selon l'état de ce dossier."""
        lot = self.lot
        if self.actif:
            mapping = {
                "VENTE":       "VENDU",
                "RESERVATION": "RESERVE",
                "DESISTEMENT": "LIBRE",
            }
            new_sit = mapping.get(self.situation_dossier, "LIBRE")
        else:
            # Si un autre dossier actif existe → ne pas toucher
            if Dossier.objects.filter(lot=lot, actif=True).exclude(pk=self.pk).exists():
                return
            new_sit = "LIBRE"
        Lot.objects.filter(pk=lot.pk).update(situation=new_sit)

    # -------------------------
    # PROPRIÉTÉS FINANCIÈRES
    # (Django aggregation — pas de boucle Python)
    # -------------------------
    @property
    def total_recu(self):
        result = self.operation.aggregate(t=Sum("montant_recu"))["t"]
        return result or 0

    @property
    def total_livre(self):
        result = self.operation.aggregate(t=Sum("montant_livre"))["t"]
        return result or 0

    @property
    def solde_caisse(self):
        return self.total_recu - self.total_livre

    @property
    def montant_restant(self):
        if self.prix_vente:
            return self.prix_vente - self.total_recu
        return 0

    @property
    def est_vendu(self):
        return self.operation.filter(type_ops="VENTE").exists()


# =====================================================
# CAISSE
# =====================================================
class Caisse(models.Model):
    TYPE_OPS_CHOICES = [
        ("RESERVATION",    "Réservation"),
        ("COMPLEMENT",     "Avance / Complément"),
        ("VENTE",          "Vente"),
        ("REMBOURSEMENT",  "Remboursement"),
    ]

    dossier           = models.ForeignKey(Dossier, on_delete=models.CASCADE, related_name="operation")
    date_caisse       = models.DateField()
    reference_caisse  = models.CharField(max_length=100, blank=True)
    montant_recu      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_livre     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    type_ops          = models.CharField(max_length=20, choices=TYPE_OPS_CHOICES)
    obs_caisse        = models.CharField(max_length=200, blank=True)

    def clean(self):
        from decimal import Decimal
        recu  = self.montant_recu  or Decimal("0")
        livre = self.montant_livre or Decimal("0")

        if recu < 0:
            raise ValidationError("Le montant reçu ne peut pas être négatif.")
        if livre < 0:
            raise ValidationError("Le montant reversé ne peut pas être négatif.")

        # Calcul des totaux existants (hors cet enregistrement)
        ops = self.dossier.operation.all()
        if self.pk:
            ops = ops.exclude(pk=self.pk)
        agg = ops.aggregate(tr=Sum("montant_recu"), tl=Sum("montant_livre"))
        cumul_recu  = (agg["tr"] or Decimal("0")) + recu
        cumul_livre = (agg["tl"] or Decimal("0")) + livre

        # Règle 1 : total reçu ≤ prix de vente
        if self.dossier.prix_vente and cumul_recu > self.dossier.prix_vente:
            raise ValidationError(
                f"Total reçu ({cumul_recu:,.0f}) dépasserait le prix de vente ({self.dossier.prix_vente:,.0f})."
            )

        # Règle 2 : total reversé ≤ total reçu
        if cumul_livre > cumul_recu:
            raise ValidationError(
                f"Total reversé ({cumul_livre:,.0f}) ne peut pas dépasser le total reçu ({cumul_recu:,.0f})."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.dossier} - {self.type_ops} - {self.montant_recu}"

    class Meta:
        verbose_name        = "Opération"
        verbose_name_plural = "Opérations de caisse"
        ordering            = ["date_caisse"]
