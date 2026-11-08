from django.db import models
from django.db.models import Q

from apps.common.mixins import FileCleanupMixin
from apps.common.models import TimeStampedModel


class CaseStudy(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        PUBLISHED = "published", "Published"

    slug = models.SlugField(max_length=120, unique=True)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=160, blank=True)
    summary = models.CharField(max_length=300, blank=True, help_text="Short card description.")
    description = models.TextField(blank=True)
    treatment_details = models.TextField(blank=True)
    challenge = models.TextField(blank=True)
    solution = models.TextField(blank=True)
    result = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True, help_text="Visible to the dashboard only, never published.")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    clinic_verified = models.BooleanField(default=False, help_text="The clinic has verified every statement.")
    consent_confirmed = models.BooleanField(default=False, help_text="Written patient consent is on file.")
    order = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            # A case can only be published once verification and consent are both confirmed.
            models.CheckConstraint(
                condition=Q(status="draft") | Q(status="published", clinic_verified=True, consent_confirmed=True),
                name="published_case_requires_verification_and_consent",
            ),
        ]

    def __str__(self):
        return self.title

    def delete(self, *args, **kwargs):
        # Cascading deletes skip per-image cleanup, so remove the stored files explicitly.
        from apps.common.validators import delete_stored_file
        names = [img.image.name for img in self.images.all() if img.image]
        result = super().delete(*args, **kwargs)
        for name in names:
            delete_stored_file(name)
        return result

    def publish_blockers(self):
        problems = []
        if not self.title.strip():
            problems.append("Add a title.")
        if not self.description.strip():
            problems.append("Add a description.")
        if not self.consent_confirmed:
            problems.append("Confirm that written patient consent is on file.")
        if not self.clinic_verified:
            problems.append("Confirm that the clinic has verified the content.")
        if not self.has_display_images():
            problems.append("Add both a before image and an after image.")
        return problems

    def has_display_images(self):
        kinds = set(self.images.values_list("kind", flat=True))
        return {"before", "after"} <= kinds


class CaseStudyImage(FileCleanupMixin, TimeStampedModel):
    class Kind(models.TextChoices):
        COMPOSITE = "composite", "Composite (original image shown unchanged)"
        BEFORE = "before", "Before"
        AFTER = "after", "After"
        XRAY = "xray", "X-ray"
        SURGERY = "surgery", "During surgery"
        PROCESS = "process", "Process"

    file_fields = ("image",)
    SINGLE_PER_CASE = ("composite", "before", "process", "after")

    case = models.ForeignKey(CaseStudy, related_name="images", on_delete=models.CASCADE)
    kind = models.CharField(max_length=20, choices=Kind.choices)
    image = models.ImageField(upload_to="case-studies/%Y/%m/")
    alt_text = models.CharField(max_length=200, blank=True)
    caption = models.CharField(max_length=200, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    original_filename = models.CharField(max_length=255, blank=True)
    checksum = models.CharField(max_length=64, unique=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["case", "kind"],
                condition=Q(kind__in=["composite", "before", "process", "after"]),
                name="one_single_image_per_kind_per_case",
            ),
        ]

    def __str__(self):
        return f"{self.case.title} - {self.get_kind_display()}"
