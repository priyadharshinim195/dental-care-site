from django.urls import path

from apps.website_settings.views import (
    PublicGalleryImagesView, PublicServicesView, PublicSiteView, PublicTestimonialsView,
)

urlpatterns = [
    path("site/", PublicSiteView.as_view(), name="public-site"),
    path("gallery/", PublicGalleryImagesView.as_view(), name="public-gallery"),
    path("testimonials/", PublicTestimonialsView.as_view(), name="public-testimonials"),
    path("services/", PublicServicesView.as_view(), name="public-services"),
]
