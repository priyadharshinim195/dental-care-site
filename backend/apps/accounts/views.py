"""JWT auth. The access token is returned in JSON and kept in memory by the SPA.
The refresh token lives only in an HttpOnly, SameSite=Strict cookie scoped to /api/auth/,
so JavaScript can never read it. Refresh tokens rotate and old ones are blacklisted."""
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.permissions import HasStaffRole
from apps.accounts.roles import get_role
from apps.accounts.serializers import ChangePasswordSerializer, CurrentUserSerializer

User = get_user_model()
INVALID = "Invalid username or password."


def _set_refresh_cookie(response, token):
    lifetime = settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"]
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(token),
        max_age=int(lifetime.total_seconds()),
        httponly=True,
        secure=settings.SECURE_COOKIES,
        samesite="Strict",
        path=settings.REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path=settings.REFRESH_COOKIE_PATH, samesite="Strict")


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))
        if not username or not password:
            return Response({"detail": "Enter your username and password."}, status=400)
        user = authenticate(request, username=username, password=password)
        if user is None or get_role(user) is None:
            return Response({"detail": INVALID}, status=401)
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token), "user": CurrentUserSerializer(user).data})
        _set_refresh_cookie(response, refresh)
        return response


class RefreshView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "refresh"

    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not raw:
            return Response({"detail": "Your session has ended. Please sign in again."}, status=401)
        try:
            token = RefreshToken(raw)
        except TokenError:
            response = Response({"detail": "Your session has ended. Please sign in again."}, status=401)
            _clear_refresh_cookie(response)
            return response
        if BlacklistedToken.objects.filter(token__jti=token["jti"]).exists():
            response = Response({"detail": "Your session has ended. Please sign in again."}, status=401)
            _clear_refresh_cookie(response)
            return response
        user = User.objects.filter(id=token["user_id"]).first()
        if user is None or get_role(user) is None:
            response = Response({"detail": "Your session has ended. Please sign in again."}, status=401)
            _clear_refresh_cookie(response)
            return response
        try:
            token.blacklist()  # rotation: the presented token can never be used again
        except TokenError:
            pass
        new_refresh = RefreshToken.for_user(user)
        response = Response({"access": str(new_refresh.access_token), "user": CurrentUserSerializer(user).data})
        _set_refresh_cookie(response, new_refresh)
        return response


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if raw:
            try:
                RefreshToken(raw).blacklist()
            except TokenError:
                pass
        response = Response(status=status.HTTP_204_NO_CONTENT)
        _clear_refresh_cookie(response)
        return response


class MeView(APIView):
    permission_classes = [IsAuthenticated, HasStaffRole]

    def get(self, request):
        return Response(CurrentUserSerializer(request.user).data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated, HasStaffRole]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        # Sign out every other session: blacklist all outstanding refresh tokens for this user.
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)
        response = Response({"detail": "Password updated. Please sign in again on other devices."})
        _clear_refresh_cookie(response)
        return response
