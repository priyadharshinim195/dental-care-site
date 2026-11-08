from rest_framework import serializers

from apps.dashboard.models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "actor_name", "action", "entity", "summary", "created_at"]
