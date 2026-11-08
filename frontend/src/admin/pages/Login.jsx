import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { errorText, Field } from "../ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(form.username.trim(), form.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
      setForm((f) => ({ ...f, password: "" }));
    }
  };

  return (
    <div className="adm-login">
      <div className="adm-login-card">
        <p className="adm-muted" style={{ margin: 0, letterSpacing: ".12em", textTransform: "uppercase", fontSize: ".75rem" }}>Ajitha Dental Care</p>
        <h1>Sign in to the admin</h1>
        <p className="adm-muted">Only authorised staff can access this dashboard.</p>
        {error && <p className="adm-error" role="alert">{error}</p>}
        <form onSubmit={submit} noValidate>
          <Field label="Username" id="login-username">
            <input id="login-username" type="text" autoComplete="username" required value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label="Password" id="login-password">
            <input id="login-password" type="password" autoComplete="current-password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <button type="submit" className="adm-btn adm-btn-gold" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
