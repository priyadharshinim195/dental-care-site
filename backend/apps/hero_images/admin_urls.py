from rest_framework.routers import SimpleRouter

from apps.hero_images.views import AdminHeroImageViewSet

router = SimpleRouter()
router.register("hero-images", AdminHeroImageViewSet, basename="admin-hero-images")
urlpatterns = router.urls
