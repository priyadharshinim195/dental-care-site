from django.db.models import Q
from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from apps.accounts.permissions import HasAdminRole
from apps.common.mixins import ActivityLogMixin
from apps.common.validators import delete_stored_file
from apps.media_manager.models import MediaAsset
from apps.media_manager.serializers import MediaAssetSerializer


class AdminMediaViewSet(ActivityLogMixin, viewsets.ModelViewSet):
    activity_label = "Media file"
    serializer_class = MediaAssetSerializer
    permission_classes = [HasAdminRole]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    pagination_class = None

    def get_queryset(self):
        qs = MediaAsset.objects.select_related("uploaded_by")
        params = self.request.query_params
        search = params.get("q", "").strip()
        if search:
            qs = qs.filter(Q(original_name__icontains=search) | Q(alt_text__icontains=search))
        kind = params.get("kind")
        if kind in ("image", "video"):
            qs = qs.filter(kind=kind)
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(uploaded_by=self.request.user)
        self._log("uploaded", obj)

    def perform_update(self, serializer):
        previous = serializer.instance.file.name
        obj = serializer.save()
        if obj.file.name != previous:
            delete_stored_file(previous)
        self._log("updated", obj)
