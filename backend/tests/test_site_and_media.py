from django.test import TestCase
from rest_framework.test import APIClient

from apps.case_studies.models import CaseStudy, CaseStudyImage
from apps.website_settings.models import GalleryImage, SiteContent, SiteSettings
from tests.helpers import IsolatedMediaMixin, jpeg_bytes, make_user, png_bytes, upload


class SiteSettingsTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(make_user("ed3", role="Editors"))

    def test_public_site_payload_contains_content_and_settings_without_admin_fields(self):
        SiteContent.objects.create(key="about.title", group="about", label="t", default_value="Default", value="")
        r = APIClient().get("/api/public/site/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["content"]["about.title"], "Default")
        self.assertIn("hero_interval_ms", r.data["settings"])
        self.assertNotIn("internal_notes", str(r.data))

    def test_effective_content_uses_value_when_set(self):
        SiteContent.objects.create(key="hero.name", group="hero", label="n", default_value="AJITHA", value="CLINIC X")
        r = APIClient().get("/api/public/site/")
        self.assertEqual(r.data["content"]["hero.name"], "CLINIC X")

    def test_admin_content_edit_is_reflected_by_public_api(self):
        item = SiteContent.objects.create(
            key="about.title", group="about", label="About: title", default_value="Original title", value="")
        updated = self.client.patch(f"/api/admin/site-content/{item.key}/", {"value": "Updated title"}, format="json")
        self.assertEqual(updated.status_code, 200, updated.data)
        public = APIClient().get("/api/public/site/")
        self.assertEqual(public.data["content"]["about.title"], "Updated title")

    def test_whatsapp_number_must_be_digits(self):
        r = self.client.patch("/api/admin/site-settings/", {"whatsapp_number": "+91 98765"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_contact_settings_patch_persists_and_public_site_returns_updates(self):
        updates = {
            "phone": "+91 81234 56789",
            "whatsapp_number": "918765432109",
            "email": "hello@ajithadental.example",
            "address": "12 Clinic Road, Chennai",
            "maps_url": "https://maps.example/ajitha-clinic",
            "hours": "Mon-Sat, 9 AM-6 PM",
        }
        r = self.client.patch("/api/admin/site-settings/", updates, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        for field, value in updates.items():
            self.assertEqual(r.data[field], value)
        self.assertEqual(SiteSettings.load().phone, updates["phone"])
        self.assertEqual(SiteSettings.load().whatsapp_number, updates["whatsapp_number"])

        public = APIClient().get("/api/public/site/")
        for field, value in updates.items():
            self.assertEqual(public.data["settings"][field], value)

        r = self.client.get("/api/admin/site-settings/")
        self.assertEqual(r.status_code, 200, r.data)
        for field, value in updates.items():
            self.assertEqual(r.data[field], value)

        updates["address"] = "13 Updated Clinic Road, Chennai"
        r = self.client.put("/api/admin/site-settings/", {**r.data, **updates}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["address"], updates["address"])

    def test_site_settings_requires_authorized_dashboard_role_for_updates(self):
        anonymous = APIClient()
        self.assertEqual(anonymous.get("/api/admin/site-settings/").status_code, 401)
        self.assertEqual(
            anonymous.patch("/api/admin/site-settings/", {"address": "Unauthorized"}, format="json").status_code,
            401,
        )

        viewer_client = APIClient()
        viewer_client.force_authenticate(make_user("site-settings-viewer", role="Viewers"))
        self.assertEqual(viewer_client.get("/api/admin/site-settings/").status_code, 200)
        self.assertEqual(
            viewer_client.patch("/api/admin/site-settings/", {"address": "Unauthorized"}, format="json").status_code,
            403,
        )

    def test_default_contact_number_is_configured(self):
        site = SiteSettings.load()
        self.assertEqual(site.phone, "+91 73581 99090")
        self.assertEqual(site.whatsapp_number, "917358199090")

    def test_social_links_must_be_https(self):
        r = self.client.patch("/api/admin/site-settings/",
                              {"social_links": [{"label": "Instagram", "url": "http://insta.example"}]}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_section_visibility_is_saved(self):
        r = self.client.patch("/api/admin/site-settings/",
                              {"section_visibility": {"gallery": False}}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(SiteSettings.load().section_visibility["gallery"])
        self.assertTrue(SiteSettings.load().section_visibility["about"])

    def test_timing_limits_are_enforced(self):
        r = self.client.patch("/api/admin/site-settings/", {"hero_interval_ms": 100}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_svg_logo_is_rejected(self):
        svg = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        r = self.client.post("/api/admin/branding/logo/", {"file": upload("logo.svg", svg)}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_png_logo_is_accepted_and_reports_dimensions(self):
        r = self.client.post("/api/admin/branding/logo/",
                             {"file": upload("logo.png", png_bytes((300, 300)))}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["square"])
        self.assertEqual(SiteSettings.load().logo_width, 300)


class MediaLibraryTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(make_user("ed4", role="Editors"))

    def test_upload_and_search(self):
        r = self.client.post("/api/admin/media/", {"file": upload("clinic-lobby.png", png_bytes())}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        found = self.client.get("/api/admin/media/?q=lobby").data
        self.assertEqual(len(found), 1)
        self.assertEqual(self.client.get("/api/admin/media/?q=nothing-here").data, [])

    def test_duplicate_file_is_rejected(self):
        data = png_bytes((11, 11), (5, 5, 5))
        self.client.post("/api/admin/media/", {"file": upload("a.png", data)}, format="multipart")
        r = self.client.post("/api/admin/media/", {"file": upload("b.png", data)}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_video_with_wrong_content_is_rejected(self):
        r = self.client.post("/api/admin/media/", {"file": upload("clip.mp4", b"not really a video")},
                             format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_valid_mp4_header_is_accepted(self):
        header = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 64
        r = self.client.post("/api/admin/media/", {"file": upload("clip.mp4", header)}, format="multipart")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["kind"], "video")

    def test_overview_reports_statistics(self):
        r = self.client.get("/api/admin/dashboard/overview/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("contact_fields_missing", r.data)
        self.assertIn("address", r.data["contact_fields_missing"])

    def test_overview_counts_only_published_comparison_cases(self):
        composite_case = CaseStudy.objects.create(
            slug="legacy-case", title="Legacy", status=CaseStudy.Status.PUBLISHED,
            clinic_verified=True, consent_confirmed=True)
        CaseStudyImage.objects.create(
            case=composite_case, kind="composite", checksum="c" * 64, image="case-studies/legacy.png")
        pair_case = CaseStudy.objects.create(
            slug="paired-case", title="Paired", status=CaseStudy.Status.PUBLISHED,
            clinic_verified=True, consent_confirmed=True)
        CaseStudyImage.objects.create(
            case=pair_case, kind="before", checksum="b" * 64, image="case-studies/before.png")
        CaseStudyImage.objects.create(
            case=pair_case, kind="after", checksum="a" * 64, image="case-studies/after.png")

        response = self.client.get("/api/admin/dashboard/overview/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["case_studies"]["published"], 1)


class GalleryAndTestimonialTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(make_user("web-editor", role="Editors"))

    def test_gallery_upload_replace_visibility_and_reorder(self):
        first = self.client.post(
            "/api/admin/gallery-images/",
            {"image": upload("gallery-a.png", png_bytes((40, 30), (1, 2, 3))), "alt_text": "Clinic"},
            format="multipart",
        )
        second = self.client.post(
            "/api/admin/gallery-images/",
            {"image": upload("gallery-b.png", png_bytes((41, 30), (4, 5, 6))), "alt_text": "Reception"},
            format="multipart",
        )
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 201, second.data)

        public = APIClient().get("/api/public/gallery/")
        self.assertEqual([item["id"] for item in public.data], [first.data["id"], second.data["id"]])
        self.assertEqual(public.data[0]["alt"], "Clinic")

        reordered = self.client.post(
            "/api/admin/gallery-images/reorder/",
            {"ids": [second.data["id"], first.data["id"]]},
            format="json",
        )
        self.assertEqual(reordered.status_code, 200, reordered.data)
        self.assertEqual([item["id"] for item in reordered.data], [second.data["id"], first.data["id"]])

        hidden = self.client.patch(
            f"/api/admin/gallery-images/{first.data['id']}/", {"is_active": False}, format="json")
        self.assertEqual(hidden.status_code, 200, hidden.data)
        self.assertEqual([item["id"] for item in APIClient().get("/api/public/gallery/").data], [second.data["id"]])

        from django.core.files.storage import default_storage
        image = GalleryImage.objects.get(pk=second.data["id"])
        old_name = image.image.name
        replaced = self.client.patch(
            f"/api/admin/gallery-images/{image.pk}/",
            {"image": upload("gallery-replacement.jpg", jpeg_bytes((42, 30)))},
            format="multipart",
        )
        self.assertEqual(replaced.status_code, 200, replaced.data)
        self.assertFalse(default_storage.exists(old_name))

    def test_testimonial_requires_consent_and_verification_to_publish(self):
        created = self.client.post(
            "/api/admin/testimonials/",
            {"display_name": "Anonymous patient", "quote": "The clinic explained each step clearly."},
            format="json",
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(APIClient().get("/api/public/testimonials/").data, [])

        blocked = self.client.post(f"/api/admin/testimonials/{created.data['id']}/publish/")
        self.assertEqual(blocked.status_code, 400)
        self.assertTrue(any("consent" in message for message in blocked.data["blockers"]))

        saved = self.client.patch(
            f"/api/admin/testimonials/{created.data['id']}/",
            {"consent_confirmed": True, "clinic_verified": True},
            format="json",
        )
        self.assertEqual(saved.status_code, 200, saved.data)
        published = self.client.post(f"/api/admin/testimonials/{created.data['id']}/publish/")
        self.assertEqual(published.status_code, 200, published.data)
        public = APIClient().get("/api/public/testimonials/")
        self.assertEqual(public.data[0]["display_name"], "Anonymous patient")
        self.assertNotIn("consent_confirmed", public.data[0])

        invalid = self.client.patch(
            f"/api/admin/testimonials/{created.data['id']}/",
            {"consent_confirmed": False},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)


class DynamicServiceAndAboutImageTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        from apps.website_settings.models import Service

        Service.objects.all().delete()
        self.client = APIClient()
        self.editor = make_user("service-editor", role="Editors")
        self.client.force_authenticate(self.editor)

    def _create_service(self, name, size):
        return self.client.post(
            "/api/admin/services/",
            {
                "title": name,
                "description": f"{name} description",
                "image_alt": f"{name} image",
                "image": upload(f"{name}.png", png_bytes(size)),
            },
            format="multipart",
        )

    def test_service_crud_and_uploaded_file_are_persistent_and_public(self):
        from django.core.files.storage import default_storage
        from apps.website_settings.models import Service

        created = self._create_service("Dental implants", (80, 60))
        self.assertEqual(created.status_code, 201, created.data)
        service = Service.objects.get(pk=created.data["id"])
        stored_name = service.image.name
        self.assertTrue(default_storage.exists(stored_name))
        self.assertEqual((service.image_width, service.image_height), (80, 60))
        self.assertEqual(self.client.get("/api/admin/services/").data[0]["id"], service.pk)

        public = APIClient().get("/api/public/services/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data[0]["title"], "Dental implants")
        self.assertIn("/media/", public.data[0]["image_url"])

        updated = self.client.patch(
            f"/api/admin/services/{service.pk}/",
            {"title": "Restorative implants", "description": "Updated clinic-approved description."},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(APIClient().get("/api/public/services/").data[0]["title"], "Restorative implants")

        hidden = self.client.patch(f"/api/admin/services/{service.pk}/", {"is_active": False}, format="json")
        self.assertEqual(hidden.status_code, 200, hidden.data)
        self.assertEqual(APIClient().get("/api/public/services/").data, [])

        deleted = self.client.delete(f"/api/admin/services/{service.pk}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(Service.objects.filter(pk=service.pk).exists())
        self.assertFalse(default_storage.exists(stored_name))

    def test_service_images_can_be_replaced_and_reordered(self):
        from django.core.files.storage import default_storage
        from apps.website_settings.models import Service

        first = self._create_service("Cleaning", (81, 60))
        second = self._create_service("Whitening", (82, 60))
        self.assertEqual(first.status_code, 201, first.data)
        self.assertEqual(second.status_code, 201, second.data)
        first_service = Service.objects.get(pk=first.data["id"])
        old_image = first_service.image.name

        replaced = self.client.patch(
            f"/api/admin/services/{first_service.pk}/",
            {"image": upload("new-cleaning.png", png_bytes((95, 70), (3, 5, 7)))},
            format="multipart",
        )
        self.assertEqual(replaced.status_code, 200, replaced.data)
        self.assertFalse(default_storage.exists(old_image))

        ids = [first.data["id"], second.data["id"]]
        reordered = self.client.post("/api/admin/services/reorder/", {"ids": ids[::-1]}, format="json")
        self.assertEqual(reordered.status_code, 200, reordered.data)
        self.assertEqual([item["id"] for item in reordered.data], ids[::-1])

    def test_about_image_upload_delete_and_admin_authorization(self):
        from django.core.files.storage import default_storage
        from apps.website_settings.models import SiteSettings

        uploaded = self.client.post(
            "/api/admin/about-image/",
            {"file": upload("about.png", png_bytes((100, 75)))},
            format="multipart",
        )
        self.assertEqual(uploaded.status_code, 200, uploaded.data)
        site = SiteSettings.load()
        stored_name = site.about_image.name
        self.assertTrue(default_storage.exists(stored_name))
        self.assertEqual((site.about_image_width, site.about_image_height), (100, 75))
        public = APIClient().get("/api/public/site/")
        self.assertEqual(public.data["settings"]["about_image_url"], site.about_image.url)
        self.assertEqual(public.data["settings"]["about_image_width"], 100)

        removed = self.client.delete("/api/admin/about-image/")
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(SiteSettings.load().about_image)
        self.assertFalse(default_storage.exists(stored_name))

        anonymous = APIClient().post(
            "/api/admin/about-image/",
            {"file": upload("unauthorized.png", png_bytes())},
            format="multipart",
        )
        self.assertEqual(anonymous.status_code, 401)

    def test_section_order_is_validated_persisted_and_returned_without_cache(self):
        from apps.website_settings.models import SECTION_KEYS, SiteSettings

        order = list(reversed(SECTION_KEYS))
        response = self.client.patch(
            "/api/admin/site-settings/", {"section_order": order}, format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(SiteSettings.load().section_order, order)
        public = APIClient().get("/api/public/site/")
        self.assertEqual(public.data["settings"]["section_order"], order)
        self.assertEqual(public["Cache-Control"], "no-store, max-age=0")

        invalid = self.client.patch(
            "/api/admin/site-settings/", {"section_order": ["about", "about"]}, format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_viewers_cannot_change_services(self):
        viewer = APIClient()
        viewer.force_authenticate(make_user("service-viewer", role="Viewers"))
        self.assertEqual(viewer.get("/api/admin/services/").status_code, 200)
        response = viewer.post(
            "/api/admin/services/",
            {"title": "Unauthorized", "image": upload("service.png", png_bytes())},
            format="multipart",
        )
        self.assertEqual(response.status_code, 403)
