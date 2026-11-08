"""Role model:
- admin:  Django superuser (full control, including accounts via /django-admin/)
- editor: member of the 'Editors' group (create, edit, publish, delete content)
- viewer: member of the 'Viewers' group (read-only dashboard access)
Users with no role cannot use the admin API.
"""

EDITORS_GROUP = "Editors"
VIEWERS_GROUP = "Viewers"


def get_role(user):
    if user is None or not user.is_authenticated or not user.is_active:
        return None
    if user.is_superuser:
        return "admin"
    names = set(user.groups.values_list("name", flat=True))
    if EDITORS_GROUP in names:
        return "editor"
    if VIEWERS_GROUP in names:
        return "viewer"
    return None
