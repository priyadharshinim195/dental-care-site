


class FileCleanupMixin:
    """Delete stored files when a model row is removed."""
    file_fields = ()

    def delete(self, *args, **kwargs):
        from apps.common.validators import delete_stored_file
        names = [getattr(self, f).name for f in self.file_fields if getattr(self, f)]
        result = super().delete(*args, **kwargs)
        for name in names:
            delete_stored_file(name)
        return result


class NoStoreResponseMixin:
    """Prevent browser and intermediary caches from serving stale website content."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response["Cache-Control"] = "no-store, max-age=0"
        response["Pragma"] = "no-cache"
        return response


class ActivityLogMixin:
    """Writes an audit entry for create, update, and delete in admin viewsets."""
    activity_label = "Record"

    def _log(self, action, obj):
        from apps.dashboard.services import log_activity
        log_activity(self.request.user, action, self.activity_label, str(obj))

    def perform_create(self, serializer):
        obj = serializer.save()
        self._log("created", obj)

    def perform_update(self, serializer):
        obj = serializer.save()
        self._log("updated", obj)

    def perform_destroy(self, instance):
        label = str(instance)
        instance.delete()
        from apps.dashboard.services import log_activity
        log_activity(self.request.user, "deleted", self.activity_label, label)


