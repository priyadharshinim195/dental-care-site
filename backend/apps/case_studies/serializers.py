from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.text import slugify
from rest_framework import serializers

from apps.case_studies.models import CaseStudy, CaseStudyImage
from apps.common.validators import file_checksum, inspect_image

PUBLISHED_ONLY_FLAGS = ("clinic_verified", "consent_confirmed")


class CaseStudyImageSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudyImage
        fields = ["id", "case", "kind", "image", "image_url", "alt_text", "caption",
                  "width", "height", "original_filename", "order", "updated_at"]
        read_only_fields = ["width", "height", "original_filename", "order", "updated_at"]

    def get_image_url(self, obj):
        return obj.image.url if obj.image else ""

    def validate(self, attrs):
        upload = attrs.get("image")
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        case = attrs.get("case", getattr(self.instance, "case", None))
        if self.instance is None and upload is None:
            raise serializers.ValidationError({"image": "Choose an image to upload."})
        if kind in CaseStudyImage.SINGLE_PER_CASE and case is not None:
            clash = CaseStudyImage.objects.filter(case=case, kind=kind)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({
                    "kind": f"This case already has a {kind} image. Replace that image instead."})
        if upload is not None:
            try:
                info = inspect_image(upload)
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"image": exc.messages})
            digest = file_checksum(upload)
            clash = CaseStudyImage.objects.filter(checksum=digest)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"image": "This exact image is already uploaded."})
            attrs.update(width=info["width"], height=info["height"], checksum=digest,
                         original_filename=upload.name[:255])
        return attrs


class CaseStudyAdminSerializer(serializers.ModelSerializer):
    images = CaseStudyImageSerializer(many=True, read_only=True)
    publish_blockers = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = ["id", "slug", "title", "category", "summary", "description", "challenge",
                  "treatment_details", "solution", "result", "internal_notes", "status", "clinic_verified",
                  "consent_confirmed", "order", "images", "publish_blockers",
                  "created_at", "updated_at"]
        read_only_fields = ["status", "order", "created_at", "updated_at"]
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def get_publish_blockers(self, obj):
        return obj.publish_blockers()

    def validate(self, attrs):
        instance = self.instance
        if instance is not None and instance.status == CaseStudy.Status.PUBLISHED:
            if any(attrs.get(flag) is False for flag in PUBLISHED_ONLY_FLAGS):
                raise serializers.ValidationError(
                    {"detail": "Unpublish this case before removing its consent or verification."})
        if not attrs.get("slug") and attrs.get("title"):
            base = slugify(attrs["title"])[:100] or "case-study"
            slug, n = base, 2
            while CaseStudy.objects.filter(slug=slug).exclude(pk=getattr(instance, "pk", None)).exists():
                slug = f"{base}-{n}"
                n += 1
            attrs["slug"] = slug
        return attrs


class PublicCaseImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    alt = serializers.CharField(source="alt_text")

    class Meta:
        model = CaseStudyImage
        fields = ["kind", "url", "alt", "caption", "width", "height"]

    def get_url(self, obj):
        return obj.image.url


class PublicCaseStudySerializer(serializers.ModelSerializer):
    images = PublicCaseImageSerializer(many=True, read_only=True)

    class Meta:
        model = CaseStudy
        fields = ["id", "slug", "title", "category", "summary", "description",
                  "treatment_details", "challenge", "solution", "result", "images"]
