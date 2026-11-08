import { useEffect, useRef, useState } from "react";
import { admin, formWith } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync, useDragReorder } from "../hooks";
import { Badge, ConfirmDialog, EmptyState, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast } from "../ui";

const ACCEPT = "image/jpeg,image/png,image/webp";

export default function HeroImages() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const { data, error, loading, setData, reload } = useAsync(() => admin.get("/admin/hero-images/"), []);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [maxImages, setMaxImages] = useState(6);
  const fileInput = useRef(null);

  const items = data || [];
  const activeItems = items.filter((item) => item.is_active);

  useEffect(() => {
    if (!previewOpen || activeItems.length < 2) return undefined;
    const timer = setInterval(() => setPreviewIndex((index) => (index + 1) % activeItems.length), 2500);
    return () => clearInterval(timer);
  }, [previewOpen, activeItems.length]);

  useEffect(() => {
    if (!previewOpen) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && setPreviewOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [previewOpen]);
  const commitOrder = async (ids, previous) => {
    try {
      const saved = await admin.post("/admin/hero-images/reorder/", { ids });
      setData(saved);
      toast("Slideshow order saved.");
    } catch (err) {
      setData(previous);
      toast(errorText(err), "error");
    }
  };

  const drag = useDragReorder(items, {
    onChange: (next) => setData(next),
    commit: (ids) => commitOrder(ids, items),
  });

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      await admin.upload("POST", "/admin/hero-images/", formWith({ image: file, alt_text: "" }));
      toast("Image added to the slideshow.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, body, message) => {
    try {
      const updated = await admin.patch(`/admin/hero-images/${id}/`, body);
      setData((list) => list.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      if (message) toast(message);
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const replaceFile = async (id, file) => {
    setBusy(true);
    try {
      await admin.upload("PATCH", `/admin/hero-images/${id}/`, formWith({ image: file }));
      toast("Image replaced.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const id = confirm.id;
    setConfirm(null);
    try {
      await admin.del(`/admin/hero-images/${id}/`);
      toast("Image removed from the slideshow.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const active = items.filter((i) => i.is_active).length;

  return (
    <>
      <PageHeader
        title="Hero images"
        description="The homepage slideshow. Images change automatically, in this order, and loop continuously."
        actions={(
          <>
            <button type="button" className="adm-btn adm-btn-ghost" disabled={!activeItems.length}
              onClick={() => { setPreviewIndex(0); setPreviewOpen(true); }}>Preview slideshow</button>
            {canEdit && (
              <label className={`adm-btn adm-btn-gold adm-btn-file${busy || items.length >= maxImages ? " is-disabled" : ""}`}>
                Add image
                <input ref={fileInput} type="file" accept={ACCEPT} disabled={busy || items.length >= maxImages} onChange={upload} />
              </label>
            )}
          </>
        )}
      />
      <ErrorBanner error={error && { message: errorText(error) }} />

      {items.length < 5 && !loading && (
        <Notice tone="warn">Add at least 5 images for the best slideshow. {items.length} currently {items.length === 1 ? "is" : "are"} uploaded.</Notice>
      )}
      <Notice tone="info">
        Use 1920 px wide or larger for full-screen clarity. You own the rights to every image you upload.
        Active: {active} of {items.length} (limit {maxImages}). Drag cards to reorder, or use the arrow buttons.
      </Notice>

      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title="No hero images yet">
          Add 5 to 6 images. Until then, the website shows its built-in slideshow.
        </EmptyState>
      ) : (
        <div className="adm-tiles" aria-label="Slideshow images">
          {items.map((item, index) => (
            <article key={item.id} className={`adm-tile${drag.dragId === item.id ? " is-dragging" : ""}${drag.overId === item.id ? " is-over" : ""}`}
              {...(canEdit ? drag.bind(item.id) : {})}>
              <div className="adm-tile-media">
                <img src={item.image_url} alt={item.alt_text || `Slide ${index + 1}`} loading="lazy" />
                <span className="adm-handle" aria-hidden="true">⠿ {index + 1}</span>
                {!item.is_active && <span className="adm-tile-off">Hidden</span>}
              </div>
              <div className="adm-tile-body">
                <div className="adm-tile-meta">
                  <span>{item.width && item.height ? `${item.width} × ${item.height}px` : "Size unknown"}</span>
                  {item.width && item.width < 1280 && <Badge tone="warn">Low resolution</Badge>}
                  {!item.is_active && <Badge>Hidden</Badge>}
                </div>
                <Field label="Alt text (describes the image for screen readers)" id={`alt-${item.id}`}>
                  <input id={`alt-${item.id}`} type="text" defaultValue={item.alt_text} disabled={!canEdit}
                    onBlur={(e) => e.target.value !== item.alt_text && patch(item.id, { alt_text: e.target.value }, "Alt text saved.")} />
                </Field>
                {canEdit && (
                  <div className="adm-actions">
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === 0}
                      onClick={() => drag.moveBy(item.id, -1)} aria-label={`Move slide ${index + 1} earlier`}>↑</button>
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={index === items.length - 1}
                      onClick={() => drag.moveBy(item.id, 1)} aria-label={`Move slide ${index + 1} later`}>↓</button>
                    <label className="adm-check">
                      <input type="checkbox" checked={item.is_active}
                        onChange={(e) => patch(item.id, { is_active: e.target.checked }, e.target.checked ? "Image shown on the website." : "Image hidden from the website.")} />
                      Show
                    </label>
                    <label className="adm-btn adm-btn-ghost adm-btn-small adm-btn-file">
                      Replace
                      <input type="file" accept={ACCEPT} disabled={busy}
                        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && replaceFile(item.id, f); }} />
                    </label>
                    <button type="button" className="adm-btn adm-btn-danger adm-btn-small" onClick={() => setConfirm(item)}>Delete</button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {previewOpen && activeItems.length > 0 && (
        <div className="adm-slideshow-backdrop" role="dialog" aria-modal="true" aria-labelledby="adm-slideshow-title"
          onMouseDown={(event) => event.target === event.currentTarget && setPreviewOpen(false)}>
          <section className="adm-slideshow-preview">
            <div className="adm-card-head">
              <h2 id="adm-slideshow-title">Homepage slideshow preview</h2>
              <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <img key={activeItems[previewIndex % activeItems.length].id}
              src={activeItems[previewIndex % activeItems.length].image_url}
              alt={activeItems[previewIndex % activeItems.length].alt_text || `Slide ${previewIndex + 1}`} />
            <div className="adm-actions" style={{ justifyContent: "space-between", marginTop: ".8rem" }}>
              <button type="button" className="adm-btn adm-btn-ghost" disabled={activeItems.length < 2}
                onClick={() => setPreviewIndex((index) => (index - 1 + activeItems.length) % activeItems.length)}>Previous</button>
              <span className="adm-muted" aria-live="polite">
                Slide {(previewIndex % activeItems.length) + 1} of {activeItems.length}
              </span>
              <button type="button" className="adm-btn adm-btn-ghost" disabled={activeItems.length < 2}
                onClick={() => setPreviewIndex((index) => (index + 1) % activeItems.length)}>Next</button>
            </div>
          </section>
        </div>
      )}
      <ConfirmDialog open={Boolean(confirm)} title="Delete this image?"
        message="It will be removed from the slideshow and deleted from storage. This cannot be undone."
        confirmLabel="Delete image" onConfirm={remove} onCancel={() => setConfirm(null)} />
      {busy && <p className="adm-muted" role="status">Uploading…</p>}
    </>
  );
}
