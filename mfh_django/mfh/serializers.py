from rest_framework import serializers
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from .models import Client, Notaire, Commercial, Lot, Dossier, Caisse, HistoriqueLot, UserProfile

User = get_user_model()


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class NotaireSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notaire
        fields = "__all__"


class CommercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commercial
        fields = "__all__"


class LotSerializer(serializers.ModelSerializer):
    # Situation affichée = annotation situation_reelle si dispo, sinon champ DB
    # Le champ situation reste writable pour les sauvegardes du formulaire
    commercial_option_display = serializers.SerializerMethodField()
    dossier_prix_vente        = serializers.SerializerMethodField()

    def get_commercial_option_display(self, obj):
        c = obj.commercial_option
        return c.nom_prenom if c else None

    def get_dossier_prix_vente(self, obj):
        try:
            d = obj.dossier_set.filter(actif=True).first()
            return str(d.prix_vente) if d and d.prix_vente else None
        except Exception:
            return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        sit = getattr(instance, "situation_reelle", None)
        if sit:
            ret["situation"] = sit
        return ret

    class Meta:
        model = Lot
        fields = "__all__"


class DossierSerializer(serializers.ModelSerializer):
    # Champs calculés (lecture seule)
    total_recu      = serializers.SerializerMethodField()
    total_livre     = serializers.SerializerMethodField()
    montant_restant = serializers.SerializerMethodField()
    solde_caisse    = serializers.SerializerMethodField()
    # Labels affichage
    lot_display        = serializers.SerializerMethodField()
    client_display     = serializers.SerializerMethodField()
    notaire_display    = serializers.SerializerMethodField()
    commercial_display = serializers.SerializerMethodField()
    # Champs lot pour consultation
    lot_tranche   = serializers.SerializerMethodField()
    lot_ilot      = serializers.SerializerMethodField()
    lot_lot       = serializers.SerializerMethodField()
    lot_n_titre   = serializers.SerializerMethodField()
    lot_categorie = serializers.SerializerMethodField()
    class Meta:
        model = Dossier
        fields = "__all__"

    def get_total_recu(self, obj):
        v = getattr(obj, "total_recu_ann", None)
        return str(v if v is not None else obj.total_recu)

    def get_total_livre(self, obj):
        v = getattr(obj, "total_livre_ann", None)
        return str(v if v is not None else obj.total_livre)

    def get_montant_restant(self, obj):
        total_recu = getattr(obj, "total_recu_ann", None)
        if total_recu is None:
            return str(obj.montant_restant)
        return str((obj.prix_vente or 0) - total_recu)

    def get_solde_caisse(self, obj):
        total_recu  = getattr(obj, "total_recu_ann",  None)
        total_livre = getattr(obj, "total_livre_ann", None)
        if total_recu is None or total_livre is None:
            return str(obj.solde_caisse)
        return str(total_recu - total_livre)

    def get_lot_display(self, obj):
        try:
            l = obj.lot
            if not l:
                return f"Lot #{obj.lot_id}"
            titre = f" [{l.n_titre}]" if l.n_titre else ""
            return f"Îlot {l.ilot} - Lot {l.lot} (Tr.{l.tranche}){titre}"
        except Exception:
            return f"Lot #{obj.lot_id}"

    def get_client_display(self, obj):
        try:
            c = obj.client
            return c.nom_prenom_client if c else ""
        except Exception:
            return f"Client #{obj.client_id}"

    def get_notaire_display(self, obj):
        try:
            n = obj.notaire
            return n.nom_prenom_not if n else ""
        except Exception:
            return f"Notaire #{obj.notaire_id}"

    def get_commercial_display(self, obj):
        try:
            cm = obj.commercial
            return cm.nom_prenom if cm else ""
        except Exception:
            return f"Commercial #{obj.commercial_id}"

    def get_lot_tranche(self, obj):
        try: return obj.lot.tranche
        except Exception: return None

    def get_lot_ilot(self, obj):
        try: return obj.lot.ilot
        except Exception: return None

    def get_lot_lot(self, obj):
        try: return obj.lot.lot
        except Exception: return None

    def get_lot_n_titre(self, obj):
        try: return obj.lot.n_titre or ""
        except Exception: return ""

    def get_lot_categorie(self, obj):
        try: return obj.lot.categorie or ""
        except Exception: return ""


class CaisseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caisse
        fields = "__all__"

    def _wrap(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except DjangoValidationError as e:
            msgs = e.message_dict if hasattr(e, "message_dict") else {"non_field_errors": e.messages}
            raise DRFValidationError(msgs)
        except IntegrityError as e:
            raise DRFValidationError({"non_field_errors": [str(e)]})

    def create(self, validated_data):
        return self._wrap(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._wrap(super().update, instance, validated_data)


class HistoriqueLotSerializer(serializers.ModelSerializer):
    commercial_display = serializers.SerializerMethodField()
    lot_display        = serializers.SerializerMethodField()

    def get_commercial_display(self, obj):
        return obj.commercial.nom_prenom if obj.commercial else "—"

    def get_lot_display(self, obj):
        l = obj.lot
        return f"Îlot {l.ilot} – Lot {l.lot} (Tr.{l.tranche})"

    class Meta:
        model = HistoriqueLot
        fields = "__all__"


# ── Utilisateurs + profils ────────────────────────────────────────────────────

class UserWithProfileSerializer(serializers.ModelSerializer):
    role               = serializers.SerializerMethodField()
    commercial_id      = serializers.SerializerMethodField()
    commercial_name    = serializers.SerializerMethodField()
    password           = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ["id", "username", "email", "first_name", "last_name",
                  "is_active", "role", "commercial_id", "commercial_name", "password"]

    def get_role(self, obj):
        profile = getattr(obj, "profile", None)
        return profile.role if profile else "VIEWER"

    def get_commercial_id(self, obj):
        entity = getattr(obj, "commercial_entity", None)
        return entity.id if entity else None

    def get_commercial_name(self, obj):
        entity = getattr(obj, "commercial_entity", None)
        return entity.nom_prenom if entity else None

    def _apply_role_and_commercial(self, user, data):
        role = data.get("role")
        if role:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.save()

        commercial_id = data.get("commercial_id")
        if commercial_id is not None:
            try:
                comm = Commercial.objects.get(pk=commercial_id)
                comm.user = user
                comm.save(update_fields=["user"])
            except Commercial.DoesNotExist:
                pass
        elif data.get("commercial_id") == "":
            # Détacher le commercial lié
            Commercial.objects.filter(user=user).update(user=None)

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        self._apply_role_and_commercial(user, self.initial_data)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        self._apply_role_and_commercial(instance, self.initial_data)
        return instance
