from django.conf import settings
from django.db import models


class ActivityLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                              on_delete=models.SET_NULL, related_name="activity")
    actor_name = models.CharField(max_length=150, blank=True)
    action = models.CharField(max_length=20)
    entity = models.CharField(max_length=60)
    summary = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.actor_name or 'system'} {self.action} {self.entity}: {self.summary}"
