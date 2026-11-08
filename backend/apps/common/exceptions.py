from rest_framework.views import exception_handler


def api_exception_handler(exc, context):
    """Keep every API error in one shape: {"detail": ..., "errors": {...}} where relevant."""
    response = exception_handler(exc, context)
    if response is None:
        return None
    data = response.data
    if isinstance(data, list):
        response.data = {"detail": " ".join(str(item) for item in data)}
    elif isinstance(data, dict) and "detail" not in data:
        response.data = {"detail": "Please correct the highlighted fields.", "errors": data}
    return response
