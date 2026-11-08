from django.urls import path

from apps.case_studies.views import PublicCaseStudiesView

urlpatterns = [path("case-studies/", PublicCaseStudiesView.as_view(), name="public-case-studies")]
