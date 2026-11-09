from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.static import serve


def react_page(filename):
    def view(request, *args, **kwargs):
        file_path = settings.FRONTEND_DIST / filename
        if not file_path.exists():
            raise Http404("Frontend build not found.")
        return FileResponse(open(file_path, "rb"), content_type="text/html")
    return view


urlpatterns = [
    path("django-admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/public/", include("apps.website_settings.public_urls")),
    path("api/public/", include("apps.hero_images.public_urls")),
    path("api/public/", include("apps.case_studies.public_urls")),
    path("api/admin/", include("apps.dashboard.urls")),
    path("api/admin/", include("apps.website_settings.admin_urls")),
    path("api/admin/", include("apps.hero_images.admin_urls")),
    path("api/admin/", include("apps.case_studies.admin_urls")),
    path("api/admin/", include("apps.media_manager.urls")),
    # React pages: public site at "/", dashboard at "/admin..."
    path("", react_page("index.html")),
    re_path(r"^admin(/.*)?$", react_page("admin.html")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Production: Django serves uploaded files from /media/
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]