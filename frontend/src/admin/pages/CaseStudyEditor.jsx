import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { admin, formWith } from "../../lib/api";
import { BeforeAfter } from "../../site/CaseStudies";
import { useCanEdit } from "../auth";
import { moveItem, useAsync } from "../hooks";
import { Badge, Card, ConfirmDialog, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast } from "../ui";

const KIND_LABEL = {
  composite: "Legacy composite", before: "Before", after: "After", process: "Legacy process",
  xray: "X-ray", surgery: "During surgery",
};

const TEXT_FIELDS = [
  ["title", "Case title", "input"],
  ["category", "Category", "input"],
  ["summary", "Short description (card)", "textarea"],
  ["description", "Case description", "textarea"],
  ["treatment_details", "Treatment details", "textarea"],
  ["challenge", "Challenge", "textarea"],
  ["solution", "Solution", "textarea"],
  ["result", "Final result", "textarea"],
  ["internal_notes", "Internal notes (never published)", "textarea"],
];

export default function CaseStudyEditor() {
  const { id } = useParams();
  const canEdit = useCanEdit();
  const toast = useToast();
  const navigate = useNavigate();

  const { data, error, loading, setData, reload } = useAsync(() => admin.get(`/admin/case-studies/${id}/`), [id]);
  const [form, setForm] = useState(null);
  const [blockers, setBlockers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    if (data) {
      setForm({
        title: data.title, category: data.category, summary: data.summary, description: data.description,
        treatment_details: data.treatment_details || "", challenge: data.challenge, solution: data.solution,
        result: data.result, internal_notes: data.internal_notes,
        clinic_verified: data.clinic_verified, consent_confirmed: data.consent_confirmed,
      });
      setBlockers(data.publish_blockers || []);
    }
  }, [data]);

  if (loading || !form) return loading ? <Loading /> : <ErrorBanner error={error && { message: errorText(error) }} />;

  const published = data.status === "published";
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await admin.patch(`/admin/case-studies/${id}/`, form);
      setData(updated);
      setBlockers(updated.publish_blockers || []);
      toast("Case study saved.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setBusy(true);
    try {
      const updated = await admin.post(`/admin/case-studies/${id}/publish/`);
      setData(updated);
      toast("Published. The case now appears on the website.");
    } catch (err) {
      if (err.data?.blockers) setBlockers(err.data.blockers);
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    setBusy(true);
    try {
      setData(await admin.post(`/admin/case-studies/${id}/unpublish/`));
      toast("Case unpublished. It is hidden from the website.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirm(null);
    try {
      await admin.del(`/admin/case-studies/${id}/`);
      toast("Case study deleted.");
      navigate("/case-studies", { replace: true });
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <>
      <PageHeader title={data.title || "Untitled case study"}
        description={<>Status: {published ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>} · <Link to="/case-studies">Back to case studies</Link></>}
        actions={canEdit && (
          <>
            {published ? (
              <button type="button" className="adm-btn adm-btn-ghost" disabled={busy} onClick={unpublish}>Unpublish</button>
            ) : (
              <button type="button" className="adm-btn adm-btn-gold" disabled={busy} onClick={publish}>Publish</button>
            )}
            <button type="button" className="adm-btn adm-btn-danger" onClick={() => setConfirm("delete")}>Delete</button>
          </>
        )} />

      <ErrorBanner error={error && { message: errorText(error) }} />
      {!published && blockers.length > 0 && (
        <Notice tone="warn">
          <strong>Not ready to publish:</strong>
          <ul style={{ margin: ".4rem 0 0", paddingLeft: "1.2rem" }}>{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
        </Notice>
      )}
      {!canEdit && <Notice tone="info">You have read-only access to this case study.</Notice>}

      <form onSubmit={save} className="adm-grid case-editor-grid" style={{ alignItems: "start" }}>
        <div>
          <Card title="Content">
            <div className="adm-form-grid">
              {TEXT_FIELDS.map(([key, label, kind]) => (
                <Field key={key} label={label} id={`cs-${key}`} hint={key === "internal_notes" ? "For staff only. Never shown on the website." : undefined}
                  error={undefined}>
                  {kind === "input" ? (
                    <input id={`cs-${key}`} type="text" value={form[key]} onChange={set(key)} disabled={!canEdit} maxLength={255} />
                  ) : (
                    <textarea id={`cs-${key}`} value={form[key]} onChange={set(key)} disabled={!canEdit}
                      className={["description", "treatment_details"].includes(key) ? "tall" : ""} />
                  )}
                </Field>
              ))}
            </div>
          </Card>

          <Card title="Consent and verification">
            <p className="adm-muted">Publishing is blocked until both boxes are ticked. Tick them only once you have written consent from the patient and the clinic has checked every statement.</p>
            <div className="adm-actions" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              <label className="adm-check"><input type="checkbox" checked={form.consent_confirmed} onChange={set("consent_confirmed")} disabled={!canEdit} />
                Written patient consent is on file for publishing these images and text.</label>
              <label className="adm-check"><input type="checkbox" checked={form.clinic_verified} onChange={set("clinic_verified")} disabled={!canEdit} />
                The clinic has verified every statement in this case.</label>
            </div>
          </Card>

          {canEdit && (
            <div className="adm-actions">
              <button type="submit" className="adm-btn adm-btn-gold" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
            </div>
          )}
        </div>

        <div>
          <CaseImages caseId={id} images={data.images} canEdit={canEdit} onChanged={reload}
            toast={toast} published={published} />
          <Card title="Preview">
            <CasePreview form={form} images={data.images} />
          </Card>
        </div>
      </form>

      <ConfirmDialog open={confirm === "delete"} title="Delete this case study?"
        message="The case study and all of its images will be deleted. This cannot be undone."
        confirmLabel="Delete case study" onConfirm={remove} onCancel={() => setConfirm(null)} />
    </>
  );
}

function CaseImages({ caseId, images, canEdit, onChanged, toast, published }) {
  const before = images.find((image) => image.kind === "before");
  const after = images.find((image) => image.kind === "after");
  const xrayImages = images.filter((image) => image.kind === "xray");
  const surgeryImages = images.filter((image) => image.kind === "surgery");
  const legacyImages = images.filter((image) => !["before", "after", "xray", "surgery"].includes(image.kind));
  return (
    <>
      <Card title="Before & After images">
      <Notice tone="info">
        Upload the two treatment images separately. They are aligned in one interactive comparison on the public website.
      </Notice>
        <div className="case-image-slots">
          <CaseImageSlot caseId={caseId} kind="before" image={before} canEdit={canEdit}
            onChanged={onChanged} toast={toast} published={published} />
          <CaseImageSlot caseId={caseId} kind="after" image={after} canEdit={canEdit}
            onChanged={onChanged} toast={toast} published={published} />
        </div>
        {!before || !after ? <p className="adm-hint">Both images are required before this case can be published.</p> : null}
      </Card>
      <CaseImageGallery caseId={caseId} kind="xray" label="X-Ray Images" images={xrayImages}
        canEdit={canEdit} onChanged={onChanged} toast={toast} />
      <CaseImageGallery caseId={caseId} kind="surgery" label="During Surgery Images" images={surgeryImages}
        canEdit={canEdit} onChanged={onChanged} toast={toast} />
      {legacyImages.length > 0 && (
        <Card title="Legacy images">
          <Notice tone="info">Older composite and process uploads are retained for reference but are not shown on the public website.</Notice>
          <div className="case-legacy-images">
            {legacyImages.map((image) => (
              <LegacyCaseImage key={image.id} image={image} canEdit={canEdit}
                onChanged={onChanged} toast={toast} published={published} />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function CaseImageGallery({ caseId, kind, label, images, canEdit, onChanged, toast }) {
  const [orderedImages, setOrderedImages] = useState(images);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState([]);

  useEffect(() => setOrderedImages(images), [images]);
  useEffect(() => {
    const next = files.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach(({ url }) => URL.revokeObjectURL(url));
  }, [files]);

  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    let completed = 0;
    try {
      for (const file of files) {
        const body = formWith({ case: caseId, kind, image: file });
        await admin.upload("POST", "/admin/case-study-images/", body);
        completed += 1;
      }
      setFiles([]);
      toast(`${completed} ${label.toLowerCase()} uploaded.`);
    } catch (err) {
      if (completed) {
        setFiles((pending) => pending.slice(completed));
        toast(`${completed} image${completed === 1 ? "" : "s"} uploaded. ${errorText(err)}`, "error");
      } else {
        toast(errorText(err), "error");
      }
    } finally {
      await onChanged();
      setBusy(false);
    }
  };

  const moveImage = async (id, delta) => {
    const index = orderedImages.findIndex((image) => image.id === id);
    const target = orderedImages[index + delta];
    if (!target) return;
    const next = moveItem(orderedImages, id, target.id);
    if (!next) return;
    setOrderedImages(next);
    setBusy(true);
    try {
      const saved = await admin.post("/admin/case-study-images/reorder/", {
        case: caseId, kind, ids: next.map((image) => image.id),
      });
      setOrderedImages(saved);
      toast(`${label} order saved.`);
      await onChanged();
    } catch (err) {
      setOrderedImages(images);
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={label}>
      {canEdit && (
        <>
          <Field label={`Add ${label.toLowerCase()}`} id={`case-gallery-${kind}`}
            hint="Select one or more JPEG, PNG or WEBP images. Each upload is saved to this case only.">
            <input id={`case-gallery-${kind}`} type="file" accept="image/jpeg,image/png,image/webp"
              multiple disabled={busy} onChange={(event) => {
                setFiles((existing) => [...existing, ...Array.from(event.target.files || [])]);
                event.target.value = "";
              }} />
          </Field>
          {previews.length > 0 && (
            <div className="case-legacy-images case-gallery-previews">
              {previews.map(({ file, url }, index) => (
                <div className="case-legacy-image" key={`${file.name}-${index}`}>
                  <div className="adm-preview"><img src={url} alt={`${label} upload preview ${index + 1}`} /></div>
                  <span className="adm-hint">{file.name}</span>
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-small"
                    disabled={busy} onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="adm-actions case-image-actions">
              <button type="button" className="adm-btn adm-btn-gold" disabled={busy} onClick={upload}>
                {busy ? "Uploading…" : `Upload ${files.length} image${files.length === 1 ? "" : "s"}`}
              </button>
            </div>
          )}
        </>
      )}
      {orderedImages.length > 0 ? (
        <div className="case-legacy-images">
          {orderedImages.map((image, index) => (
            <GalleryImage key={image.id} image={image} label={label} canEdit={canEdit}
              onChanged={onChanged} toast={toast} index={index} count={orderedImages.length}
              onMove={moveImage} busy={busy} />
          ))}
        </div>
      ) : <p className="adm-muted">{`No ${label.toLowerCase()} uploaded.`}</p>}
    </Card>
  );
}

function GalleryImage({ image, label, canEdit, onChanged, toast, index, count, onMove, busy: reorderBusy }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const replace = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await admin.upload("PATCH", `/admin/case-study-images/${image.id}/`,
        formWith({ image: file, alt_text: image.alt_text, caption: image.caption }));
      setFile(null);
      toast(`${label} image replaced.`);
      await onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      await admin.del(`/admin/case-study-images/${image.id}/`);
      toast(`${label} image deleted.`);
      await onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="case-legacy-image">
      <div className="adm-preview"><img src={previewUrl || image.image_url}
        alt={image.alt_text || `${label} image`} /></div>
      <span className="adm-hint">{image.width} × {image.height}px</span>
      {canEdit && (
        <>
          <Field label="Replace this image" id={`case-image-replace-${image.id}`}>
            <input id={`case-image-replace-${image.id}`} type="file" accept="image/jpeg,image/png,image/webp"
              disabled={busy} onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                event.target.value = "";
              }} />
          </Field>
          <div className="adm-actions">
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-small"
              disabled={reorderBusy || index === 0} onClick={() => onMove(image.id, -1)}
              aria-label={`Move ${label} image ${index + 1} earlier`}>↑</button>
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-small"
              disabled={reorderBusy || index === count - 1} onClick={() => onMove(image.id, 1)}
              aria-label={`Move ${label} image ${index + 1} later`}>↓</button>
            {file && <button type="button" className="adm-btn adm-btn-gold adm-btn-small"
              disabled={busy} onClick={replace}>{busy ? "Saving…" : "Save replacement"}</button>}
            <button type="button" className="adm-btn adm-btn-danger adm-btn-small"
              disabled={busy} onClick={() => setConfirm(true)}>Delete</button>
          </div>
        </>
      )}
      <ConfirmDialog open={confirm} title={`Delete this ${label.toLowerCase()} image?`}
        message="This image will be removed from this case and deleted from storage."
        confirmLabel="Delete image" onConfirm={remove} onCancel={() => setConfirm(false)} />
    </div>
  );
}

function CaseImageSlot({ caseId, kind, image, canEdit, onChanged, toast, published }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const label = kind === "before" ? "Before Image" : "After Image";

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const body = formWith({ image: file, alt_text: image?.alt_text || "" });
      if (image) {
        await admin.upload("PATCH", `/admin/case-study-images/${image.id}/`, body);
      } else {
        body.append("case", caseId);
        body.append("kind", kind);
        await admin.upload("POST", "/admin/case-study-images/", body);
      }
      setFile(null);
      toast(`${label} ${image ? "replaced" : "uploaded"}.`);
      await onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      await admin.del(`/admin/case-study-images/${image.id}/`);
      toast(`${label} deleted.`);
      await onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="case-image-slot">
      <h3>{label}</h3>
      {(previewUrl || image) ? (
        <div className="adm-preview case-image-preview">
          <img src={previewUrl || image.image_url} alt={`${label} preview`} />
        </div>
      ) : <p className="adm-muted case-image-missing">No {kind} image uploaded.</p>}
      {image && !previewUrl && <p className="adm-hint">{image.width} × {image.height}px</p>}
      {canEdit && (
        <>
          <Field label={image ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
            id={`case-image-${kind}`} hint="JPEG, PNG or WEBP. The server validates the image before saving.">
            <input id={`case-image-${kind}`} type="file" accept="image/jpeg,image/png,image/webp"
              disabled={busy} onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                event.target.value = "";
              }} />
          </Field>
          <div className="adm-actions case-image-actions">
            {file && <button type="button" className="adm-btn adm-btn-gold" disabled={busy} onClick={save}>
              {busy ? "Saving…" : `Save ${kind} image`}
            </button>}
            {image && <button type="button" className="adm-btn adm-btn-danger adm-btn-small"
              disabled={busy} onClick={() => setConfirm(true)}>Delete {kind}</button>}
          </div>
        </>
      )}
      <ConfirmDialog open={confirm} title={`Delete the ${kind} image?`}
        message={published
          ? "This case is published. Unpublish it before deleting this comparison image."
          : "This image will be removed from the case and deleted from storage."}
        confirmLabel={`Delete ${kind} image`} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </section>
  );
}

function LegacyCaseImage({ image, canEdit, onChanged, toast, published }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      await admin.del(`/admin/case-study-images/${image.id}/`);
      toast(`${KIND_LABEL[image.kind]} deleted.`);
      await onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="case-legacy-image">
      <div className="adm-preview"><img src={image.image_url} alt={image.alt_text || KIND_LABEL[image.kind]} /></div>
      <Badge tone="gold">{KIND_LABEL[image.kind] || image.kind}</Badge>
      {canEdit && <button type="button" className="adm-btn adm-btn-danger adm-btn-small"
        disabled={busy} onClick={() => setConfirm(true)}>Delete legacy image</button>}
      <ConfirmDialog open={confirm} title="Delete this legacy image?"
        message={published
          ? "This case is published. The before-and-after pair must remain in place."
          : "This image will be removed from the case and deleted from storage."}
        confirmLabel="Delete image" onConfirm={remove} onCancel={() => setConfirm(false)} />
    </div>
  );
}

function CasePreview({ form, images }) {
  const before = images.find((image) => image.kind === "before");
  const after = images.find((image) => image.kind === "after");
  return (
    <div>
      <div className="case-admin-slider-preview">
        {before && after ? (
          <BeforeAfter
            before={{ url: before.image_url, alt: before.alt_text || "Before treatment" }}
            after={{ url: after.image_url, alt: after.alt_text || "After treatment" }} />
        ) : <p className="adm-muted">Upload both images to preview the comparison.</p>}
      </div>
      <p className="adm-muted" style={{ margin: 0, fontSize: ".8rem" }}>{form.category}</p>
      <h3 style={{ margin: ".2rem 0" }}>{form.title || "Untitled"}</h3>
      <p>{form.summary || form.description}</p>
      {["challenge", "solution", "result"].map((key) => form[key] && (
        <p key={key} style={{ margin: ".4rem 0" }}><strong style={{ textTransform: "capitalize" }}>{key === "result" ? "Final result" : key}:</strong> {form[key]}</p>
      ))}
      {form.treatment_details && <p style={{ margin: ".4rem 0" }}><strong>Treatment details:</strong> {form.treatment_details}</p>}
      <p className="adm-hint">Internal notes are never shown to the public.</p>
    </div>
  );
}
