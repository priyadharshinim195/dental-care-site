from rest_framework import serializers


class DefaultTrueBoolean(serializers.BooleanField):
    """Treat omitted multipart checkboxes as true to match model defaults."""
    default_empty_html = True
