from apps.dashboard.models import ActivityLog


def log_activity(user, action, entity, summary):
    """Record an audit entry. Never raises: auditing must not break the request."""
    try:
        name = ""
        actor = None
        if user is not None and getattr(user, "is_authenticated", False):
            actor = user
            name = user.get_username()
        ActivityLog.objects.create(actor=actor, actor_name=name, action=action,
                                   entity=entity, summary=summary[:255])
    except Exception:  # noqa: BLE001
        pass
