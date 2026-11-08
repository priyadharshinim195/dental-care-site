from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.website_settings import views

router = SimpleRouter()
router.register("services", views.AdminServiceViewSet, basename="admin-services")
router.register("gallery-images", views.AdminGalleryImageViewSet, basename="admin-gallery-images")
router.register("testimonials", views.AdminTestimonialViewSet, basename="admin-testimonials")

urlpatterns = [
    path("site-settings/", views.AdminSiteSettingsView.as_view(), name="admin-site-settings"),
    path("site-content/", views.AdminSiteContentListView.as_view(), name="admin-site-content"),
    path("site-content/<str:key>/", views.AdminSiteContentDetailView.as_view(), name="admin-site-content-detail"),
    path("branding/", views.AdminBrandingView.as_view(), name="admin-branding"),
    path("branding/logo/", views.AdminLogoView.as_view(), name="admin-logo"),
    path("about-image/", views.AdminAboutImageView.as_view(), name="admin-about-image"),
] + router.urls
