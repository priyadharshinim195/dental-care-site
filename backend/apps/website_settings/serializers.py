from urllib.parse import urlparse

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.serializers import DefaultTrueBoolean
from apps.common.validators import file_checksum, inspect_image, inspect_logo
from apps.website_settings.models import (
    GalleryImage, SECTION_KEYS, Service, SiteContent, SiteSettings, Testimonial,
)


class SocialLinkField(serializers.ListField):
    child = serializers.DictField()

    def to_internal_value(self, data):
        items = super().to_internal_value(data)
        cleaned = []
        for item in items:
            label = str(item.get("label", "")).strip()[:40]
            url = str(item.get("url", "")).strip()
            if not label or not url:
                raise serializers.ValidationError("Each social link needs a label and a URL.")
            parsed = urlparse(url)
            if parsed.scheme != "https" or not parsed.netloc:
                raise serializers.ValidationError(f"'{label}' must be a full https:// link.")
            cleaned.append({"label": label, "url": url})
        if len(cleaned) > 10:
            raise serializers.ValidationError("Add no more than 10 social links.")
        return cleaned


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    about_image_url = serializers.SerializerMethodField()
    social_links = SocialLinkField(required=False)

    class Meta:
        model = SiteSettings
        fields = [
            "brand_name", "logo_url", "logo_alt", "logo_width", "logo_height",
            "about_image_url", "about_image_width", "about_image_height",
            "about_image_alt",
            "address", "phone", "email", "hours", "maps_url", "whatsapp_number",
            "seo_title", "seo_description", "social_links",
            "hero_interval_ms", "hero_fade_ms", "section_visibility", "section_order", "updated_at",
        ]
        read_only_fields = [
            "logo_width", "logo_height", "about_image_width", "about_image_height", "updated_at",
        ]

    def get_logo_url(self, obj):
        return obj.logo.url if obj.logo else ""

    def get_about_image_url(self, obj):
        return obj.about_image.url if obj.about_image else ""

    def validate_section_visibility(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Section visibility must be an object.")
        cleaned = {key: bool(value.get(key, True)) for key in SECTION_KEYS}
        return cleaned

    def validate_maps_url(self, value):
        if value and urlparse(value).scheme != "https":
            raise serializers.ValidationError("Use a full https:// link.")
        return value

    def validate_section_order(self, value):
        if (not isinstance(value, list) or len(value) != len(SECTION_KEYS)
                or not all(isinstance(item, str) for item in value)
                or set(value) != set(SECTION_KEYS)):
            raise serializers.ValidationError("Section order must include every website section exactly once.")
        return value


class SiteContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteContent
        fields = ["key", "group", "label", "default_value", "value", "updated_at"]
        read_only_fields = ["key", "group", "label", "default_value", "updated_at"]


class LogoUploadSerializer(serializers.Serializer):
    file = serializers.FileField()

    def validate_file(self, value):
        try:
            self.context["info"] = inspect_logo(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


class AboutImageUploadSerializer(serializers.Serializer):
    file = serializers.ImageField()

    def validate_file(self, value):
        try:
            self.context["info"] = inspect_image(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value


class ServiceSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()
    is_active = DefaultTrueBoolean(required=False)

    class Meta:
        model = Service
        fields = [
            "id", "title", "description", "image", "image_url", "image_alt",
            "image_width", "image_height", "original_filename", "order", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "image_width", "image_height", "original_filename", "order", "created_at", "updated_at",
        ]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else ""

    def validate(self, attrs):
        upload = attrs.get("image")
        if self.instance is None and upload is None:
            raise serializers.ValidationError({"image": "Choose an image to upload."})
        if upload is not None:
            try:
                info = inspect_image(upload)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"image": exc.messages})
            digest = file_checksum(upload)
            clash = Service.objects.filter(checksum=digest)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"image": "This exact image is already used by a service."})
            attrs.update(
                image_width=info["width"], image_height=info["height"], checksum=digest,
                original_filename=upload.name[:255],
            )
        return attrs


class PublicServiceSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ["id", "title", "description", "image_url", "image_alt", "image_width", "image_height"]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else ""


class GalleryImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()
    is_active = DefaultTrueBoolean(required=False)

    class Meta:
        model = GalleryImage
        fields = [
            "id", "image", "image_url", "alt_text", "width", "height",
            "original_filename", "checksum", "order", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["width", "height", "original_filename", "checksum", "order", "created_at", "updated_at"]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else ""

    def validate(self, attrs):
        upload = attrs.get("image")
        if self.instance is None and upload is None:
            raise serializers.ValidationError({"image": "Choose an image to upload."})
        if upload is not None:
            try:
                info = inspect_image(upload)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"image": exc.messages})
            digest = file_checksum(upload)
            clash = GalleryImage.objects.filter(checksum=digest)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"image": "This exact image is already in the gallery."})
            attrs.update(
                width=info["width"], height=info["height"], checksum=digest,
                original_filename=upload.name[:255],
            )
        return attrs


class PublicGalleryImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    alt = serializers.CharField(source="alt_text")

    class Meta:
        model = GalleryImage
        fields = ["id", "url", "alt", "width", "height"]

    def get_url(self, obj):
        return obj.image.url if obj.image else ""


class TestimonialSerializer(serializers.ModelSerializer):
    publish_blockers = serializers.SerializerMethodField()

    class Meta:
        model = Testimonial
        fields = [
            "id", "display_name", "quote", "consent_confirmed", "clinic_verified",
            "is_published", "publish_blockers", "order", "created_at", "updated_at",
        ]
        read_only_fields = ["is_published", "order", "created_at", "updated_at"]

    def validate(self, attrs):
        if self.instance and self.instance.is_published:
            consent = attrs.get("consent_confirmed", self.instance.consent_confirmed)
            verified = attrs.get("clinic_verified", self.instance.clinic_verified)
            if not consent or not verified:
                raise serializers.ValidationError(
                    {"detail": "Unpublish this testimonial before removing its consent or verification."})
        return attrs

    def get_publish_blockers(self, obj):
        return obj.publish_blockers()


class PublicTestimonialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Testimonial
        fields = ["id", "display_name", "quote"]
