import { useState } from "react";
import { admin, formWith } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync, useDragReorder } from "../hooks";
import {
  Badge, ConfirmDialog, EmptyState, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast,
} from "../ui";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function GalleryManager() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const { data, error, loading, setData, reload } = useAsync(() => admin.get("/admin/gallery-images/"), []);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const items = data || [];

  const commitOrder = async (ids, previous) => {
    try {
      setData(await admin.post("/admin/gallery-images/reorder/", { ids }));
      toast("Gallery order saved.");
    } catch (err) {
      setData(previous);
      toast(errorText(err), "error");
    }
  };
  const drag = useDragReorder(items, {
    onChange: setData,
    commit: (ids) => commitOrder(ids, items),
  });

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await admin.upload("POST", "/admin/gallery-images/", formWith({ image: file, alt_text: "" }));
      toast("Gallery image added.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (item, body, message) => {
    try {
      const updated = await admin.patch(`/admin/gallery-images/${item.id}/`, body);
      setData((list) => list.map((image) => (image.id === item.id ? { ...image, ...updated } : image)));
      if (message) toast(message);
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const replace = async (item, image) => {
    setBusy(true);
    try {
      await admin.upload("PATCH", `/admin/gallery-images/${item.id}/`, formWith({ image }));
      toast("Gallery image replaced.");
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
      await admin.del(`/admin/gallery-images/${item.id}/`);
      toast("Gallery image deleted.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <>
      <PageHeader title="Gallery images" description="Manage the images shown in the public website gallery."
        actions={canEdit && (
          <label className={`adm-btn adm-btn-gold adm-btn-file${busy ? " is-disabled" : ""}`}>
            Add image
            <input type="file" accept={ACCEPT} disabled={busy} onChange={upload} />
          </label>
        )} />
      <ErrorBanner error={error && { message: errorText(error) }} />
      <Notice tone="info">JPEG, PNG and WEBP images are validated before they are stored. Drag images to reorder them.</Notice>
      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title="No gallery images yet">Add an image to start the public gallery.</EmptyState>
      ) : (
        <div className="adm-tiles" aria-label="Gallery images">
          {items.map((item, index) => (
            <article key={item.id} className={`adm-tile${drag.dragId === item.id ? " is-dragging" : ""}${drag.overId === item.id ? " is-over" : ""}`}
              {...(canEdit ? drag.bind(item.id) : {})}>
              <div className="adm-tile-media">
                <img src={item.image_url} alt={item.alt_text || `Gallery image ${index + 1}`} loading="lazy" />
                <span className="adm-handle" aria-hidden="true">⠿ {index + 1}</span>
                {!item.is_active && <span className="adm-tile-off">Hidden</span>}
              </div>
              <div className="adm-tile-body">
                <div className="adm-tile-meta">
                  <span>{item.width} × {item.height}px</span>
                  {!item.is_active && <Badge>Hidden</Badge>}
                </div>
                <Field label="Alt text" id={`gallery-alt-${item.id}`}>
                  <input id={`gallery-alt-${item.id}`} type="text" defaultValue={item.alt_text} disabled={!canEdit}
                    onBlur={(event) => event.target.value !== item.alt_text && patch(item, { alt_text: event.target.value }, "Alt text saved.")} />
                </Field>
                {canEdit && (
                  <div className="adm-actions">
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === 0}
                      onClick={() => drag.moveBy(item.id, -1)} aria-label={`Move gallery image ${index + 1} earlier`}>↑</button>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === items.length - 1}
                      onClick={() => drag.moveBy(item.id, 1)} aria-label={`Move gallery image ${index + 1} later`}>↓</button>
                    <label className="adm-check">
                      <input type="checkbox" checked={item.is_active}
                        onChange={(event) => patch(item, { is_active: event.target.checked }, event.target.checked ? "Image shown on the website." : "Image hidden from the website.")} />
                      Show
                    </label>
                    <label className="adm-btn adm-btn-ghost adm-btn-small adm-btn-file">Replace
                      <input type="file" accept={ACCEPT} disabled={busy}
                        onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; file && replace(item, file); }} />
                    </label>
                    <button type="button" className="adm-btn adm-btn-danger adm-btn-small" onClick={() => setConfirm(item)}>Delete</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Delete this gallery image?"
        message="It will be removed from the public gallery and deleted from storage."
        confirmLabel="Delete image" onConfirm={remove} onCancel={() => setConfirm(null)} />
    </>
  );
}
