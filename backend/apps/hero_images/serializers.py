from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.serializers import DefaultTrueBoolean
from apps.common.validators import file_checksum, inspect_image
from apps.hero_images.models import HeroImage


class HeroImageSerializer(serializers.ModelSerializer):
    is_active = DefaultTrueBoolean(required=False)
    image = serializers.ImageField(write_only=True, required=False)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = HeroImage
        fields = ["id", "image", "image_url", "alt_text", "order", "is_active",
                  "width", "height", "original_filename", "created_at", "updated_at"]
        read_only_fields = ["width", "height", "original_filename", "created_at", "updated_at", "order"]

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
            clash = HeroImage.objects.filter(checksum=digest)
            if self.instance is not None:
                clash = clash.exclude(pk=self.instance.pk)
            if clash.exists():
                raise serializers.ValidationError({"image": "This exact image is already in the slideshow."})
            attrs.update(width=info["width"], height=info["height"], checksum=digest,
                         original_filename=upload.name[:255])
        return attrs


class PublicHeroImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    alt = serializers.CharField(source="alt_text")

    class Meta:
        model = HeroImage
        fields = ["id", "url", "alt", "width", "height"]

    def get_url(self, obj):
        return obj.image.url
