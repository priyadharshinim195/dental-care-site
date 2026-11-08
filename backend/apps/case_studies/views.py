from django.db import transaction
from django.db.models import Max
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.permissions import HasAdminRole
from apps.case_studies.models import CaseStudy, CaseStudyImage
from apps.case_studies.serializers import (
    CaseStudyAdminSerializer, CaseStudyImageSerializer, PublicCaseStudySerializer,
)
from apps.common.mixins import ActivityLogMixin, NoStoreResponseMixin
from apps.common.validators import delete_stored_file
from apps.dashboard.services import log_activity


class PublicCaseStudiesView(NoStoreResponseMixin, ListAPIView):
    """Only published cases are visible on the public site."""
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    serializer_class = PublicCaseStudySerializer
    pagination_class = None

    def get_queryset(self):
        return (CaseStudy.objects.filter(status=CaseStudy.Status.PUBLISHED)
                .filter(images__kind=CaseStudyImage.Kind.BEFORE)
                .filter(images__kind=CaseStudyImage.Kind.AFTER)
                .distinct().prefetch_related("images").order_by("order", "id"))


class AdminCaseStudyViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Case study"
    serializer_class = CaseStudyAdminSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [JSONParser, FormParser, MultiPartParser]
    pagination_class = None

    def get_queryset(self):
        return CaseStudy.objects.prefetch_related("images").order_by("order", "id")

    def perform_create(self, serializer):
        with transaction.atomic():
            top = CaseStudy.objects.order_by("-order").values_list("order", flat=True).first() or 0
            obj = serializer.save(order=top + 1)
        self._log("created", obj)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        case = self.get_object()
        blockers = case.publish_blockers()
        if blockers:
            return Response({"detail": "This case cannot be published yet.", "blockers": blockers},
                            status=status.HTTP_400_BAD_REQUEST)
        case.status = CaseStudy.Status.PUBLISHED
        case.save(update_fields=["status", "updated_at"])
        log_activity(request.user, "published", "Case study", case.title)
        return Response(CaseStudyAdminSerializer(case).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        case = self.get_object()
        case.status = CaseStudy.Status.DRAFT
        case.save(update_fields=["status", "updated_at"])
        log_activity(request.user, "unpublished", "Case study", case.title)
        return Response(CaseStudyAdminSerializer(case).data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        existing = set(CaseStudy.objects.values_list("id", flat=True))
        try:
            requested = [int(i) for i in (ids or [])]
        except (TypeError, ValueError):
            return Response({"detail": "IDs must be numbers."}, status=400)
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every case study exactly once."}, status=400)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                CaseStudy.objects.filter(pk=pk).update(order=position)
        log_activity(request.user, "updated", "Case study", "Card order changed")
        return Response(CaseStudyAdminSerializer(CaseStudy.objects.prefetch_related("images").order_by("order", "id"), many=True).data)


class AdminCaseImageViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Case study image"
    serializer_class = CaseStudyImageSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = CaseStudyImage.objects.select_related("case").order_by("case_id", "order", "id")
    pagination_class = None
    filterset_fields = ["case"]

    def get_queryset(self):
        qs = super().get_queryset()
        case_id = self.request.query_params.get("case")
        return qs.filter(case_id=case_id) if case_id else qs

    def perform_create(self, serializer):
        case = serializer.validated_data["case"]
        kind = serializer.validated_data["kind"]
        order = (CaseStudyImage.objects.filter(case=case, kind=kind)
                 .aggregate(max_order=Max("order"))["max_order"] or 0) + 1
        image = serializer.save(order=order)
        self._log("created", image)

    def perform_update(self, serializer):
        previous = serializer.instance.image.name
        obj = serializer.save()
        if obj.image.name != previous:
            delete_stored_file(previous)
        self._log("updated", obj)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        case_id = request.data.get("case")
        kind = request.data.get("kind")
        ids = request.data.get("ids")
        if kind not in (CaseStudyImage.Kind.XRAY, CaseStudyImage.Kind.SURGERY):
            return Response({"detail": "Only X-ray and during-surgery image groups can be reordered."}, status=400)
        if not isinstance(ids, list):
            return Response({"detail": "Send the image IDs in the order they should appear."}, status=400)
        try:
            case_id = int(case_id)
            requested = [int(value) for value in ids]
        except (TypeError, ValueError):
            return Response({"detail": "Case and image IDs must be numbers."}, status=400)
        queryset = CaseStudyImage.objects.filter(case_id=case_id, kind=kind)
        existing = set(queryset.values_list("id", flat=True))
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every image in this group exactly once."}, status=400)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                queryset.filter(pk=pk).update(order=position)
        log_activity(request.user, "updated", "Case study image", f"{kind} image order changed")
        return Response(CaseStudyImageSerializer(queryset.order_by("order", "id"), many=True).data)

    def perform_destroy(self, instance):
        case = instance.case
        if case.status == CaseStudy.Status.PUBLISHED and instance.kind in CaseStudyImage.SINGLE_PER_CASE:
            remaining = case.images.exclude(pk=instance.pk)
            kinds = set(remaining.values_list("kind", flat=True))
            if not {"before", "after"} <= kinds:
                raise serializers.ValidationError(
                    {"detail": "Unpublish this case before removing either comparison image."})
        super().perform_destroy(instance)
