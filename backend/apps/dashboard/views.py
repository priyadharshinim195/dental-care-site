from django.conf import settings
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasClinicAdminRole, HasStaffRole
from apps.dashboard.models import ActivityLog
from apps.dashboard.serializers import ActivityLogSerializer


class OverviewView(APIView):
    permission_classes = [HasStaffRole]

    def get(self, request):
        from apps.case_studies.models import CaseStudy, CaseStudyImage
        from apps.hero_images.models import HeroImage
        from apps.media_manager.models import MediaAsset
        from apps.website_settings.models import SiteContent, SiteSettings

        site = SiteSettings.load()
        contact_fields = {"address": site.address, "phone": site.phone, "email": site.email,
                          "hours": site.hours}
        missing = [name for name, value in contact_fields.items() if not value]
        recent = ActivityLog.objects.all()[:8]
        return Response({
            "case_studies": {
                "total": CaseStudy.objects.count(),
                "published": (CaseStudy.objects.filter(status=CaseStudy.Status.PUBLISHED)
                              .filter(images__kind=CaseStudyImage.Kind.BEFORE)
                              .filter(images__kind=CaseStudyImage.Kind.AFTER)
                              .distinct().count()),
                "draft": CaseStudy.objects.filter(status=CaseStudy.Status.DRAFT).count(),
            },
            "hero_images": {
                "total": HeroImage.objects.count(),
                "active": HeroImage.objects.filter(is_active=True).count(),
                "max": settings.HERO_MAX_IMAGES,
            },
            "media": {
                "total": MediaAsset.objects.count(),
                "images": MediaAsset.objects.filter(kind=MediaAsset.Kind.IMAGE).count(),
                "videos": MediaAsset.objects.filter(kind=MediaAsset.Kind.VIDEO).count(),
            },
            "content_items": SiteContent.objects.count(),
            "contact_fields_missing": missing,
            "recent_activity": ActivityLogSerializer(recent, many=True).data,
        })


class ActivityPagination(PageNumberPagination):
    page_size = 25


class ActivityListView(APIView):
    permission_classes = [HasStaffRole]

    def get(self, request):
        paginator = ActivityPagination()
        page = paginator.paginate_queryset(ActivityLog.objects.all(), request, view=self)
        return paginator.get_paginated_response(ActivityLogSerializer(page, many=True).data)


class ClearActivityView(APIView):
    permission_classes = [HasClinicAdminRole]

    def delete(self, request):
        ActivityLog.objects.all().delete()
        return Response(status=204)
