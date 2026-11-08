from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.db.models import Q

from apps.common.mixins import FileCleanupMixin
from apps.common.models import TimeStampedModel

SECTION_KEYS = ["about", "services", "case-studies", "why-choose-us", "connect",
                "testimonials", "gallery", "contact"]

WHATSAPP_VALIDATOR = RegexValidator(r"^\d{8,15}$", "Use digits only, including the country code, e.g. 919876543210.")


def default_visibility():
    return {key: True for key in SECTION_KEYS}


def default_section_order():
    return SECTION_KEYS.copy()


class SiteSettings(TimeStampedModel):
    """Singleton (pk=1). Holds contact details, SEO, branding and hero slideshow settings."""
    # Branding
    brand_name = models.CharField(max_length=120, default="AJITHA DENTAL CARE")
    logo = models.ImageField(upload_to="branding/", blank=True)
    logo_alt = models.CharField(max_length=200, default="AJITHA DENTAL CARE logo")
    logo_width = models.PositiveIntegerField(null=True, blank=True)
    logo_height = models.PositiveIntegerField(null=True, blank=True)
    about_image = models.ImageField(upload_to="branding/about/", blank=True)
    about_image_width = models.PositiveIntegerField(null=True, blank=True)
    about_image_height = models.PositiveIntegerField(null=True, blank=True)
    about_image_original_filename = models.CharField(max_length=255, blank=True)
    about_image_alt = models.CharField(max_length=200, blank=True, default="A view inside Ajitha Dental Care")
    # Phone is the shared public contact number for both calls and WhatsApp.
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=40, blank=True, default="+91 73581 99090")
    email = models.EmailField(blank=True)
    hours = models.CharField(max_length=160, blank=True)
    maps_url = models.URLField(blank=True)
    whatsapp_number = models.CharField(
        max_length=20, blank=True, default="917358199090", validators=[WHATSAPP_VALIDATOR])
    # SEO
    seo_title = models.CharField(max_length=160, default="Ajitha Dental Care | Your Smile, Our Signature")
    seo_description = models.CharField(
        max_length=300,
        default="Ajitha Dental Care: exceptional dental care with a gentle touch and a commitment to confident, healthy smiles.",
    )
    # Footer and social
    social_links = models.JSONField(default=list, blank=True)
    # Hero slideshow behaviour
    hero_interval_ms = models.PositiveIntegerField(
        default=2000, validators=[MinValueValidator(1200), MaxValueValidator(10000)],
        help_text="Time each image stays on screen.")
    hero_fade_ms = models.PositiveIntegerField(
        default=400, validators=[MinValueValidator(200), MaxValueValidator(2000)],
        help_text="Crossfade duration between images.")
    # Section visibility (hero, header and footer always show)
    section_visibility = models.JSONField(default=default_visibility, blank=True)
    section_order = models.JSONField(default=default_section_order, blank=True)

    class Meta:
        verbose_name = "site settings"
        verbose_name_plural = "site settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # the singleton cannot be deleted

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Site settings"


class SiteContent(TimeStampedModel):
    """Editable website text. An empty value falls back to default_value (the original copy)."""
    key = models.CharField(max_length=120, unique=True)
    group = models.CharField(max_length=60)
    label = models.CharField(max_length=160)
    default_value = models.TextField(blank=True)
    value = models.TextField(blank=True)

    class Meta:
        ordering = ["group", "key"]

    @property
    def effective(self):
        return self.value if self.value.strip() else self.default_value

    def __str__(self):
        return self.key


class Service(FileCleanupMixin, TimeStampedModel):
    file_fields = ("image",)

    seed_key = models.CharField(max_length=40, unique=True, null=True, blank=True, editable=False)
    title = models.CharField(max_length=160)
    description = models.TextField(max_length=1000, blank=True)
    image = models.ImageField(upload_to="services/%Y/%m/", blank=True)
    image_alt = models.CharField(max_length=200, blank=True)
    image_width = models.PositiveIntegerField(null=True, blank=True)
    image_height = models.PositiveIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    checksum = models.CharField(max_length=64, unique=True, null=True, blank=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.title


class GalleryImage(FileCleanupMixin, TimeStampedModel):
    file_fields = ("image",)

    image = models.ImageField(upload_to="gallery/%Y/%m/")
    alt_text = models.CharField(max_length=200, blank=True)
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    original_filename = models.CharField(max_length=255)
    checksum = models.CharField(max_length=64, unique=True)
    order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.alt_text or self.original_filename


class Testimonial(TimeStampedModel):
    display_name = models.CharField(max_length=120)
    quote = models.TextField(max_length=2000)
    consent_confirmed = models.BooleanField(default=False)
    clinic_verified = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False, db_index=True)
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(is_published=False) | Q(
                    is_published=True, consent_confirmed=True, clinic_verified=True),
                name="published_testimonial_requires_consent_and_verification",
            ),
        ]

    def __str__(self):
        return self.display_name

    def publish_blockers(self):
        problems = []
        if not self.display_name.strip():
            problems.append("Add a display name.")
        if not self.quote.strip():
            problems.append("Add the approved testimonial text.")
        if not self.consent_confirmed:
            problems.append("Confirm that written patient consent is on file.")
        if not self.clinic_verified:
            problems.append("Confirm that the clinic has verified the testimonial.")
        return problems
