from django.contrib import admin

from apps.media_manager.models import MediaAsset


@admin.register(MediaAsset)
class MediaAssetAdmin(admin.ModelAdmin):
    list_display = ("original_name", "kind", "size_bytes", "created_at")
    list_filter = ("kind",)
    search_fields = ("original_name", "alt_text")
