"""Upload validation: checks extension AND the real file content (magic bytes / Pillow)."""
import hashlib
import logging
import os

from django.conf import settings
from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError

logger = logging.getLogger(__name__)

# Pillow format name -> extensions allowed for that format.
IMAGE_EXTENSIONS = {"JPEG": (".jpg", ".jpeg"), "PNG": (".png",), "WEBP": (".webp",)}
VIDEO_EXTENSIONS = {".mp4": "video/mp4", ".webm": "video/webm"}
LOGO_FORMATS = ("JPEG", "PNG", "WEBP")  # SVG is deliberately excluded (script injection risk)


def _rewind(f):
    try:
        f.seek(0)
    except (AttributeError, OSError):
        pass


def _extension(name):
    return os.path.splitext(name or "")[1].lower()


def file_checksum(f):
    digest = hashlib.sha256()
    for chunk in f.chunks():
        digest.update(chunk)
    _rewind(f)
    return digest.hexdigest()


def inspect_image(f, max_bytes=None, allowed_formats=None):
    """Validate an uploaded image and return its metadata. Raises ValidationError."""
    max_bytes = max_bytes or settings.MAX_IMAGE_BYTES
    if f.size == 0:
        raise ValidationError("The file is empty.")
    if f.size > max_bytes:
        raise ValidationError(f"The file is too large. The limit is {max_bytes // (1024 * 1024)} MB.")

    try:
        with Image.open(f) as probe:
            fmt = probe.format
            probe.verify()          # detects truncated or corrupted files
        _rewind(f)
        with Image.open(f) as img:
            width, height = img.size
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        _rewind(f)
        raise ValidationError("The file is not a valid image.")
    _rewind(f)

    allowed = allowed_formats or tuple(IMAGE_EXTENSIONS)
    if fmt not in allowed:
        raise ValidationError("Unsupported image format. Allowed formats: " + ", ".join(allowed) + ".")
    ext = _extension(f.name)
    if ext not in IMAGE_EXTENSIONS.get(fmt, ()):
        raise ValidationError("The file extension does not match the image content.")
    return {"width": width, "height": height, "format": fmt, "size": f.size, "mime": f"image/{fmt.lower()}"}


def inspect_logo(f):
    return inspect_image(f, max_bytes=settings.MAX_LOGO_BYTES, allowed_formats=LOGO_FORMATS)


def inspect_video(f):
    if f.size == 0:
        raise ValidationError("The file is empty.")
    if f.size > settings.MAX_VIDEO_BYTES:
        raise ValidationError("The video is too large. The limit is 100 MB.")
    ext = _extension(f.name)
    if ext not in VIDEO_EXTENSIONS:
        raise ValidationError("Unsupported video format. Allowed formats: .mp4, .webm.")
    header = f.read(16)
    _rewind(f)
    is_mp4 = len(header) >= 8 and header[4:8] == b"ftyp"
    is_webm = header[:4] == b"\x1a\x45\xdf\xa3"
    if (ext == ".mp4" and not is_mp4) or (ext == ".webm" and not is_webm):
        raise ValidationError("The file content does not match its video extension.")
    return {"width": None, "height": None, "format": ext[1:], "size": f.size, "mime": VIDEO_EXTENSIONS[ext]}


def delete_stored_file(name):
    """Remove a file from storage. Missing files are ignored so cleanup never breaks a request."""
    if not name:
        return
    from django.core.files.storage import default_storage
    try:
        default_storage.delete(name)
    except Exception:  # noqa: BLE001 - storage errors must not fail the API call
        logger.warning("Could not delete stored file %s", name, exc_info=True)
