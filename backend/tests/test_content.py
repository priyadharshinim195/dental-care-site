from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.case_studies.models import CaseStudy, CaseStudyImage
from apps.hero_images.models import HeroImage
from tests.helpers import IsolatedMediaMixin, jpeg_bytes, make_user, png_bytes, upload


class HeroImageTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.editor = make_user("ed", role="Editors")
        self.client.force_authenticate(self.editor)

    def _create(self, name, data):
        return self.client.post("/api/admin/hero-images/",
                                {"image": upload(name, data), "alt_text": "Slide"}, format="multipart")

    def test_upload_sets_order_and_dimensions(self):
        r = self._create("slide.png", png_bytes((320, 180)))
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual((r.data["width"], r.data["height"]), (320, 180))
        self.assertEqual(r.data["order"], 1)

    def test_extension_must_match_real_content(self):
        r = self._create("fake.jpg", png_bytes())  # PNG bytes with a .jpg name
        self.assertEqual(r.status_code, 400)
        self.assertIn("image", r.data["errors"])

    def test_non_image_bytes_are_rejected(self):
        r = self._create("notes.png", b"this is not an image at all")
        self.assertEqual(r.status_code, 400)

    def test_duplicate_image_is_rejected(self):
        data = png_bytes((100, 100), (1, 2, 3))
        self.assertEqual(self._create("a.png", data).status_code, 201)
        dup = self._create("copy.png", data)
        self.assertEqual(dup.status_code, 400)

    def test_slideshow_is_capped_at_six_images(self):
        for i in range(6):
            self.assertEqual(self._create(f"s{i}.png", png_bytes((10 + i, 10))).status_code, 201)
        seventh = self._create("s7.png", png_bytes((90, 90)))
        self.assertEqual(seventh.status_code, 400)
        self.assertIn("up to 6", str(seventh.data))

    def test_reorder_requires_every_image_exactly_once(self):
        ids = [self._create(f"r{i}.png", png_bytes((20 + i, 20))).data["id"] for i in range(3)]
        bad = self.client.post("/api/admin/hero-images/reorder/", {"ids": ids[:2]}, format="json")
        self.assertEqual(bad.status_code, 400)
        good = self.client.post("/api/admin/hero-images/reorder/", {"ids": list(reversed(ids))}, format="json")
        self.assertEqual(good.status_code, 200)
        self.assertEqual([item["id"] for item in good.data], list(reversed(ids)))

    def test_public_endpoint_returns_only_active_images_in_order(self):
        a = self._create("p1.png", png_bytes((30, 30))).data["id"]
        b = self._create("p2.png", png_bytes((31, 30))).data["id"]
        self.client.patch(f"/api/admin/hero-images/{a}/", {"is_active": False}, format="json")
        anon = APIClient()
        r = anon.get("/api/public/hero-images/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([item["id"] for item in r.data], [b])
        self.assertIn("/media/", r.data[0]["url"])

    def test_replacing_an_image_deletes_the_old_file(self):
        from django.core.files.storage import default_storage
        created = self._create("old.png", png_bytes((40, 40), (9, 9, 9))).data
        obj = HeroImage.objects.get(pk=created["id"])
        old_name = obj.image.name
        self.assertTrue(default_storage.exists(old_name))
        r = self.client.patch(f"/api/admin/hero-images/{obj.pk}/",
                              {"image": upload("new.jpg", jpeg_bytes((40, 40)))}, format="multipart")
        self.assertEqual(r.status_code, 200, r.data)
        self.assertFalse(default_storage.exists(old_name))


class CaseStudyPublishingTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(make_user("ed2", role="Editors"))
        self.case = CaseStudy.objects.create(slug="c1", title="Case one", description="Clinic-approved text")
        CaseStudyImage.objects.create(
            case=self.case, kind="composite", checksum="x" * 64,
            image=upload("c.png", png_bytes((120, 80)))._name)  # store a placeholder path below
        self.case.images.update(image="case-studies/test.png")

    def _add_comparison_pair(self):
        CaseStudyImage.objects.create(
            case=self.case, kind="before", checksum="b" * 64, image="case-studies/before.png")
        CaseStudyImage.objects.create(
            case=self.case, kind="after", checksum="a" * 64, image="case-studies/after.png")

    def test_cannot_publish_without_consent_and_verification(self):
        r = self.client.post(f"/api/admin/case-studies/{self.case.pk}/publish/")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(any("consent" in b for b in r.data["blockers"]))
        self.assertTrue(any("verified" in b for b in r.data["blockers"]))

    def test_database_constraint_blocks_publishing_without_consent(self):
        from django.db import IntegrityError, transaction
        with self.assertRaises(IntegrityError), transaction.atomic():
            CaseStudy.objects.filter(pk=self.case.pk).update(status="published")

    def test_public_site_hides_drafts_and_internal_notes(self):
        self.case.internal_notes = "SECRET INTERNAL NOTE"
        self.case.save()
        r = APIClient().get("/api/public/case-studies/")
        self.assertEqual(r.data, [])
        self.assertNotIn("SECRET", str(r.content))

    def test_publish_succeeds_after_confirmations(self):
        self.client.patch(f"/api/admin/case-studies/{self.case.pk}/",
                          {"clinic_verified": True, "consent_confirmed": True}, format="json")
        self._add_comparison_pair()
        r = self.client.post(f"/api/admin/case-studies/{self.case.pk}/publish/")
        self.assertEqual(r.status_code, 200, r.data)
        public = APIClient().get("/api/public/case-studies/").data
        self.assertEqual([c["slug"] for c in public], ["c1"])
        self.assertEqual({image["kind"] for image in public[0]["images"]}, {"composite", "before", "after"})

    def test_public_endpoint_returns_all_published_cases_in_upload_order(self):
        created_at = timezone.now()
        for index in range(7):
            case = CaseStudy.objects.create(
                slug=f"published-{index}", title=f"Published {index}",
                status=CaseStudy.Status.PUBLISHED, clinic_verified=True, consent_confirmed=True,
                order=7 - index,
            )
            CaseStudy.objects.filter(pk=case.pk).update(created_at=created_at - timedelta(days=index))
            for kind in (CaseStudyImage.Kind.BEFORE, CaseStudyImage.Kind.AFTER):
                CaseStudyImage.objects.create(
                    case=case, kind=kind, checksum=f"{index}{kind}".ljust(64, "x"),
                    image=f"case-studies/{index}-{kind}.png",
                )

        response = APIClient().get("/api/public/case-studies/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 7)
        self.assertEqual([case["slug"] for case in response.data],
                         [f"published-{index}" for index in range(6, -1, -1)])

    def test_clinical_images_and_treatment_details_are_returned_for_their_case_only(self):
        other = CaseStudy.objects.create(
            slug="other-case", title="Other case", description="Other description",
            treatment_details="Other treatment notes", status=CaseStudy.Status.PUBLISHED,
            clinic_verified=True, consent_confirmed=True,
        )
        self.case.status = CaseStudy.Status.PUBLISHED
        self.case.clinic_verified = True
        self.case.consent_confirmed = True
        self.case.save()
        for case in (self.case, other):
            for kind in (CaseStudyImage.Kind.BEFORE, CaseStudyImage.Kind.AFTER):
                CaseStudyImage.objects.create(
                    case=case, kind=kind, checksum=f"{case.pk}{kind}".ljust(64, "x"),
                    image=f"case-studies/{case.pk}-{kind}.png",
                )

        updated = self.client.patch(
            f"/api/admin/case-studies/{self.case.pk}/",
            {"treatment_details": "Case one treatment notes"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)

        for case, color_offset in ((self.case, 10), (other, 20)):
            for kind_index, kind in enumerate((CaseStudyImage.Kind.XRAY, CaseStudyImage.Kind.SURGERY)):
                for image_index in range(2):
                    response = self.client.post(
                        "/api/admin/case-study-images/",
                        {
                            "case": case.pk,
                            "kind": kind,
                            "image": upload(
                                f"{case.pk}-{kind}-{image_index}.png",
                                png_bytes((60, 40), (color_offset + kind_index, image_index + 1, 3)),
                            ),
                        },
                        format="multipart",
                    )
                    self.assertEqual(response.status_code, 201, response.data)

        public = APIClient().get("/api/public/case-studies/")
        self.assertEqual(public.status_code, 200)
        cases_by_slug = {case["slug"]: case for case in public.data}
        first = cases_by_slug["c1"]
        second = cases_by_slug["other-case"]
        self.assertEqual(first["treatment_details"], "Case one treatment notes")
        self.assertEqual(second["treatment_details"], "Other treatment notes")
        self.assertEqual(
            [image["kind"] for image in first["images"]].count("xray"),
            2,
        )
        self.assertEqual(
            [image["kind"] for image in first["images"]].count("surgery"),
            2,
        )
        self.assertTrue(all(
            f"{other.pk}-" not in image["url"]
            for image in first["images"] if image["kind"] in {"xray", "surgery"}
        ))

    def test_xray_and_surgery_images_can_be_reordered_only_within_their_case_group(self):
        image_ids = []
        for index in range(3):
            image = CaseStudyImage.objects.create(
                case=self.case,
                kind=CaseStudyImage.Kind.XRAY,
                checksum=f"xray-{index}".ljust(64, "x"),
                image=f"case-studies/xray-{index}.png",
                order=index + 1,
            )
            image_ids.append(image.pk)

        reordered = self.client.post(
            "/api/admin/case-study-images/reorder/",
            {"case": self.case.pk, "kind": CaseStudyImage.Kind.XRAY, "ids": image_ids[::-1]},
            format="json",
        )
        self.assertEqual(reordered.status_code, 200, reordered.data)
        self.assertEqual([image["id"] for image in reordered.data], image_ids[::-1])
        self.assertEqual(
            list(CaseStudyImage.objects.filter(case=self.case, kind=CaseStudyImage.Kind.XRAY)
                 .order_by("order").values_list("id", flat=True)),
            image_ids[::-1],
        )

        invalid = self.client.post(
            "/api/admin/case-study-images/reorder/",
            {"case": self.case.pk, "kind": CaseStudyImage.Kind.XRAY, "ids": image_ids[:2]},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_composite_only_case_cannot_be_published(self):
        self.client.patch(f"/api/admin/case-studies/{self.case.pk}/",
                          {"clinic_verified": True, "consent_confirmed": True}, format="json")
        response = self.client.post(f"/api/admin/case-studies/{self.case.pk}/publish/")
        self.assertEqual(response.status_code, 400)
        self.assertIn("Add both a before image and an after image.", response.data["blockers"])

    def test_public_endpoint_excludes_legacy_composite_only_cases(self):
        CaseStudy.objects.filter(pk=self.case.pk).update(
            status=CaseStudy.Status.PUBLISHED, clinic_verified=True, consent_confirmed=True)
        response = APIClient().get("/api/public/case-studies/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_cannot_remove_consent_while_published(self):
        self._add_comparison_pair()
        self.client.patch(f"/api/admin/case-studies/{self.case.pk}/",
                          {"clinic_verified": True, "consent_confirmed": True}, format="json")
        self.client.post(f"/api/admin/case-studies/{self.case.pk}/publish/")
        r = self.client.patch(f"/api/admin/case-studies/{self.case.pk}/",
                              {"consent_confirmed": False}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_published_case_cannot_delete_either_comparison_image(self):
        self._add_comparison_pair()
        self.client.patch(f"/api/admin/case-studies/{self.case.pk}/",
                          {"clinic_verified": True, "consent_confirmed": True}, format="json")
        self.assertEqual(self.client.post(f"/api/admin/case-studies/{self.case.pk}/publish/").status_code, 200)
        before = self.case.images.get(kind="before")
        response = self.client.delete(f"/api/admin/case-study-images/{before.pk}/")
        self.assertEqual(response.status_code, 400)

    def test_before_and_after_upload_replace_and_delete_independently(self):
        from django.core.files.storage import default_storage

        before = self.client.post(
            "/api/admin/case-study-images/",
            {"case": self.case.pk, "kind": "before", "image": upload("before.png", png_bytes((60, 40), (1, 2, 3)))},
            format="multipart",
        )
        after = self.client.post(
            "/api/admin/case-study-images/",
            {"case": self.case.pk, "kind": "after", "image": upload("after.png", png_bytes((60, 40), (3, 2, 1)))},
            format="multipart",
        )
        self.assertEqual(before.status_code, 201, before.data)
        self.assertEqual(after.status_code, 201, after.data)
        before_image = CaseStudyImage.objects.get(pk=before.data["id"])
        original_path = before_image.image.name
        replaced = self.client.patch(
            f"/api/admin/case-study-images/{before_image.pk}/",
            {"image": upload("before-replaced.png", png_bytes((70, 50), (4, 5, 6)))},
            format="multipart",
        )
        self.assertEqual(replaced.status_code, 200, replaced.data)
        self.assertFalse(default_storage.exists(original_path))
        self.assertEqual(replaced.data["kind"], "before")
        self.assertEqual((replaced.data["width"], replaced.data["height"]), (70, 50))
        self.assertEqual(self.client.delete(f"/api/admin/case-study-images/{before_image.pk}/").status_code, 204)
        self.assertTrue(CaseStudyImage.objects.filter(pk=after.data["id"], kind="after").exists())

    def test_only_one_before_and_one_after_per_case(self):
        from django.db import IntegrityError, transaction
        CaseStudyImage.objects.create(case=self.case, kind="before", checksum="b" * 64, image="case-studies/b.png")
        with self.assertRaises(IntegrityError), transaction.atomic():
            CaseStudyImage.objects.create(case=self.case, kind="before", checksum="c" * 64, image="case-studies/c.png")
        CaseStudyImage.objects.create(case=self.case, kind="process", checksum="p" * 64, image="case-studies/p.png")
        with self.assertRaises(IntegrityError), transaction.atomic():
            CaseStudyImage.objects.create(case=self.case, kind="process", checksum="q" * 64, image="case-studies/q.png")

    def test_slug_is_generated_and_made_unique(self):
        r1 = self.client.post("/api/admin/case-studies/", {"title": "Smile Study"}, format="json")
        r2 = self.client.post("/api/admin/case-studies/", {"title": "Smile Study"}, format="json")
        self.assertEqual(r1.data["slug"], "smile-study")
        self.assertEqual(r2.data["slug"], "smile-study-2")

    def test_new_cases_append_in_upload_order_and_edits_preserve_position(self):
        created = [
            self.client.post("/api/admin/case-studies/", {"title": f"Uploaded {index}"}, format="json")
            for index in range(1, 4)
        ]
        self.assertTrue(all(response.status_code == 201 for response in created))
        uploaded_ids = [response.data["id"] for response in created]
        self.assertEqual([response.data["order"] for response in created], [1, 2, 3])

        updated = self.client.patch(
            f"/api/admin/case-studies/{uploaded_ids[0]}/",
            {"title": "Edited first upload"},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(updated.data["order"], 1)

        first_read = self.client.get("/api/admin/case-studies/")
        second_read = self.client.get("/api/admin/case-studies/")
        expected_ids = [self.case.pk, *uploaded_ids]
        self.assertEqual([case["id"] for case in first_read.data], expected_ids)
        self.assertEqual([case["id"] for case in second_read.data], expected_ids)


class CaseStudyDeletionTests(IsolatedMediaMixin, TestCase):
    def test_deleting_a_case_removes_its_image_files(self):
        from django.core.files.storage import default_storage
        client = APIClient()
        client.force_authenticate(make_user("ed5", role="Editors"))
        case = client.post("/api/admin/case-studies/", {"title": "To delete"}, format="json").data
        added = client.post("/api/admin/case-study-images/",
                            {"case": case["id"], "kind": "composite", "image": upload("c.png", png_bytes((50, 40), (7, 7, 7)))},
                            format="multipart")
        self.assertEqual(added.status_code, 201, added.data)
        stored = CaseStudyImage.objects.get(pk=added.data["id"]).image.name
        self.assertTrue(default_storage.exists(stored))
        self.assertEqual(client.delete(f"/api/admin/case-studies/{case['id']}/").status_code, 204)
        self.assertFalse(default_storage.exists(stored))
