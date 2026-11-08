import { useState } from "react";
import { admin, formWith } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync, useDragReorder } from "../hooks";
import {
  ConfirmDialog, EmptyState, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast,
} from "../ui";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function ServicesManager() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const { data, error, loading, setData, reload } = useAsync(() => admin.get("/admin/services/"), []);
  const [drafts, setDrafts] = useState({});
  const [newService, setNewService] = useState({ title: "", description: "", image_alt: "" });
  const [newImage, setNewImage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const items = data || [];

  const commitOrder = async (ids, previous) => {
    try {
      setData(await admin.post("/admin/services/reorder/", { ids }));
      toast("Service order saved.");
    } catch (err) {
      setData(previous);
      toast(errorText(err), "error");
    }
  };
  const drag = useDragReorder(items, {
    onChange: setData,
    commit: (ids) => commitOrder(ids, items),
  });

  const create = async (event) => {
    event.preventDefault();
    if (!newImage) return;
    setBusy(true);
    try {
      await admin.upload("POST", "/admin/services/", formWith({ ...newService, image: newImage }));
      setNewService({ title: "", description: "", image_alt: "" });
      setNewImage(null);
      toast("Service added.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (item, body, message, clearDraft = true) => {
    try {
      const updated = await admin.patch(`/admin/services/${item.id}/`, body);
      setData((list) => list.map((service) => service.id === item.id ? updated : service));
      if (clearDraft) {
        setDrafts((all) => { const next = { ...all }; delete next[item.id]; return next; });
      }
      if (message) toast(message);
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const replaceImage = async (item, image) => {
    setBusy(true);
    try {
      await admin.upload("PATCH", `/admin/services/${item.id}/`, formWith({ image }));
      toast("Service image replaced.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const item = confirm;
    setConfirm(null);
    try {
      await admin.del(`/admin/services/${item.id}/`);
      toast("Service deleted.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <>
      <PageHeader title="Services" description="Manage service descriptions, images, visibility, and public display order." />
      <ErrorBanner error={error && { message: errorText(error) }} />
      <Notice tone="info">Service images are validated and saved with their service record. Drag or use the arrow buttons to reorder.</Notice>
      {canEdit && (
        <form className="adm-card" onSubmit={create}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Add a service</h2>
          <div className="adm-form-grid">
            <Field label="Service name" id="new-service-title">
              <input id="new-service-title" required maxLength={160} value={newService.title}
                onChange={(event) => setNewService({ ...newService, title: event.target.value })} />
            </Field>
            <Field label="Description" id="new-service-description">
              <textarea id="new-service-description" maxLength={1000} value={newService.description}
                onChange={(event) => setNewService({ ...newService, description: event.target.value })} />
            </Field>
            <Field label="Image alternative text" id="new-service-alt">
              <input id="new-service-alt" maxLength={200} value={newService.image_alt}
                onChange={(event) => setNewService({ ...newService, image_alt: event.target.value })} />
            </Field>
            <Field label="Service image" id="new-service-image">
              <input id="new-service-image" type="file" accept={ACCEPT} required disabled={busy}
                onChange={(event) => setNewImage(event.target.files?.[0] || null)} />
            </Field>
          </div>
          <button type="submit" className="adm-btn adm-btn-gold" disabled={busy || !newService.title.trim() || !newImage}>
            {busy ? "Saving…" : "Add service"}
          </button>
        </form>
      )}
      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title="No services yet">Add the services offered by the clinic.</EmptyState>
      ) : (
        <div className="adm-tiles" aria-label="Services">
          {items.map((item, index) => {
            const current = { ...item, ...drafts[item.id] };
            return (
              <article key={item.id} className={`adm-tile${drag.dragId === item.id ? " is-dragging" : ""}${drag.overId === item.id ? " is-over" : ""}`}
                {...(canEdit ? drag.bind(item.id) : {})}>
                <div className="adm-tile-media">
                  {item.image_url && <img src={item.image_url} alt={item.image_alt || item.title} loading="lazy" />}
                  <span className="adm-handle" aria-hidden="true">⠿ {index + 1}</span>
                  {!item.is_active && <span className="adm-tile-off">Hidden</span>}
                </div>
                <div className="adm-tile-body">
                  {canEdit ? (
                    <>
                      <Field label="Service name" id={`service-title-${item.id}`}>
                        <input id={`service-title-${item.id}`} maxLength={160} value={current.title}
                          onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...drafts[item.id], title: event.target.value } })} />
                      </Field>
                      <Field label="Description" id={`service-description-${item.id}`}>
                        <textarea id={`service-description-${item.id}`} maxLength={1000} value={current.description}
                          onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...drafts[item.id], description: event.target.value } })} />
                      </Field>
                      <Field label="Image alternative text" id={`service-alt-${item.id}`}>
                        <input id={`service-alt-${item.id}`} maxLength={200} value={current.image_alt}
                          onChange={(event) => setDrafts({ ...drafts, [item.id]: { ...drafts[item.id], image_alt: event.target.value } })} />
                      </Field>
                      <div className="adm-actions">
                        <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === 0}
                          onClick={() => drag.moveBy(item.id, -1)} aria-label={`Move ${item.title} earlier`}>↑</button>
                        <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === items.length - 1}
                          onClick={() => drag.moveBy(item.id, 1)} aria-label={`Move ${item.title} later`}>↓</button>
                        <label className="adm-check">
                          <input type="checkbox" checked={current.is_active}
                              onChange={(event) => patch(item, { is_active: event.target.checked }, "Service visibility saved.", false)} />
                          Show
                        </label>
                        <button type="button" className="adm-btn adm-btn-gold adm-btn-small"
                          disabled={busy || !drafts[item.id] || Object.keys(drafts[item.id]).length === 0}
                          onClick={() => patch(item, { title: current.title, description: current.description, image_alt: current.image_alt }, "Service saved.")}>
                          Save
                        </button>
                        <label className="adm-btn adm-btn-ghost adm-btn-small adm-btn-file">Replace image
                          <input type="file" accept={ACCEPT} disabled={busy}
                            onChange={(event) => { const image = event.target.files?.[0]; event.target.value = ""; if (image) replaceImage(item, image); }} />
                        </label>
                        <button type="button" className="adm-btn adm-btn-danger adm-btn-small" onClick={() => setConfirm(item)}>Delete</button>
                      </div>
                    </>
                  ) : (
                    <><strong>{item.title}</strong><p>{item.description}</p></>
                  )}
                  {item.image_width && <p className="adm-tile-meta">{item.image_width} × {item.image_height}px</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Delete this service?"
        message="It will be removed from the public website and its image will be deleted from storage."
        confirmLabel="Delete service" onConfirm={remove} onCancel={() => setConfirm(null)} />
    </>
  );
}
