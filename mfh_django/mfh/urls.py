from rest_framework.routers import DefaultRouter
from .views import LotViewSet, DossierViewSet, ClientViewSet, CaisseViewSet, NotaireViewSet, CommercialViewSet

router = DefaultRouter()

router.register("lots",        LotViewSet, basename="lot")
router.register("dossiers",    DossierViewSet, basename="dossier")
router.register("clients",     ClientViewSet)
router.register("caisse",      CaisseViewSet, basename="caisse")
router.register("notaires",    NotaireViewSet)
router.register("commerciaux", CommercialViewSet)

urlpatterns = router.urls
