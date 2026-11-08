from django.conf import settings
from django.db import models

from apps.common.mixins import FileCleanupMixin
from apps.common.models import TimeStampedModel


class MediaAsset(FileCleanupMixin, TimeStampedModel):
    class Kind(models.TextChoices):
        IMAGE = "image", "Image"
        VIDEO = "video", "Video"

    file_fields = ("file",)

    file = models.FileField(upload_to="library/%Y/%m/")
    kind = models.CharField(max_length=10, choices=Kind.choices, db_index=True)
    original_name = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=80)
    size_bytes = models.PositiveBigIntegerField()
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    checksum = models.CharField(max_length=64, unique=True)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name="media_uploads")

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name_plural = "media assets"

    def __str__(self):
        return self.original_name
