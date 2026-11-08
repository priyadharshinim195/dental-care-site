import { useEffect, useState } from "react";
import { admin, formWith } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync } from "../hooks";
import { Badge, ConfirmDialog, EmptyState, ErrorBanner, Loading, PageHeader, errorText, useToast } from "../ui";

const FILE_ACCEPT = "image/jpeg,image/png,image/webp,video/mp4,video/webm";

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function Media() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const params = new URLSearchParams();
  if (debounced) params.set("q", debounced);
  if (kind) params.set("kind", kind);
  const { data, error, loading, reload, setData } = useAsync(() => admin.get(`/admin/media/?${params}`), [debounced, kind]);

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    let ok = 0;
    for (const file of files) {
      try {
        await admin.upload("POST", "/admin/media/", formWith({ file, alt_text: "" }));
        ok += 1;
      } catch (err) {
        toast(`${file.name}: ${errorText(err)}`, "error");
      }
    }
    setBusy(false);
    if (ok) toast(`${ok} file${ok === 1 ? "" : "s"} added to the library.`);
    await reload();
  };

  const saveAlt = async (item, alt) => {
    if (alt === item.alt_text) return;
    try {
      const updated = await admin.patch(`/admin/media/${item.id}/`, { alt_text: alt });
      setData((list) => list.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const replace = async (item, file) => {
    try {
      await admin.upload("PATCH", `/admin/media/${item.id}/`, formWith({ file }));
      toast("File replaced.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const remove = async () => {
    const item = confirm;
    setConfirm(null);
    try {
      await admin.del(`/admin/media/${item.id}/`);
      toast("File deleted.");
      await reload();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const copy = async (item) => {
    const url = `${window.location.origin}${item.url}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      toast(url);
    }
  };

  const items = data || [];
  return (
    <>
      <PageHeader title="Media library"
        description="Every image and video you upload. Files are checked for their real type and for duplicates."
        actions={canEdit && (
          <label className={`adm-btn adm-btn-gold adm-btn-file${busy ? " is-disabled" : ""}`}>
            {busy ? "Uploading…" : "Upload files"}
            <input type="file" multiple accept={FILE_ACCEPT} disabled={busy} onChange={upload} />
          </label>
        )} />
      <ErrorBanner error={error && { message: errorText(error) }} />

      <div className="adm-card" style={{ display: "flex", gap: ".6rem", flexWrap: "wrap", alignItems: "end" }}>
        <div className="adm-field" style={{ flex: "1 1 260px" }}>
          <label htmlFor="media-search">Search</label>
          <input id="media-search" type="search" placeholder="File name or description" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="adm-field" style={{ width: 180 }}>
          <label htmlFor="media-kind">Type</label>
          <select id="media-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">All files</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>
        </div>
      </div>

      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title={debounced || kind ? "No files match your search" : "The library is empty"}>
          Upload images or videos to reuse them across the site.
        </EmptyState>
      ) : (
        <div className="adm-tiles">
          {items.map((item) => (
            <article className="adm-tile" key={item.id}>
              <div className="adm-tile-media">
                {item.kind === "video" ? <video src={item.url} controls preload="metadata" /> : <img src={item.url} alt={item.alt_text || item.original_name} loading="lazy" />}
              </div>
              <div className="adm-tile-body">
                <strong style={{ wordBreak: "break-all", fontSize: ".92rem" }}>{item.original_name}</strong>
                <div className="adm-tile-meta">
                  <Badge>{item.kind}</Badge>
                  <span>{formatSize(item.size_bytes)}</span>
                  {item.width && <span>{item.width} × {item.height}</span>}
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                  {item.uploaded_by_name && <span>by {item.uploaded_by_name}</span>}
                </div>
                {canEdit ? (
                  <>
                    <div className="adm-field">
                      <label htmlFor={`m-alt-${item.id}`}>Description</label>
                      <input id={`m-alt-${item.id}`} type="text" defaultValue={item.alt_text} onBlur={(e) => saveAlt(item, e.target.value)} />
                    </div>
                    <div className="adm-actions">
                      <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" onClick={() => copy(item)}>Copy link</button>
                      <label className="adm-btn adm-btn-ghost adm-btn-small adm-btn-file">Replace
                        <input type="file" accept={FILE_ACCEPT} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; f && replace(item, f); }} />
                      </label>
                      <button type="button" className="adm-btn adm-btn-danger adm-btn-small" onClick={() => setConfirm(item)}>Delete</button>
                    </div>
                  </>
                ) : (
                  <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" onClick={() => copy(item)}>Copy link</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog open={Boolean(confirm)} title="Delete this file?"
        message="The file will be deleted from storage. Anything that uses it will need a new file."
        confirmLabel="Delete file" onConfirm={remove} onCancel={() => setConfirm(null)} />
    </>
  );
}
