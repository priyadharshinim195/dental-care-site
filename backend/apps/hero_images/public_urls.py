from django.urls import path

from apps.hero_images.views import PublicHeroImagesView

urlpatterns = [path("hero-images/", PublicHeroImagesView.as_view(), name="public-hero-images")]
