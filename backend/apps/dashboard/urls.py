from django.urls import path

from apps.dashboard import views

urlpatterns = [
    path("dashboard/overview/", views.OverviewView.as_view(), name="dashboard-overview"),
    path("activity/", views.ActivityListView.as_view(), name="dashboard-activity"),
    path("activity/clear/", views.ClearActivityView.as_view(), name="dashboard-activity-clear"),
]
