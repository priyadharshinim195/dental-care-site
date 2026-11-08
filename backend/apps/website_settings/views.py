from django.conf import settings
from django.db import transaction
from django.db.models import Max
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveUpdateAPIView

from apps.accounts.permissions import HasAdminRole, HasStaffRole
from apps.common.mixins import ActivityLogMixin, NoStoreResponseMixin
from apps.common.validators import delete_stored_file
from apps.dashboard.services import log_activity
from apps.website_settings.models import GalleryImage, Service, SiteContent, SiteSettings, Testimonial
from apps.website_settings.serializers import (
    AboutImageUploadSerializer, GalleryImageSerializer, LogoUploadSerializer,
    PublicGalleryImageSerializer, PublicServiceSerializer, PublicTestimonialSerializer,
    ServiceSerializer, SiteContentSerializer, SiteSettingsSerializer, TestimonialSerializer,
)


def _public_site_payload(request):
    site = SiteSettings.load()
    data = SiteSettingsSerializer(site, context={"request": request}).data
    content = {item.key: item.effective for item in SiteContent.objects.all()}
    return {
        "settings": {k: v for k, v in data.items() if k != "updated_at"},
        "content": content,
    }


class PublicSiteView(NoStoreResponseMixin, APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"

    def get(self, request):
        return Response(_public_site_payload(request))


class PublicGalleryImagesView(NoStoreResponseMixin, ListAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    serializer_class = PublicGalleryImageSerializer
    pagination_class = None

    def get_queryset(self):
        return GalleryImage.objects.filter(is_active=True).order_by("order", "id")


class PublicTestimonialsView(NoStoreResponseMixin, ListAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    serializer_class = PublicTestimonialSerializer
    pagination_class = None

    def get_queryset(self):
        return Testimonial.objects.filter(is_published=True).order_by("order", "id")


class PublicServicesView(NoStoreResponseMixin, ListAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public"
    serializer_class = PublicServiceSerializer
    pagination_class = None

    def get_queryset(self):
        return Service.objects.filter(is_active=True).order_by("order", "id")


class AdminSiteSettingsView(RetrieveUpdateAPIView):
    serializer_class = SiteSettingsSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [JSONParser]

    def get_object(self):
        return SiteSettings.load()

    def perform_update(self, serializer):
        obj = serializer.save()
        log_activity(self.request.user, "updated", "Site settings", "Contact, SEO and display settings")
        return obj


class AdminSiteContentListView(ListAPIView):
    serializer_class = SiteContentSerializer
    permission_classes = [HasStaffRole]
    queryset = SiteContent.objects.all()


class AdminSiteContentDetailView(RetrieveUpdateAPIView):
    serializer_class = SiteContentSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [JSONParser]
    queryset = SiteContent.objects.all()
    lookup_field = "key"

    def perform_update(self, serializer):
        obj = serializer.save()
        log_activity(self.request.user, "updated", "Website text", obj.key)


class AdminBrandingView(APIView):
    permission_classes = [HasStaffRole]

    def get(self, request):
        site = SiteSettings.load()
        return Response({
            "brand_name": site.brand_name,
            "logo_alt": site.logo_alt,
            "logo_url": site.logo.url if site.logo else "",
            "logo_width": site.logo_width,
            "logo_height": site.logo_height,
            "accepted_formats": ["JPEG", "PNG", "WEBP"],
            "max_logo_mb": settings.MAX_LOGO_BYTES // (1024 * 1024),
        })


class AdminLogoView(APIView):
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = LogoUploadSerializer(data=request.data, context={})
        serializer.is_valid(raise_exception=True)
        info = serializer.context["info"]
        site = SiteSettings.load()
        old_name = site.logo.name if site.logo else ""
        site.logo = serializer.validated_data["file"]
        site.logo_width = info["width"]
        site.logo_height = info["height"]
        site.save()
        if old_name and old_name != site.logo.name:
            delete_stored_file(old_name)
        log_activity(request.user, "updated", "Branding", "Logo replaced")
        return Response({
            "logo_url": site.logo.url,
            "logo_width": info["width"],
            "logo_height": info["height"],
            "square": info["width"] == info["height"],
        }, status=status.HTTP_200_OK)

    def delete(self, request):
        site = SiteSettings.load()
        if site.logo:
            old_name = site.logo.name
            site.logo = None
            site.logo_width = site.logo_height = None
            site.save()
            delete_stored_file(old_name)
            log_activity(request.user, "deleted", "Branding", "Logo removed")
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminAboutImageView(APIView):
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AboutImageUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        site = SiteSettings.load()
        old_name = site.about_image.name if site.about_image else ""
        image = serializer.validated_data["file"]
        info = serializer.context["info"]
        site.about_image = image
        site.about_image_width = info["width"]
        site.about_image_height = info["height"]
        site.about_image_original_filename = image.name[:255]
        site.save()
        if old_name and old_name != site.about_image.name:
            delete_stored_file(old_name)
        log_activity(request.user, "updated", "About image", site.about_image_original_filename)
        return Response(SiteSettingsSerializer(site).data)

    def delete(self, request):
        site = SiteSettings.load()
        if site.about_image:
            old_name = site.about_image.name
            site.about_image = None
            site.about_image_width = None
            site.about_image_height = None
            site.about_image_original_filename = ""
            site.save()
            delete_stored_file(old_name)
            log_activity(request.user, "deleted", "About image", "About section image removed")
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminServiceViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Service"
    serializer_class = ServiceSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = Service.objects.all().order_by("order", "id")
    pagination_class = None

    def perform_create(self, serializer):
        top = Service.objects.aggregate(m=Max("order"))["m"] or 0
        service = serializer.save(order=top + 1)
        self._log("created", service)

    def perform_update(self, serializer):
        previous = serializer.instance.image.name
        service = serializer.save()
        if previous and service.image.name != previous:
            delete_stored_file(previous)
        self._log("updated", service)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list):
            return Response({"detail": "Send the service IDs in the order they should appear."}, status=400)
        existing = set(Service.objects.values_list("id", flat=True))
        try:
            requested = [int(value) for value in ids]
        except (TypeError, ValueError):
            return Response({"detail": "IDs must be numbers."}, status=400)
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every service exactly once."}, status=400)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                Service.objects.filter(pk=pk).update(order=position)
        log_activity(request.user, "updated", "Service", "Service order changed")
        return Response(ServiceSerializer(self.get_queryset(), many=True).data)


class AdminGalleryImageViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Gallery image"
    serializer_class = GalleryImageSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    queryset = GalleryImage.objects.all().order_by("order", "id")
    pagination_class = None

    def perform_create(self, serializer):
        top = GalleryImage.objects.aggregate(m=Max("order"))["m"] or 0
        image = serializer.save(order=top + 1)
        self._log("created", image)

    def perform_update(self, serializer):
        previous = serializer.instance.image.name
        image = serializer.save()
        if image.image.name != previous:
            delete_stored_file(previous)
        self._log("updated", image)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list):
            return Response({"detail": "Send the image IDs in the order they should appear."},
                            status=status.HTTP_400_BAD_REQUEST)
        existing = set(GalleryImage.objects.values_list("id", flat=True))
        try:
            requested = [int(value) for value in ids]
        except (TypeError, ValueError):
            return Response({"detail": "IDs must be numbers."}, status=status.HTTP_400_BAD_REQUEST)
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every gallery image exactly once."},
                            status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                GalleryImage.objects.filter(pk=pk).update(order=position)
        log_activity(request.user, "updated", "Gallery image", "Gallery order changed")
        return Response(GalleryImageSerializer(self.get_queryset(), many=True).data)


class AdminTestimonialViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Testimonial"
    serializer_class = TestimonialSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [JSONParser]
    queryset = Testimonial.objects.all().order_by("order", "id")
    pagination_class = None

    def perform_create(self, serializer):
        top = Testimonial.objects.aggregate(m=Max("order"))["m"] or 0
        testimonial = serializer.save(order=top + 1)
        self._log("created", testimonial)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        testimonial = self.get_object()
        blockers = testimonial.publish_blockers()
        if blockers:
            return Response({"detail": "This testimonial cannot be published yet.", "blockers": blockers},
                            status=status.HTTP_400_BAD_REQUEST)
        testimonial.is_published = True
        testimonial.save(update_fields=["is_published", "updated_at"])
        log_activity(request.user, "published", "Testimonial", testimonial.display_name)
        return Response(TestimonialSerializer(testimonial).data)

    @action(detail=True, methods=["post"])
    def unpublish(self, request, pk=None):
        testimonial = self.get_object()
        testimonial.is_published = False
        testimonial.save(update_fields=["is_published", "updated_at"])
        log_activity(request.user, "unpublished", "Testimonial", testimonial.display_name)
        return Response(TestimonialSerializer(testimonial).data)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        ids = request.data.get("ids")
        if not isinstance(ids, list):
            return Response({"detail": "Send the testimonial IDs in the order they should appear."},
                            status=status.HTTP_400_BAD_REQUEST)
        existing = set(Testimonial.objects.values_list("id", flat=True))
        try:
            requested = [int(value) for value in ids]
        except (TypeError, ValueError):
            return Response({"detail": "IDs must be numbers."}, status=status.HTTP_400_BAD_REQUEST)
        if set(requested) != existing or len(requested) != len(existing):
            return Response({"detail": "The list must include every testimonial exactly once."},
                            status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for position, pk in enumerate(requested, start=1):
                Testimonial.objects.filter(pk=pk).update(order=position)
        log_activity(request.user, "updated", "Testimonial", "Testimonial order changed")
        return Response(TestimonialSerializer(self.get_queryset(), many=True).data)
