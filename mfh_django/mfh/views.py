from rest_framework import viewsets
from django.db.models import Case, When, Value, CharField, Exists, OuterRef
from .models import Lot, Dossier, Client, Notaire, Commercial, Caisse
from .serializers import (
    LotSerializer, DossierSerializer, ClientSerializer,
    NotaireSerializer, CommercialSerializer, CaisseSerializer,
)


def _lots_qs():
    """Queryset Lot avec situation_reelle calculée depuis les dossiers actifs."""
    active = Dossier.objects.filter(lot=OuterRef("pk"), actif=True)
    return Lot.objects.annotate(
        situation_reelle=Case(
            When(Exists(active.filter(situation_dossier="VENTE")),       then=Value("VENDU")),
            When(Exists(active.filter(situation_dossier="RESERVATION")), then=Value("RESERVE")),
            default=Value("LIBRE"),
            output_field=CharField(),
        )
    )


class LotViewSet(viewsets.ModelViewSet):
    serializer_class = LotSerializer

    def get_queryset(self):
        qs = _lots_qs()
        situation = self.request.query_params.get("situation")
        if situation:
            qs = qs.filter(situation_reelle=situation)
        return qs


class DossierViewSet(viewsets.ModelViewSet):
    serializer_class = DossierSerializer

    def get_queryset(self):
        qs = Dossier.objects.select_related("lot", "client", "notaire", "commercial")
        lot = self.request.query_params.get("lot")
        if lot:
            qs = qs.filter(lot=lot)
        return qs


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer


class CaisseViewSet(viewsets.ModelViewSet):
    serializer_class = CaisseSerializer

    def get_queryset(self):
        qs = Caisse.objects.all()
        dossier = self.request.query_params.get("dossier")
        if dossier:
            qs = qs.filter(dossier=dossier)
        return qs


class NotaireViewSet(viewsets.ModelViewSet):
    queryset = Notaire.objects.all()
    serializer_class = NotaireSerializer


class CommercialViewSet(viewsets.ModelViewSet):
    queryset = Commercial.objects.all()
    serializer_class = CommercialSerializer
