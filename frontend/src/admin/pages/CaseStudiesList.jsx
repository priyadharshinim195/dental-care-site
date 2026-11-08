import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { admin } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync, useDragReorder } from "../hooks";
import { Badge, EmptyState, ErrorBanner, Loading, Notice, PageHeader, errorText, useToast } from "../ui";

export default function CaseStudiesList() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const navigate = useNavigate();
  const { data, error, loading, setData } = useAsync(() => admin.get("/admin/case-studies/"), []);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const items = data || [];

  const commit = async (ids, previous) => {
    try {
      setData(await admin.post("/admin/case-studies/reorder/", { ids }));
      toast("Card order saved.");
    } catch (err) {
      setData(previous);
      toast(errorText(err), "error");
    }
  };
  const drag = useDragReorder(items, { onChange: (next) => setData(next), commit: (ids) => commit(ids, items) });

  const create = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const created = await admin.post("/admin/case-studies/", { title: title.trim() });
      toast("Draft created. Add details and images, then publish when ready.");
      navigate(`/case-studies/${created.id}`);
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <PageHeader title="Case studies"
        description="Before-and-after cases. A case appears on the website only after both comparison images are saved and it is published. Publishing requires written patient consent and the clinic's verification." />
      <ErrorBanner error={error && { message: errorText(error) }} />
      <Notice tone="info">
        Only published cases with separate Before and After images appear publicly. Drafts and legacy composite-only cases are hidden.
      </Notice>

      {canEdit && (
        <form className="adm-card" onSubmit={create} style={{ display: "flex", gap: ".6rem", flexWrap: "wrap" }}>
          <label htmlFor="new-title" className="sr-only">New case title</label>
          <input id="new-title" type="text" className="adm-input" style={{ flex: "1 1 280px" }}
            placeholder="Title for the new case study" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button type="submit" className="adm-btn adm-btn-gold" disabled={creating || !title.trim()}>New case study</button>
        </form>
      )}

      {loading ? <Loading /> : items.length === 0 ? (
        <EmptyState title="No case studies yet">Create one above to begin.</EmptyState>
      ) : (
        <div className="adm-card adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr><th scope="col">Order</th><th scope="col">Title</th><th scope="col">Status</th>
                <th scope="col">Consent &amp; verification</th><th scope="col">Images</th><th scope="col"><span className="sr-only">Actions</span></th></tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className={drag.overId === item.id ? "is-over" : ""}
                  {...(canEdit ? drag.bind(item.id) : {})} style={{ cursor: canEdit ? "grab" : "default" }}>
                  <td>
                    <span aria-hidden="true">⠿ {index + 1}</span>
                    {canEdit && (
                      <span className="sr-only">
                        <button type="button" onClick={() => drag.moveBy(item.id, -1)}>Move {item.title} up</button>
                        <button type="button" onClick={() => drag.moveBy(item.id, 1)}>Move {item.title} down</button>
                      </span>
                    )}
                  </td>
                  <td><strong>{item.title}</strong><div className="adm-muted" style={{ fontSize: ".8rem" }}>/{item.slug}</div></td>
                  <td>{item.status === "published" ? <Badge tone="ok">Published</Badge> : <Badge>Draft</Badge>}</td>
                  <td>
                    <Badge tone={item.consent_confirmed ? "ok" : "warn"}>{item.consent_confirmed ? "Consent ✓" : "Consent needed"}</Badge>{" "}
                    <Badge tone={item.clinic_verified ? "ok" : "warn"}>{item.clinic_verified ? "Verified ✓" : "Verification needed"}</Badge>
                  </td>
                  <td>{item.images.length}</td>
                  <td style={{ textAlign: "right" }}><Link className="adm-btn adm-btn-ghost adm-btn-small" to={`/case-studies/${item.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
