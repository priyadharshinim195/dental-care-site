from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
else:
    # Production: Django serves uploaded files itself (fine for a small clinic site).
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]