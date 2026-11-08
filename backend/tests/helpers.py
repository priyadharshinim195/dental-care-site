import io
import tempfile

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

User = get_user_model()
TEMP_MEDIA = tempfile.mkdtemp(prefix="clinic-test-media-")


def png_bytes(size=(64, 48), color=(200, 150, 80)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return buf.getvalue()


def jpeg_bytes(size=(64, 48), color=(10, 20, 30)):
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="JPEG")
    return buf.getvalue()


def upload(name, data, content_type="application/octet-stream"):
    return SimpleUploadedFile(name, data, content_type=content_type)


def make_user(username, password="Strong-pass-123", role=None, superuser=False):
    user = User.objects.create_user(username=username, password=password, email=f"{username}@example.com")
    if superuser:
        user.is_superuser = True
        user.is_staff = True
        user.save()
    if role:
        from django.contrib.auth.models import Group
        user.groups.add(Group.objects.get(name=role))
    return user


class IsolatedMediaMixin:
    """Each test writes uploads to a throwaway folder and starts with an empty throttle cache."""

    def setUp(self):
        super().setUp()
        cache.clear()
        self._media = override_settings(MEDIA_ROOT=TEMP_MEDIA)
        self._media.enable()

    def tearDown(self):
        self._media.disable()
        super().tearDown()
