from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    LotViewSet, DossierViewSet, ClientViewSet, CaisseViewSet,
    NotaireViewSet, CommercialViewSet, BootstrapView,
    LotOptionView, HistoriqueLotViewSet,
    LotHistoriqueView, CommercialHistoriqueView, NotaireHistoriqueView,
    LoginView, LogoutView, MeView, UserViewSet, SyntheseView,
)

router = DefaultRouter()

router.register("lots",        LotViewSet,           basename="lot")
router.register("dossiers",    DossierViewSet,        basename="dossier")
router.register("clients",     ClientViewSet)
router.register("caisse",      CaisseViewSet,         basename="caisse")
router.register("notaires",    NotaireViewSet)
router.register("commerciaux", CommercialViewSet)
router.register("historique",  HistoriqueLotViewSet,  basename="historique")
router.register("users",       UserViewSet,           basename="user")

urlpatterns = router.urls + [
    path("synthese/",   SyntheseView.as_view(), name="synthese"),
    path("bootstrap/",                          BootstrapView.as_view(),            name="bootstrap"),
    path("lots/<int:pk>/option/",               LotOptionView.as_view(),            name="lot-option"),
    path("lots/<int:pk>/historique-complet/",   LotHistoriqueView.as_view(),        name="lot-historique"),
    path("commerciaux/<int:pk>/historique/",    CommercialHistoriqueView.as_view(), name="comm-historique"),
    path("notaires/<int:pk>/historique/",       NotaireHistoriqueView.as_view(),    name="not-historique"),
    # Auth
    path("auth/login/",                         LoginView.as_view(),                name="auth-login"),
    path("auth/logout/",                        LogoutView.as_view(),               name="auth-logout"),
    path("auth/me/",                            MeView.as_view(),                   name="auth-me"),
]
