from rest_framework.permissions import BasePermission, SAFE_METHODS


def get_role(user):
    """Retourne le rôle applicatif de l'utilisateur : ADMIN, DIRECTEUR, VIEWER ou COMMERCIAL."""
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, "profile", None)
    if profile:
        return profile.role
    # Fallback : les superusers sans profil sont ADMIN
    if user.is_superuser:
        return "ADMIN"
    return "VIEWER"


class MFHBasePermission(BasePermission):
    """
    ADMIN     → accès complet (toutes les méthodes).
    DIRECTEUR → lecture seule (GET, HEAD, OPTIONS) sur tous les endpoints.
    VIEWER    → lecture seule.
    COMMERCIAL → lecture seule sur les endpoints standards.
    Non authentifié → refusé.
    """
    message = "Accès refusé. Droits insuffisants."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_role(request.user)
        if role == "ADMIN":
            return True
        return request.method in SAFE_METHODS


class IsAdminRole(BasePermission):
    """ADMIN : accès complet. DIRECTEUR : lecture seule."""
    message = "Réservé aux administrateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role = get_role(request.user)
        if role == "ADMIN":
            return True
        # DIRECTEUR peut consulter les utilisateurs mais pas les modifier
        if role == "DIRECTEUR" and request.method in SAFE_METHODS:
            return True
        return False


class IsAdminOrCommercial(BasePermission):
    """
    Utilisé sur LotOptionView.
    ADMIN : accès complet.
    COMMERCIAL : accès autorisé (la vue gère les vérifications de propriété).
    """
    message = "Réservé aux administrateurs et commerciaux."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return get_role(request.user) in ("ADMIN", "COMMERCIAL")
