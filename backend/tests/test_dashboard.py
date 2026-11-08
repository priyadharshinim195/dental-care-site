from django.test import TestCase
from rest_framework.test import APIClient

from apps.case_studies.models import CaseStudy
from apps.dashboard.models import ActivityLog
from tests.helpers import IsolatedMediaMixin, make_user


class ClearActivityTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_user("dashboard-admin", superuser=True)
        self.editor = make_user("dashboard-editor", role="Editors")
        self.viewer = make_user("dashboard-viewer", role="Viewers")
        self.activity = ActivityLog.objects.create(
            actor_name="Clinic admin",
            action="updated",
            entity="case study",
            summary="Updated case details",
        )
        self.case = CaseStudy.objects.create(slug="preserve-this-case", title="Preserved case")

    def test_only_admin_can_clear_recent_activities(self):
        response = self.client.delete("/api/admin/activity/clear/")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(ActivityLog.objects.count(), 1)

        for user in (self.editor, self.viewer):
            self.client.force_authenticate(user)
            response = self.client.delete("/api/admin/activity/clear/")
            self.assertEqual(response.status_code, 403)
            self.assertEqual(ActivityLog.objects.count(), 1)

    def test_admin_clears_only_activity_log_records(self):
        self.client.force_authenticate(self.admin)

        response = self.client.delete("/api/admin/activity/clear/")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(ActivityLog.objects.count(), 0)
        self.assertTrue(CaseStudy.objects.filter(pk=self.case.pk).exists())
        activities = self.client.get("/api/admin/activity/")
        self.assertEqual(activities.status_code, 200)
        self.assertEqual(activities.data["results"], [])
