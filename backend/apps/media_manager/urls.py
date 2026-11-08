from rest_framework.routers import SimpleRouter

from apps.media_manager.views import AdminMediaViewSet

router = SimpleRouter()
router.register("media", AdminMediaViewSet, basename="admin-media")
urlpatterns = router.urls
