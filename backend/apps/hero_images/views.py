from django.conf import settings
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
from apps.common.mixins import ActivityLogMixin, NoStoreResponseMixin
from apps.common.validators import delete_stored_file
from apps.hero_images.models import HeroImage
from apps.hero_images.serializers import HeroImageSerializer, PublicHeroImageSerializer


class PublicHeroImagesView(NoStoreResponseMixin, ListAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    serializer_class = PublicHeroImageSerializer
    pagination_class = None

    def get_queryset(self):
        return HeroImage.objects.filter(is_active=True).order_by("order", "id")


class AdminHeroImageViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Hero image"
    serializer_class = HeroImageSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = HeroImage.objects.all().order_by("order", "id")
    pagination_class = None

    def perform_create(self, serializer):
        with transaction.atomic():
            if HeroImage.objects.count() >= settings.HERO_MAX_IMAGES:
                raise serializers.ValidationError(
                    {"image": f"The slideshow holds up to {settings.HERO_MAX_IMAGES} images. Delete one first."})
            next_order = (HeroImage.objects.aggregate(m=Max("order"))["m"] or 0) + 1
            obj = serializer.save(order=next_order)
        self._log("created", obj)

    def perform_update(self, serializer):
        previous = serializer.instance.image.name
        obj = serializer.save()
        if obj.image.name != previous:
            delete_stored_file(previous)   # replaced image: remove the old file
        self._log("updated", obj)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return Response({"detail": "Send the image IDs in the order they should appear."},
                            status=status.HTTP_400_BAD_REQUEST)
        existing = set(HeroImage.objects.values_list("id", flat=True))
        try:
            requested = [int(i) for i in ids]
        except (TypeError, ValueError):
            return Response({"detail": "IDs must be numbers."}, status=400)
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every slideshow image exactly once."}, status=400)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                HeroImage.objects.filter(pk=pk).update(order=position)
        from apps.dashboard.services import log_activity
        log_activity(request.user, "updated", "Hero image", "Slideshow order changed")
        return Response(HeroImageSerializer(HeroImage.objects.order_by("order", "id"), many=True).data)
