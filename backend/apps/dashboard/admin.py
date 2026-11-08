from django.contrib import admin

from apps.dashboard.models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_name", "action", "entity", "summary")
    list_filter = ("action", "entity")
    search_fields = ("summary", "actor_name")
    readonly_fields = [f.name for f in ActivityLog._meta.fields]
