from datetime import date

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Case, When, Value, CharField, Subquery, OuterRef, Sum, DecimalField, Count
from django.db.models.functions import TruncMonth
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from .models import Lot, Dossier, Client, Notaire, Commercial, Caisse, HistoriqueLot, UserProfile
from .permissions import MFHBasePermission, IsAdminRole, IsAdminOrCommercial, get_role
from .serializers import (
    LotSerializer, DossierSerializer, ClientSerializer,
    NotaireSerializer, CommercialSerializer, CaisseSerializer, HistoriqueLotSerializer,
    UserWithProfileSerializer,
)

User = get_user_model()


def _lots_qs():
    """Queryset Lot avec situation_reelle calculée.

    Priorité : dossier actif (VENTE→VENDU, RESERVATION→RESERVE)
               puis option commerciale (commercial_option set → OPTION)
               sinon LIBRE.
    Un seul Subquery par lot (au lieu de 2 EXISTS).
    """
    active_sit = Subquery(
        Dossier.objects.filter(lot=OuterRef("pk"), actif=True)
        .values("situation_dossier")[:1],
        output_field=CharField(),
    )
    return Lot.objects.select_related("commercial_option").annotate(_active_sit=active_sit).annotate(
        situation_reelle=Case(
            When(_active_sit="VENTE",                then=Value("VENDU")),
            When(_active_sit="RESERVATION",          then=Value("RESERVE")),
            When(commercial_option__isnull=False,    then=Value("OPTION")),
            default=Value("LIBRE"),
            output_field=CharField(),
        )
    )


class LotViewSet(viewsets.ModelViewSet):
    serializer_class   = LotSerializer
    permission_classes = [MFHBasePermission]

    def get_queryset(self):
        qs = _lots_qs()
        situation = self.request.query_params.get("situation")
        if situation:
            qs = qs.filter(situation_reelle=situation)
        return qs


_ZERO = Value(0, output_field=DecimalField())


class DossierViewSet(viewsets.ModelViewSet):
    serializer_class   = DossierSerializer
    permission_classes = [MFHBasePermission]

    def get_queryset(self):
        qs = (
            Dossier.objects
            .select_related("lot", "client", "notaire", "commercial")
            .annotate(
                total_recu_ann=Coalesce(Sum("operation__montant_recu"), _ZERO),
                total_livre_ann=Coalesce(Sum("operation__montant_livre"), _ZERO),
            )
        )
        lot = self.request.query_params.get("lot")
        if lot:
            qs = qs.filter(lot=lot)
        return qs


def _dossier_row(d):
    """Construit un dict événement dossier (partagé par les 3 vues historique)."""
    return {
        "id":               d.id,
        "situation":        d.situation_dossier,
        "actif":            d.actif,
        "lot":              f"Îlot {d.lot.ilot} – Lot {d.lot.lot} (Tr.{d.lot.tranche})",
        "n_titre":          d.lot.n_titre or "",
        "lot_id":           d.lot.id,
        "client":           d.client.nom_prenom_client if d.client else "—",
        "commercial":       d.commercial.nom_prenom     if d.commercial else "—",
        "notaire":          d.notaire.nom_prenom_not    if d.notaire    else "—",
        "date_reservation": str(d.date_reservation)  if d.date_reservation  else None,
        "date_vente":       str(d.date_vente)         if d.date_vente        else None,
        "date_desistement": str(d.date_desistement)   if d.date_desistement  else None,
        "prix_vente":       str(d.prix_vente)         if d.prix_vente        else None,
    }


class LotHistoriqueView(APIView):
    """GET /api/lots/{pk}/historique-complet/ — timeline complète d'un lot."""
    permission_classes = [MFHBasePermission]

    def get(self, request, pk):
        lot = get_object_or_404(Lot, pk=pk)
        events = []

        # Événements option
        for h in HistoriqueLot.objects.filter(lot=pk).select_related("commercial"):
            events.append({
                "type":       h.action,
                "date":       str(h.date_action),
                "commercial": h.commercial.nom_prenom if h.commercial else None,
                "client":     None,
                "notaire":    None,
                "prix_vente": None,
                "dossier_id": None,
                "obs":        h.obs or "",
            })

        # Événements dossier (réservation / vente / désistement)
        for d in Dossier.objects.filter(lot=pk).select_related("client", "commercial", "notaire"):
            comm    = d.commercial.nom_prenom     if d.commercial else None
            client  = d.client.nom_prenom_client  if d.client     else None
            notaire = d.notaire.nom_prenom_not    if d.notaire    else None
            prix    = str(d.prix_vente)           if d.prix_vente else None
            base    = dict(commercial=comm, client=client, notaire=notaire,
                           prix_vente=prix, dossier_id=d.id)
            if d.date_reservation:
                events.append({"type": "RESERVATION",  "date": str(d.date_reservation),  **base})
            if d.date_vente:
                events.append({"type": "VENTE",         "date": str(d.date_vente),         **base})
            if d.date_desistement:
                events.append({"type": "DESISTEMENT",   "date": str(d.date_desistement),   **base})

        events.sort(key=lambda e: e["date"] or "")
        return Response({
            "lot":    LotSerializer(_lots_qs().get(pk=pk)).data,
            "events": events,
        })


class CommercialHistoriqueView(APIView):
    """GET /api/commerciaux/{pk}/historique/ — activité complète d'un commercial."""
    permission_classes = [MFHBasePermission]

    def get(self, request, pk):
        commercial = get_object_or_404(Commercial, pk=pk)

        options = []
        for h in HistoriqueLot.objects.filter(commercial=pk).select_related("lot"):
            l = h.lot
            options.append({
                "type":    h.action,
                "date":    str(h.date_action),
                "lot":     f"Îlot {l.ilot} – Lot {l.lot} (Tr.{l.tranche})",
                "n_titre": l.n_titre or "",
                "lot_id":  l.id,
            })

        dossiers = [
            _dossier_row(d)
            for d in Dossier.objects.filter(commercial=pk)
            .select_related("lot", "client", "notaire")
            .order_by("-date_reservation")
        ]

        return Response({
            "commercial": CommercialSerializer(commercial).data,
            "options":    sorted(options, key=lambda x: x["date"], reverse=True),
            "dossiers":   dossiers,
        })


class NotaireHistoriqueView(APIView):
    """GET /api/notaires/{pk}/historique/ — dossiers pris en charge par un notaire."""
    permission_classes = [MFHBasePermission]

    def get(self, request, pk):
        notaire = get_object_or_404(Notaire, pk=pk)

        dossiers = [
            _dossier_row(d)
            for d in Dossier.objects.filter(notaire=pk)
            .select_related("lot", "client", "commercial")
            .order_by("-date_reservation")
        ]

        return Response({
            "notaire":  NotaireSerializer(notaire).data,
            "dossiers": dossiers,
        })


class BootstrapView(APIView):
    """Single endpoint returning all reference data needed by the Dossier page."""
    permission_classes = [MFHBasePermission]

    def get(self, request):
        lots_qs  = list(_lots_qs())
        all_data = LotSerializer(lots_qs, many=True).data
        return Response({
            "lots":        all_data,
            "lots_libres": [l for l in all_data if l["situation"] == "LIBRE"],
            "clients":     ClientSerializer(Client.objects.all(), many=True).data,
            "notaires":    NotaireSerializer(Notaire.objects.all(), many=True).data,
            "commerciaux": CommercialSerializer(Commercial.objects.all(), many=True).data,
        })


class SyntheseView(APIView):
    """Dashboard agrégé — un seul appel pour la page Synthèse.

    Prix corrects :
      - VENDU / RESERVE  → prix_vente  (table Dossier)
      - LIBRE / OPTION   → prix_reference (table Lot)
    """
    permission_classes = [MFHBasePermission]

    def get(self, request):
        lots_qs = list(_lots_qs())

        # ── Dossiers actifs (VENTE + RESERVATION) avec encaissements cumulés ──
        active_doss_qs = list(
            Dossier.objects
            .filter(actif=True, situation_dossier__in=["VENTE", "RESERVATION"])
            .select_related("lot")
            .annotate(total_enc=Coalesce(Sum("operation__montant_recu"), _ZERO))
        )
        active_doss = {d.lot_id: d for d in active_doss_qs}

        # ── Classification des lots ──
        vendu_lots   = [l for l in lots_qs if l.situation_reelle == "VENDU"]
        reserve_lots = [l for l in lots_qs if l.situation_reelle == "RESERVE"]
        option_lots  = [l for l in lots_qs if l.situation_reelle == "OPTION"]
        libre_lots   = [l for l in lots_qs if l.situation_reelle == "LIBRE"]

        def _prix(lot):
            """Prix réel si dossier actif, sinon prix de référence."""
            d = active_doss.get(lot.id)
            return float(d.prix_vente or 0) if d else float(lot.prix_reference or 0)

        value_sold     = sum(_prix(l) for l in vendu_lots)
        value_reserved = sum(_prix(l) for l in reserve_lots)
        value_non_vendu = sum(float(l.prix_reference or 0) for l in libre_lots + option_lots)
        total_value    = value_sold + value_reserved + value_non_vendu

        # ── KPIs financiers ──
        ops = Caisse.objects.aggregate(
            total_recu=Coalesce(Sum("montant_recu"),   _ZERO),
            total_livre=Coalesce(Sum("montant_livre"), _ZERO),
        )
        total_recu  = float(ops["total_recu"])

        # Ventes par mois — prix_vente réel du dossier
        ventes_par_mois = (
            Dossier.objects
            .filter(actif=True, situation_dossier="VENTE", date_vente__isnull=False)
            .annotate(mois=TruncMonth("date_vente"))
            .values("mois")
            .annotate(montant=Coalesce(Sum("prix_vente"), _ZERO))
            .order_by("mois")
        )
        # Encaissements par mois
        encaiss_par_mois = (
            Caisse.objects
            .filter(date_caisse__isnull=False)
            .annotate(mois=TruncMonth("date_caisse"))
            .values("mois")
            .annotate(montant=Coalesce(Sum("montant_recu"), _ZERO))
            .order_by("mois")
        )

        def fmt_month(qs):
            return [
                {"mois": row["mois"].strftime("%Y-%m"), "montant": float(row["montant"])}
                for row in qs if row["mois"]
            ]

        # ── Par catégorie (avec prix corrects) ──
        par_cat = {}
        for lot in lots_qs:
            cat  = (lot.categorie or "").strip() or "Non classé"
            sit  = lot.situation_reelle
            surf = int(lot.surface or 0)
            if cat not in par_cat:
                par_cat[cat] = {
                    "categorie": cat,
                    "total": 0.0, "vendu": 0.0, "disponible": 0.0, "reserve": 0.0,
                    "surface_total": 0, "surface_vendu": 0,
                    "surface_reserve": 0, "surface_disponible": 0,
                    "_pm2_sum": 0.0, "_pm2_n": 0,
                }
            if sit == "VENDU":
                prix = _prix(lot)
                par_cat[cat]["vendu"]          += prix
                par_cat[cat]["surface_vendu"]  += surf
            elif sit == "RESERVE":
                prix = _prix(lot)
                par_cat[cat]["reserve"]          += prix
                par_cat[cat]["surface_reserve"]  += surf
            else:
                prix = float(lot.prix_reference or 0)
                par_cat[cat]["disponible"]          += prix
                par_cat[cat]["surface_disponible"]  += surf
            par_cat[cat]["total"]         += prix
            par_cat[cat]["surface_total"] += surf
            if surf > 0:
                par_cat[cat]["_pm2_sum"] += prix / surf
                par_cat[cat]["_pm2_n"]   += 1

        for c in par_cat.values():
            n = c.pop("_pm2_n", 0)
            s = c.pop("_pm2_sum", 0.0)
            c["prix_m2_moyen"] = round(s / n) if n else 0

        par_categorie = sorted(par_cat.values(), key=lambda x: x["total"], reverse=True)

        # ── Tableau détaillé : année × catégorie ──
        tableau_map = {}
        for d in active_doss_qs:
            cat = (d.lot.categorie or "").strip() or "Non classé"
            if d.situation_dossier == "VENTE" and d.date_vente:
                annee = str(d.date_vente.year)
            elif d.situation_dossier == "RESERVATION" and d.date_reservation:
                annee = str(d.date_reservation.year)
            else:
                continue
            key = (annee, cat)
            if key not in tableau_map:
                tableau_map[key] = {
                    "annee": annee, "categorie": cat,
                    "total_ventes": 0.0, "nb_ventes": 0,
                    "total_reserves": 0.0, "nb_reserves": 0,
                    "total_encaisse": 0.0,
                    "surface_vendu": 0, "surface_reserve": 0,
                }
            prix = float(d.prix_vente or 0)
            enc  = float(d.total_enc or 0)
            surf = int(d.lot.surface or 0)
            if d.situation_dossier == "VENTE":
                tableau_map[key]["total_ventes"]   += prix
                tableau_map[key]["nb_ventes"]       += 1
                tableau_map[key]["surface_vendu"]   += surf
            else:
                tableau_map[key]["total_reserves"]  += prix
                tableau_map[key]["nb_reserves"]      += 1
                tableau_map[key]["surface_reserve"]  += surf
            tableau_map[key]["total_encaisse"] += enc

        # Stock non vendu courant par catégorie (prix_reference)
        non_vendu_cat = {}
        for lot in libre_lots + option_lots:
            cat = (lot.categorie or "").strip() or "Non classé"
            non_vendu_cat[cat] = non_vendu_cat.get(cat, 0.0) + float(lot.prix_reference or 0)

        tableau_list = []
        for row in sorted(tableau_map.values(), key=lambda x: (x["annee"], x["categorie"])):
            total_pv   = row["total_ventes"] + row["total_reserves"]
            total_surf = row["surface_vendu"] + row["surface_reserve"]
            row["surface"]          = total_surf
            row["prix_m2"]          = round(total_pv / total_surf) if total_surf > 0 else 0
            row["reste_a_recevoir"] = round(total_pv - row["total_encaisse"])
            row["valeur_non_vendu"] = round(non_vendu_cat.get(row["categorie"], 0.0))
            row["total_ventes"]     = round(row["total_ventes"])
            row["total_reserves"]   = round(row["total_reserves"])
            row["total_encaisse"]   = round(row["total_encaisse"])
            tableau_list.append(row)

        disponible = len(libre_lots) + len(option_lots)

        return Response({
            "kpi": {
                "total_lots":      len(lots_qs),
                "total_value":     round(total_value),
                "value_sold":      round(value_sold),
                "value_reserved":  round(value_reserved),
                "value_non_vendu": round(value_non_vendu),
                "total_recu":      round(total_recu),
                "restant":         round(value_sold + value_reserved - total_recu),
            },
            "lots_status": {
                "DISPONIBLE": disponible,
                "RESERVE":    len(reserve_lots),
                "VENDU":      len(vendu_lots),
            },
            "evolution": {
                "ventes":        fmt_month(ventes_par_mois),
                "encaissements": fmt_month(encaiss_par_mois),
            },
            "par_categorie": par_categorie,
            "tableau":        tableau_list,
        })


class LotOptionView(APIView):
    """
    POST   /api/lots/{pk}/option/  — activer une option (lot doit être LIBRE)
    DELETE /api/lots/{pk}/option/  — annuler une option  (lot doit être OPTION)

    ADMIN     : spécifie le commercial via { "commercial": id }
    COMMERCIAL: le commercial est déduit automatiquement depuis request.user.commercial_entity
    """
    permission_classes = [IsAdminOrCommercial]

    def _resolve_commercial(self, request):
        """Retourne l'entité Commercial selon le rôle de l'utilisateur."""
        role = get_role(request.user)
        if role == "COMMERCIAL":
            commercial_entity = getattr(request.user, "commercial_entity", None)
            if commercial_entity is None:
                return None, Response(
                    {"error": "Votre compte n'est pas lié à une fiche commerciale. Contactez l'administrateur."},
                    status=status.HTTP_403_FORBIDDEN,
                )
            return commercial_entity, None
        # ADMIN : récupère depuis les données de la requête
        commercial_id = request.data.get("commercial")
        if not commercial_id:
            return None, Response({"error": "Le champ 'commercial' est requis."}, status=status.HTTP_400_BAD_REQUEST)
        return get_object_or_404(Commercial, pk=commercial_id), None

    def post(self, request, pk):
        lot_qs = _lots_qs().get(pk=pk)
        if lot_qs.situation_reelle != "LIBRE":
            return Response({"error": "Ce lot n'est pas disponible (non LIBRE)."}, status=status.HTTP_400_BAD_REQUEST)

        commercial, err = self._resolve_commercial(request)
        if err:
            return err

        lot = lot_qs  # même objet (déjà chargé)
        lot.situation = "OPTION"
        lot.commercial_option = commercial
        lot.date_option = date.today()
        lot.save(update_fields=["situation", "commercial_option", "date_option"])

        obs = request.data.get("obs", "") or ""
        HistoriqueLot.objects.create(lot=lot, commercial=commercial, action="OPTION_ACTIVE", obs=obs)
        return Response(LotSerializer(_lots_qs().get(pk=pk)).data)

    def delete(self, request, pk):
        lot = get_object_or_404(Lot, pk=pk)
        lot_qs = _lots_qs().get(pk=pk)
        if lot_qs.situation_reelle != "OPTION":
            return Response({"error": "Ce lot n'est pas en OPTION."}, status=status.HTTP_400_BAD_REQUEST)

        role = get_role(request.user)
        if role == "COMMERCIAL":
            # Un commercial ne peut annuler que sa propre option
            commercial_entity = getattr(request.user, "commercial_entity", None)
            if commercial_entity is None or lot.commercial_option_id != commercial_entity.id:
                return Response(
                    {"error": "Vous ne pouvez annuler que vos propres options."},
                    status=status.HTTP_403_FORBIDDEN,
                )

        commercial = lot.commercial_option
        lot.situation = "LIBRE"
        lot.commercial_option = None
        lot.date_option = None
        lot.save(update_fields=["situation", "commercial_option", "date_option"])

        HistoriqueLot.objects.create(lot=lot, commercial=commercial, action="OPTION_ANNULEE")
        return Response({"status": "ok"})


class HistoriqueLotViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class   = HistoriqueLotSerializer
    permission_classes = [MFHBasePermission]

    def get_queryset(self):
        qs = HistoriqueLot.objects.select_related("lot", "commercial")
        lot = self.request.query_params.get("lot")
        if lot:
            qs = qs.filter(lot=lot)
        return qs


class ClientViewSet(viewsets.ModelViewSet):
    queryset           = Client.objects.all()
    serializer_class   = ClientSerializer
    permission_classes = [MFHBasePermission]


class CaisseViewSet(viewsets.ModelViewSet):
    serializer_class   = CaisseSerializer
    permission_classes = [MFHBasePermission]

    def get_queryset(self):
        qs = Caisse.objects.all()
        dossier = self.request.query_params.get("dossier")
        if dossier:
            qs = qs.filter(dossier=dossier)
        return qs


class NotaireViewSet(viewsets.ModelViewSet):
    queryset           = Notaire.objects.all()
    serializer_class   = NotaireSerializer
    permission_classes = [MFHBasePermission]


class CommercialViewSet(viewsets.ModelViewSet):
    queryset           = Commercial.objects.all()
    serializer_class   = CommercialSerializer
    permission_classes = [MFHBasePermission]


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response({"detail": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)
        # Auto-créer le profil si absent (les superusers deviennent ADMIN)
        profile, created = UserProfile.objects.get_or_create(user=user)
        if created and user.is_superuser:
            profile.role = "ADMIN"
            profile.save()
        token, _ = Token.objects.get_or_create(user=user)
        comm = getattr(user, "commercial_entity", None)
        return Response({
            "token":         token.key,
            "username":      user.username,
            "fullname":      user.get_full_name() or user.username,
            "role":          profile.role,
            "commercial_id": comm.id if comm else None,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.auth_token.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user
        profile = getattr(u, "profile", None)
        role = profile.role if profile else (get_role(u) or "VIEWER")
        comm = getattr(u, "commercial_entity", None)
        return Response({
            "username":      u.username,
            "fullname":      u.get_full_name() or u.username,
            "role":          role,
            "commercial_id": comm.id if comm else None,
        })


# ── Gestion des utilisateurs (Admin only) ─────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """CRUD utilisateurs + profils — réservé aux ADMIN."""
    permission_classes = [IsAdminRole]
    serializer_class   = UserWithProfileSerializer

    def get_queryset(self):
        return User.objects.select_related("profile", "commercial_entity").order_by("username")
