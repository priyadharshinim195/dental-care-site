from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.validators import file_checksum, inspect_image, inspect_video
from apps.media_manager.models import MediaAsset


class MediaAssetSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True, required=False)
    url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = MediaAsset
        fields = ["id", "file", "url", "kind", "original_name", "mime_type", "size_bytes",
                  "width", "height", "alt_text", "uploaded_by_name", "created_at", "updated_at"]
        read_only_fields = ["kind", "original_name", "mime_type", "size_bytes", "width", "height",
                            "created_at", "updated_at"]

    def get_url(self, obj):
        return obj.file.url

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_username() if obj.uploaded_by else ""

    def validate(self, attrs):
        upload = attrs.get("file")
        if self.instance is None and upload is None:
            raise serializers.ValidationError({"file": "Choose a file to upload."})
        if upload is None:
            return attrs
        name = upload.name.lower()
        try:
            if name.endswith((".mp4", ".webm")):
                info = inspect_video(upload)
                kind = MediaAsset.Kind.VIDEO
            else:
                info = inspect_image(upload)
                kind = MediaAsset.Kind.IMAGE
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"file": exc.messages})
        digest = file_checksum(upload)
        clash = MediaAsset.objects.filter(checksum=digest)
        if self.instance is not None:
            clash = clash.exclude(pk=self.instance.pk)
        existing = clash.first()
        if existing is not None:
            raise serializers.ValidationError(
                {"file": f"This file is already in the library as '{existing.original_name}' (id {existing.id})."})
        attrs.update(kind=kind, original_name=upload.name[:255], mime_type=info["mime"],
                     size_bytes=info["size"], width=info["width"], height=info["height"], checksum=digest)
        return attrs
