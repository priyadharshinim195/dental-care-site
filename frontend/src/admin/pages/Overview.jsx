import { useState } from "react";
import { Link } from "react-router-dom";
import { admin } from "../../lib/api";
import { useAuth } from "../auth";
import { useAsync } from "../hooks";
import { Card, ConfirmDialog, EmptyState, ErrorBanner, Loading, Notice, PageHeader, errorText, useToast } from "../ui";

const CONTACT_LABELS = {
  address: "Clinic address", phone: "Phone and WhatsApp number", email: "Email", hours: "Opening hours",
};

export default function Overview() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, error, loading, setData } = useAsync(() => admin.get("/admin/dashboard/overview/"), []);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const clearActivities = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      await admin.del("/admin/activity/clear/");
      setData((current) => ({ ...current, recent_activity: [] }));
      setConfirmClear(false);
      toast("Recent activities cleared.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setClearing(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={{ message: errorText(error) }} />;

  const heroCount = data.hero_images.active;
  return (
    <>
      <PageHeader title="Overview" description="Everything you manage for the public website, at a glance." />

      <div className="adm-stats">
        <Stat value={data.case_studies.published} label={`Published case studies (${data.case_studies.draft} draft)`} />
        <Stat value={`${heroCount} / ${data.hero_images.max}`} label="Active hero slideshow images" />
        <Stat value={data.media.total} label={`Media files (${data.media.images} images, ${data.media.videos} videos)`} />
        <Stat value={data.content_items} label="Editable website text items" />
      </div>

      {heroCount < 5 && (
        <Notice tone="warn">
          The slideshow works best with 5 to 6 images. It currently has {heroCount}.{" "}
          <Link to="/hero-images">Manage hero images</Link>
        </Notice>
      )}
      {data.contact_fields_missing.length > 0 && (
        <Notice tone="warn">
          Not yet provided: {data.contact_fields_missing.map((f) => CONTACT_LABELS[f] || f).join(", ")}.
          Those contact links stay disabled on the website until they are added in{" "}
          <Link to="/website-content">Website content</Link>.
        </Notice>
      )}
      {data.case_studies.published === 0 && (
        <Notice tone="info">
          No before-and-after case study is published. Upload separate Before and After images and confirm written patient consent and clinic verification before publishing.
        </Notice>
      )}

      <div className="adm-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Card title="Recent Activities" actions={user?.role === "admin" && (
          <button type="button" className="adm-btn adm-btn-gold" onClick={() => setConfirmClear(true)}>
            Clear All
          </button>
        )}>
          {data.recent_activity.length === 0 ? (
            <EmptyState title="No recent activities." />
          ) : (
            <ul className="adm-list">
              {data.recent_activity.map((item) => (
                <li key={item.id}>
                  <span><strong>{item.actor_name || "System"}</strong> {item.action} {item.entity.toLowerCase()}: {item.summary}</span>
                  <span className="adm-muted" style={{ whiteSpace: "nowrap" }}>{new Date(item.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Quick actions">
          <div className="adm-actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
            <Link className="adm-btn adm-btn-ghost" to="/hero-images">Update the slideshow</Link>
            <Link className="adm-btn adm-btn-ghost" to="/case-studies">Review case studies</Link>
            <Link className="adm-btn adm-btn-ghost" to="/branding">Update the logo</Link>
            <Link className="adm-btn adm-btn-ghost" to="/website-content">Edit website content and contact details</Link>
          </div>
        </Card>
      </div>
      <ConfirmDialog
        open={confirmClear}
        title="Clear all recent activities?"
        message="Are you sure you want to clear all recent activities?"
        confirmLabel={clearing ? "Clearing…" : "Clear All"}
        confirmDisabled={clearing}
        cancelDisabled={clearing}
        onConfirm={clearActivities}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

function Stat({ value, label }) {
  return (
    <div className="adm-stat">
      <div className="adm-stat-value">{value}</div>
      <div className="adm-stat-label">{label}</div>
    </div>
  );
}
