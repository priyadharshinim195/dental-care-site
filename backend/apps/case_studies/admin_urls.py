from rest_framework.routers import SimpleRouter

from apps.case_studies.views import AdminCaseImageViewSet, AdminCaseStudyViewSet

router = SimpleRouter()
router.register("case-studies", AdminCaseStudyViewSet, basename="admin-case-studies")
router.register("case-study-images", AdminCaseImageViewSet, basename="admin-case-images")
urlpatterns = router.urls
