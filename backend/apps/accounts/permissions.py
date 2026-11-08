from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.accounts.roles import get_role


class HasStaffRole(BasePermission):
    """Any dashboard role (admin, editor or viewer) may use the endpoint for reads."""

    def has_permission(self, request, view):
        return get_role(request.user) is not None


class HasAdminRole(BasePermission):
    """Viewers are read-only; admins and editors may also change content."""
    message = "Your account is read-only and cannot change this content."

    def has_permission(self, request, view):
        role = get_role(request.user)
        if role is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return role in ("admin", "editor")


class HasClinicAdminRole(BasePermission):
    """Only clinic administrators may perform admin-only operations."""
    message = "Only administrators can perform this action."

    def has_permission(self, request, view):
        return get_role(request.user) == "admin"
