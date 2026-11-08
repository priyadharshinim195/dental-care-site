import { useEffect, useMemo, useState } from "react";
import { admin } from "../../lib/api";
import { useCanEdit } from "../auth";
import { useAsync } from "../hooks";
import { Card, ErrorBanner, Field, Loading, Notice, PageHeader, errorText, useToast } from "../ui";
import GalleryManager from "./GalleryManager";
import ServicesManager from "./ServicesManager";
import TestimonialsManager from "./TestimonialsManager";

const TABS = [
  ["contact", "Contact & SEO"], ["social", "Social links"], ["display", "Slideshow & sections"],
  ["text", "Website text"], ["services", "Services"], ["testimonials", "Testimonials"], ["gallery", "Gallery"],
];
const SECTION_LABELS = {
  about: "About", services: "Services", "case-studies": "Case studies", "why-choose-us": "Why choose us",
  connect: "Contact (WhatsApp and call)", testimonials: "Testimonials", gallery: "Gallery", contact: "Contact details and map",
};

export default function SiteContent() {
  const canEdit = useCanEdit();
  const toast = useToast();
  const [tab, setTab] = useState("contact");
  const { data, error, loading, reload } = useAsync(async () => {
    const [settings, content] = await Promise.all([admin.get("/admin/site-settings/"), admin.get("/admin/site-content/")]);
    return { settings, content };
  }, []);

  if (loading) return <Loading />;
  if (error) return <ErrorBanner error={{ message: errorText(error) }} />;

  return (
    <>
      <PageHeader title="Website content" description="Manage public website copy, contact details, testimonials and gallery assets." />
      <div className="adm-tabs" role="tablist" aria-label="Website settings">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`}
            className="adm-tab" onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "contact" && <ContactTab settings={data.settings} canEdit={canEdit} toast={toast} onSaved={reload} />}
        {tab === "social" && <SocialTab settings={data.settings} canEdit={canEdit} toast={toast} onSaved={reload} />}
        {tab === "display" && <DisplayTab settings={data.settings} canEdit={canEdit} toast={toast} onSaved={reload} />}
        {tab === "text" && <TextTab items={data.content} canEdit={canEdit} toast={toast} onSaved={reload} />}
        {tab === "services" && <ServicesManager />}
        {tab === "testimonials" && <TestimonialsManager />}
        {tab === "gallery" && <GalleryManager />}
      </div>
    </>
  );
}

function useForm(initial) {
  const [form, setForm] = useState(initial);
  useEffect(() => setForm(initial), [initial]);
  return [form, setForm];
}

async function saveSettings(body, toast, onSaved, setBusy, successMessage = "Saved.") {
  setBusy(true);
  try {
    await admin.patch("/admin/site-settings/", body);
    const refreshed = await onSaved();
    if (refreshed === null) {
      throw new Error("Changes were saved, but the latest settings could not be reloaded.");
    }
    toast(successMessage);
  } catch (err) {
    toast(errorText(err), "error");
  } finally {
    setBusy(false);
  }
}

function ContactTab({ settings, canEdit, toast, onSaved }) {
  const initial = useMemo(() => ({
    address: settings.address || "",
    phone: settings.phone || "",
    whatsapp_number: settings.whatsapp_number || "",
    email: settings.email || "",
    hours: settings.hours || "",
    maps_url: settings.maps_url || "",
    seo_title: settings.seo_title || "",
    seo_description: settings.seo_description || "",
  }), [settings]);
  const [form, setForm] = useForm(initial);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const dis = !canEdit;
  return (
    <Card title="Contact details">
      <Notice tone="info">Phone and WhatsApp numbers can be managed separately. Phone links use the phone number; WhatsApp links use the WhatsApp number.</Notice>
      <form onSubmit={(e) => {
        e.preventDefault();
        const whatsapp_number = form.whatsapp_number.replace(/\D/g, "");
        saveSettings({ ...form, whatsapp_number }, toast, onSaved, setBusy, "Contact details saved.");
      }}>
        <div className="adm-form-grid">
          <Field label="Clinic address" id="c-address" hint="Shows on the map and builds the directions link."><textarea id="c-address" value={form.address} onChange={set("address")} disabled={dis} /></Field>
          <Field label="Opening hours" id="c-hours" hint="e.g. Mon–Sat, 9:00 AM – 7:00 PM"><input id="c-hours" type="text" value={form.hours} onChange={set("hours")} disabled={dis} /></Field>
          <Field label="Clinic phone number" id="c-phone" hint="Used by phone call links."><input id="c-phone" type="tel" value={form.phone} onChange={set("phone")} disabled={dis} /></Field>
          <Field label="WhatsApp number" id="c-whatsapp" hint="Include the country code; formatting spaces and symbols are removed when saved.">
            <input id="c-whatsapp" type="tel" value={form.whatsapp_number} onChange={set("whatsapp_number")} disabled={dis} />
          </Field>
          <Field label="Email" id="c-email"><input id="c-email" type="email" value={form.email} onChange={set("email")} disabled={dis} /></Field>
          <Field label="Google Maps link" id="c-maps" hint="Used for Get Directions. Must start with https://"><input id="c-maps" type="url" value={form.maps_url} onChange={set("maps_url")} disabled={dis} /></Field>
        </div>
        <h3 style={{ marginTop: "1.5rem" }}>Search engine details</h3>
        <div className="adm-form-grid">
          <Field label="Page title" id="seo-title" hint="Shown in the browser tab and search results."><input id="seo-title" type="text" maxLength={160} value={form.seo_title} onChange={set("seo_title")} disabled={dis} /></Field>
          <Field label="Page description" id="seo-desc"><textarea id="seo-desc" maxLength={300} value={form.seo_description} onChange={set("seo_description")} disabled={dis} /></Field>
        </div>
        {canEdit && <div className="adm-actions" style={{ marginTop: "1rem" }}>
          <button className="adm-btn adm-btn-gold" disabled={busy}>
            {busy ? "Saving contact details…" : "Save contact details"}
          </button>
        </div>}
      </form>
    </Card>
  );
}

function SocialTab({ settings, canEdit, toast, onSaved }) {
  const initialLinks = useMemo(() => settings.social_links || [], [settings.social_links]);
  const [links, setLinks] = useForm(initialLinks);
  const [busy, setBusy] = useState(false);
  const update = (i, key, value) => setLinks(links.map((l, idx) => (idx === i ? { ...l, [key]: value } : l)));
  return (
    <Card title="Footer social links" actions={canEdit && <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" onClick={() => setLinks([...links, { label: "", url: "" }])}>Add link</button>}>
      {links.length === 0 && <p className="adm-muted">No social links yet. Footer shows a placeholder until you add some.</p>}
      {links.map((link, i) => (
        <div key={i} className="adm-form-grid" style={{ gridTemplateColumns: "1fr 2fr auto", alignItems: "end", marginBottom: ".6rem" }}>
          <Field label="Label" id={`sl-${i}`}><input id={`sl-${i}`} type="text" value={link.label} onChange={(e) => update(i, "label", e.target.value)} disabled={!canEdit} /></Field>
          <Field label="Full https:// link" id={`su-${i}`}><input id={`su-${i}`} type="url" value={link.url} onChange={(e) => update(i, "url", e.target.value)} disabled={!canEdit} /></Field>
          {canEdit && <button type="button" className="adm-btn adm-btn-danger adm-btn-small" onClick={() => setLinks(links.filter((_, idx) => idx !== i))}>Remove</button>}
        </div>
      ))}
      {canEdit && <div className="adm-actions"><button className="adm-btn adm-btn-gold" disabled={busy}
        onClick={() => saveSettings({ social_links: links }, toast, onSaved, setBusy)}>Save social links</button></div>}
    </Card>
  );
}

function DisplayTab({ settings, canEdit, toast, onSaved }) {
  const initial = useMemo(() => ({
    hero_interval_ms: settings.hero_interval_ms, hero_fade_ms: settings.hero_fade_ms,
    section_visibility: settings.section_visibility, section_order: settings.section_order,
  }), [settings]);
  const [form, setForm] = useForm(initial);
  const [busy, setBusy] = useState(false);
  const toggle = (key) => setForm({ ...form, section_visibility: { ...form.section_visibility, [key]: !form.section_visibility[key] } });
  const moveSection = (key, delta) => {
    const order = form.section_order.slice();
    const index = order.indexOf(key);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    setForm({ ...form, section_order: order });
  };
  return (
    <>
      <Card title="Hero slideshow timing">
        <div className="adm-form-grid">
          <Field label="Seconds on each image" id="hero-interval" hint="Between 1.2 and 10 seconds. The recommended display uses 2 seconds.">
            <input id="hero-interval" type="number" step="0.1" min="1.2" max="10" disabled={!canEdit}
              value={form.hero_interval_ms / 1000} onChange={(e) => setForm({ ...form, hero_interval_ms: Math.round(Number(e.target.value) * 1000) })} />
          </Field>
          <Field label="Crossfade duration (seconds)" id="hero-fade" hint="Between 0.2 and 2 seconds. The recommended transition is 0.4 seconds.">
            <input id="hero-fade" type="number" step="0.1" min="0.2" max="2" disabled={!canEdit}
              value={form.hero_fade_ms / 1000} onChange={(e) => setForm({ ...form, hero_fade_ms: Math.round(Number(e.target.value) * 1000) })} />
          </Field>
        </div>
      </Card>
      <Card title="Show or hide sections" actions={canEdit && <button type="button" className="adm-btn adm-btn-gold adm-btn-small" disabled={busy}
        onClick={() => saveSettings({
          hero_interval_ms: form.hero_interval_ms, hero_fade_ms: form.hero_fade_ms,
          section_visibility: form.section_visibility, section_order: form.section_order,
        }, toast, onSaved, setBusy)}>Save display settings</button>}>
        <p className="adm-muted">The hero, header and footer always show. Hidden sections are also removed from the menu.</p>
        <div className="adm-form-grid">
          {form.section_order.map((key, index) => (
            <div key={key} className="adm-actions" style={{ justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: ".5rem" }}>
              <label className="adm-check">
                <input type="checkbox" checked={form.section_visibility[key] !== false} disabled={!canEdit} onChange={() => toggle(key)} />
                {labelForSection(key)}
              </label>
              <div className="adm-actions">
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={!canEdit || index === 0}
                  onClick={() => moveSection(key, -1)} aria-label={`Move ${labelForSection(key)} earlier`}>↑</button>
                <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" disabled={!canEdit || index === form.section_order.length - 1}
                  onClick={() => moveSection(key, 1)} aria-label={`Move ${labelForSection(key)} later`}>↓</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function labelForSection(key) {
  return SECTION_LABELS[key] || key;
}

function TextTab({ items, canEdit, toast, onSaved }) {
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState(false);
  const editableItems = items.filter((item) => !/^services\.\d+\.(title|text)$/.test(item.key));
  const groups = editableItems.reduce((acc, item) => ({ ...acc, [item.group]: [...(acc[item.group] || []), item] }), {});
  const changed = Object.keys(drafts);

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const key of changed) {
        await admin.patch(`/admin/site-content/${encodeURIComponent(key)}/`, { value: drafts[key] });
      }
      setDrafts({});
      toast(`${changed.length} text item${changed.length === 1 ? "" : "s"} saved.`);
      await onSaved();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (item) => {
    try {
      await admin.patch(`/admin/site-content/${encodeURIComponent(item.key)}/`, { value: "" });
      setDrafts((d) => { const n = { ...d }; delete n[item.key]; return n; });
      toast("Reset to the original wording.");
      await onSaved();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <>
      <Notice tone="info">Each box shows what the website says now. Leave a box empty to use the original wording shown in grey. Changes go live after saving.</Notice>
      {Object.entries(groups).map(([group, list]) => (
        <Card key={group} title={group.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase())}>
          <div style={{ display: "grid", gap: "1rem" }}>
            {list.map((item) => {
              const value = drafts[item.key] ?? item.value;
              return (
                <Field key={item.key} label={item.label} id={`txt-${item.key}`} hint={item.value ? undefined : "Using the original wording."}>
                  <textarea id={`txt-${item.key}`} value={value} placeholder={item.default_value} disabled={!canEdit}
                    onChange={(e) => setDrafts({ ...drafts, [item.key]: e.target.value })} rows={item.default_value.length > 110 ? 4 : 2} />
                  {canEdit && item.value && (
                    <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" style={{ alignSelf: "flex-start" }} onClick={() => reset(item)}>
                      Reset to original
                    </button>
                  )}
                </Field>
              );
            })}
          </div>
        </Card>
      ))}
      {canEdit && changed.length > 0 && (
        <div className="adm-actions" style={{ position: "sticky", bottom: 16 }}>
          <button type="button" className="adm-btn adm-btn-gold" disabled={busy} onClick={saveAll}>
            Save {changed.length} change{changed.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </>
  );
}
