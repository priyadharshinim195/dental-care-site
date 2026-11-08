import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { admin } from "../../lib/api";
import { useAuth } from "../auth";
import { Card, Field, PageHeader, errorText, useToast } from "../ui";
import { roleLabel } from "../Layout";

export default function Account() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.new_password !== form.confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await admin.post("/auth/change-password/", { current_password: form.current_password, new_password: form.new_password });
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
      return;
    }
    toast("Password changed. Please sign in again.");
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <PageHeader title="Settings" description="Your sign-in details and password." />
      <div className="adm-grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", alignItems: "start" }}>
        <Card title="Your account">
          <dl className="adm-kv">
            <dt>Username</dt><dd>{user?.username}</dd>
            <dt>Email</dt><dd>{user?.email || "—"}</dd>
            <dt>Role</dt><dd>{roleLabel(user?.role)}</dd>
          </dl>
          <p className="adm-hint" style={{ marginTop: "1rem" }}>
            Roles: Administrator (full access, including user accounts), Editor (can change content), Viewer (read-only).
            Accounts are created by an Administrator through the Django admin at /django-admin/.
          </p>
        </Card>
        <Card title="Change password">
          <form onSubmit={submit} className="adm-form-grid" style={{ gridTemplateColumns: "1fr" }}>
            {error && <p className="adm-error" role="alert">{error}</p>}
            <Field label="Current password" id="pw-current"><input id="pw-current" type="password" autoComplete="current-password" required value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} /></Field>
            <Field label="New password" id="pw-new" hint="At least 10 characters. Avoid common passwords."><input id="pw-new" type="password" autoComplete="new-password" required minLength={10} value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} /></Field>
            <Field label="Confirm new password" id="pw-confirm"><input id="pw-confirm" type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></Field>
            <div><button className="adm-btn adm-btn-gold" disabled={busy}>{busy ? "Updating…" : "Update password"}</button></div>
          </form>
        </Card>
      </div>
    </>
  );
}
