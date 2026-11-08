from django.db import models

from apps.common.models import TimeStampedModel
from apps.common.mixins import FileCleanupMixin


class HeroImage(FileCleanupMixin, TimeStampedModel):
    """One image in the homepage slideshow. The slideshow order is `order`."""
    file_fields = ("image",)

    image = models.ImageField(upload_to="hero/%Y/%m/")
    alt_text = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    checksum = models.CharField(max_length=64, unique=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.original_filename or self.image.name
