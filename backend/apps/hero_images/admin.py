from django.contrib import admin

from apps.hero_images.models import HeroImage


@admin.register(HeroImage)
class HeroImageAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "is_active", "original_filename", "width", "height")
    list_editable = ("order", "is_active")
