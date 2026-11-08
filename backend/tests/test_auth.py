from django.conf import settings
from django.test import TestCase
from rest_framework.test import APIClient

from tests.helpers import IsolatedMediaMixin, make_user


class AuthTests(IsolatedMediaMixin, TestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.admin = make_user("owner", superuser=True)
        self.viewer = make_user("viewer1", role="Viewers")
        self.editor = make_user("editor1", role="Editors")
        self.stranger = make_user("nobody")

    def test_login_returns_access_token_and_httponly_refresh_cookie(self):
        r = self.client.post("/api/auth/login/", {"username": "owner", "password": "Strong-pass-123"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        self.assertEqual(r.data["user"]["role"], "admin")
        cookie = r.cookies[settings.REFRESH_COOKIE_NAME]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Strict")
        self.assertEqual(cookie["path"], settings.REFRESH_COOKIE_PATH)

    def test_wrong_password_and_roleless_users_are_refused_with_same_message(self):
        bad = self.client.post("/api/auth/login/", {"username": "owner", "password": "wrong"}, format="json")
        none = self.client.post("/api/auth/login/", {"username": "nobody", "password": "Strong-pass-123"}, format="json")
        self.assertEqual(bad.status_code, 401)
        self.assertEqual(none.status_code, 401)
        self.assertEqual(bad.data["detail"], none.data["detail"])

    def test_refresh_rotates_and_old_cookie_cannot_be_reused(self):
        login = self.client.post("/api/auth/login/", {"username": "owner", "password": "Strong-pass-123"}, format="json")
        old_refresh = login.cookies[settings.REFRESH_COOKIE_NAME].value
        first = self.client.post("/api/auth/refresh/")
        self.assertEqual(first.status_code, 200)
        self.assertIn("access", first.data)
        # Replay the original refresh token: it must be rejected after rotation.
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = old_refresh
        replay = self.client.post("/api/auth/refresh/")
        self.assertEqual(replay.status_code, 401)

    def test_logout_blacklists_refresh_token(self):
        login = self.client.post("/api/auth/login/", {"username": "owner", "password": "Strong-pass-123"}, format="json")
        token = login.cookies[settings.REFRESH_COOKIE_NAME].value
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = token
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)
        self.client.cookies[settings.REFRESH_COOKIE_NAME] = token
        self.assertEqual(self.client.post("/api/auth/refresh/").status_code, 401)

    def test_admin_endpoints_require_authentication(self):
        self.assertEqual(self.client.get("/api/admin/hero-images/").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/case-studies/").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/gallery-images/").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/testimonials/").status_code, 401)

    def test_roleless_user_cannot_use_admin_api(self):
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get("/api/admin/hero-images/").status_code, 403)

    def test_viewer_is_read_only_and_editor_can_write(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get("/api/admin/hero-images/").status_code, 200)
        denied = self.client.post("/api/admin/case-studies/", {"title": "x"}, format="json")
        self.assertEqual(denied.status_code, 403)
        self.client.force_authenticate(self.editor)
        allowed = self.client.post("/api/admin/case-studies/", {"title": "Test case"}, format="json")
        self.assertEqual(allowed.status_code, 201)

    def test_change_password_requires_current_password(self):
        self.client.force_authenticate(self.editor)
        bad = self.client.post("/api/auth/change-password/",
                               {"current_password": "nope", "new_password": "Another-strong-9"}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("current_password", bad.data.get("errors", {}))
