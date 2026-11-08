from django.contrib import admin

from apps.case_studies.models import CaseStudy, CaseStudyImage


class CaseStudyImageInline(admin.TabularInline):
    model = CaseStudyImage
    extra = 0


@admin.register(CaseStudy)
class CaseStudyAdmin(admin.ModelAdmin):
    list_display = ("title", "status", "clinic_verified", "consent_confirmed", "order")
    list_filter = ("status",)
    search_fields = ("title", "slug")
    inlines = [CaseStudyImageInline]
