import { useState } from "react";
import { admin } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync, moveItem } from "../hooks";
import {
  Badge, ConfirmDialog, EmptyState, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast,
} from "../ui";

export default function TestimonialsManager() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const { data, error, loading, setData, reload } = useAsync(() => admin.get("/admin/testimonials/"), []);
  const [drafts, setDrafts] = useState({});
  const [newTestimonial, setNewTestimonial] = useState({ display_name: "", quote: "" });
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const items = data || [];

  const updateDraft = (item, key, value) => {
    setDrafts((all) => ({ ...all, [item.id]: { ...all[item.id], [key]: value } }));
  };

  const save = async (item) => {
    const body = { ...item, ...drafts[item.id] };
    setBusyId(item.id);
    try {
      const updated = await admin.patch(`/admin/testimonials/${item.id}/`, {
        display_name: body.display_name,
        quote: body.quote,
        consent_confirmed: body.consent_confirmed,
        clinic_verified: body.clinic_verified,
      });
      setData((list) => list.map((row) => (row.id === item.id ? updated : row)));
      setDrafts((all) => { const next = { ...all }; delete next[item.id]; return next; });
      toast("Testimonial saved.");
      return updated;
    } catch (err) {
      toast(errorText(err), "error");
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const create = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      await admin.post("/admin/testimonials/", newTestimonial);
      setNewTestimonial({ display_name: "", quote: "" });
      toast("Testimonial draft created.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setCreating(false);
    }
  };

  const publish = async (item) => {
    const saved = await save(item);
    if (!saved) return;
    setBusyId(item.id);
    try {
      const published = await admin.post(`/admin/testimonials/${item.id}/publish/`);
      setData((list) => list.map((row) => (row.id === item.id ? published : row)));
      toast("Testimonial published on the website.");
    } catch (err) {
      toast(err.data?.blockers?.join(" ") || errorText(err), "error");
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const unpublish = async (item) => {
    setBusyId(item.id);
    try {
      const updated = await admin.post(`/admin/testimonials/${item.id}/unpublish/`);
      setData((list) => list.map((row) => (row.id === item.id ? updated : row)));
      toast("Testimonial unpublished.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusyId(null);
    }
  };

  const reorder = async (item, delta) => {
    const target = items[items.findIndex((row) => row.id === item.id) + delta];
    if (!target) return;
    const next = moveItem(items, item.id, target.id);
    if (!next) return;
    setData(next);
    try {
      setData(await admin.post("/admin/testimonials/reorder/", { ids: next.map((row) => row.id) }));
      toast("Testimonial order saved.");
    } catch (err) {
      setData(items);
      toast(errorText(err), "error");
    }
  };

  const remove = async () => {
    const item = confirm;
    setConfirm(null);
    try {
      await admin.del(`/admin/testimonials/${item.id}/`);
      toast("Testimonial deleted.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <>
      <PageHeader title="Testimonials" description="Only consented and clinic-verified feedback can appear on the public website." />
      <ErrorBanner error={error && { message: errorText(error) }} />
      <Notice tone="warn">Do not enter patient-identifying details without explicit written permission. Publishing requires consent and clinic verification.</Notice>
      {canEdit && (
        <form className="adm-card" onSubmit={create}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Add a testimonial</h2>
          <div className="adm-form-grid">
            <Field label="Display name" id="testimonial-new-name" hint="Use an approved display name or an anonymous label.">
              <input id="testimonial-new-name" type="text" maxLength={120} required value={newTestimonial.display_name}
                onChange={(event) => setNewTestimonial({ ...newTestimonial, display_name: event.target.value })} />
            </Field>
            <Field label="Approved feedback" id="testimonial-new-quote">
              <textarea id="testimonial-new-quote" maxLength={2000} required value={newTestimonial.quote}
                onChange={(event) => setNewTestimonial({ ...newTestimonial, quote: event.target.value })} />
            </Field>
          </div>
          <button type="submit" className="adm-btn adm-btn-gold" disabled={creating || !newTestimonial.display_name.trim() || !newTestimonial.quote.trim()}>
            {creating ? "Creating…" : "Create draft"}
          </button>
        </form>
      )}
      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title="No testimonials yet">Create a draft above when the clinic has approved feedback to publish.</EmptyState>
      ) : (
        <div>
          {items.map((item, index) => {
            const current = { ...item, ...drafts[item.id] };
            const busy = busyId === item.id;
            return (
              <article className="adm-card" key={item.id}>
                <div className="adm-card-head">
                  <h2>{current.display_name || "Untitled testimonial"}</h2>
                  {item.is_published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}
                </div>
                <div className="adm-form-grid">
                  <Field label="Display name" id={`testimonial-name-${item.id}`}>
                    <input id={`testimonial-name-${item.id}`} type="text" maxLength={120} disabled={!canEdit}
                      value={current.display_name} onChange={(event) => updateDraft(item, "display_name", event.target.value)} />
                  </Field>
                  <Field label="Approved feedback" id={`testimonial-quote-${item.id}`}>
                    <textarea id={`testimonial-quote-${item.id}`} maxLength={2000} disabled={!canEdit}
                      value={current.quote} onChange={(event) => updateDraft(item, "quote", event.target.value)} />
                  </Field>
                </div>
                <div className="adm-actions" style={{ flexDirection: "column", alignItems: "flex-start", margin: "1rem 0" }}>
                  <label className="adm-check">
                    <input type="checkbox" checked={current.consent_confirmed} disabled={!canEdit}
                      onChange={(event) => updateDraft(item, "consent_confirmed", event.target.checked)} />
                    Written patient consent is on file for publishing this feedback.
                  </label>
                  <label className="adm-check">
                    <input type="checkbox" checked={current.clinic_verified} disabled={!canEdit}
                      onChange={(event) => updateDraft(item, "clinic_verified", event.target.checked)} />
                    The clinic has verified the testimonial.
                  </label>
                </div>
                {current.publish_blockers?.length > 0 && !item.is_published && (
                  <p className="adm-hint">{current.publish_blockers.join(" ")}</p>
                )}
                {canEdit && (
                  <div className="adm-actions" style={{ marginTop: ".8rem" }}>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === 0 || busy}
                      onClick={() => reorder(item, -1)} aria-label={`Move ${item.display_name} earlier`}>↑</button>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === items.length - 1 || busy}
                      onClick={() => reorder(item, 1)} aria-label={`Move ${item.display_name} later`}>↓</button>
                    <button type="button" className="adm-btn adm-btn-ghost" disabled={busy || !drafts[item.id]}
                      onClick={() => save(item)}>{busy ? "Saving…" : "Save changes"}</button>
                    {item.is_published ? (
                      <button type="button" className="adm-btn adm-btn-ghost" disabled={busy} onClick={() => unpublish(item)}>Unpublish</button>
                    ) : (
                      <button type="button" className="adm-btn adm-btn-gold" disabled={busy} onClick={() => publish(item)}>Save and publish</button>
                    )}
                    <button type="button" className="adm-btn adm-btn-danger adm-btn-small" disabled={busy}
                      onClick={() => setConfirm(item)}>Delete</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Delete this testimonial?"
        message="The testimonial will be deleted permanently and removed from the public website."
        confirmLabel="Delete testimonial" onConfirm={remove} onCancel={() => setConfirm(null)} />
    </>
  );
}
