import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ---------- Toasts ---------- */
const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((items) => [...items, { id, message, tone }]);
    setTimeout(() => setToasts((items) => items.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`adm-toast adm-toast-${t.tone}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ---------- Confirmation dialog (native <dialog>, keyboard and focus friendly) ---------- */
export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", tone = "danger",
  confirmDisabled = false, cancelDisabled = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [open]);
  if (!open) return <dialog ref={ref} className="adm-dialog" />;
  return (
    <dialog ref={ref} className="adm-dialog" aria-labelledby="confirm-title"
      onCancel={(e) => { e.preventDefault(); onCancel(); }}>
      <div className="adm-dialog-body">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="adm-actions">
          <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel} disabled={cancelDisabled}>Cancel</button>
          <button type="button" className={`adm-btn adm-btn-${tone}`} onClick={onConfirm}
            disabled={confirmDisabled} autoFocus>{confirmLabel}</button>
        </div>
      </div>
    </dialog>
  );
}

/* ---------- Layout helpers ---------- */
export function PageHeader({ title, description, actions }) {
  return (
    <header className="adm-page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="adm-muted">{description}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </header>
  );
}

export function Card({ title, children, actions, className = "" }) {
  return (
    <section className={`adm-card ${className}`}>
      {(title || actions) && (
        <div className="adm-card-head">
          {title && <h2>{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Loading({ label = "Loading…" }) {
  return <p className="adm-loading" role="status">{label}</p>;
}

export function ErrorBanner({ error }) {
  if (!error) return null;
  return <p className="adm-error" role="alert">{error.message || String(error)}</p>;
}

export function EmptyState({ title, children }) {
  return (
    <div className="adm-empty">
      <p className="adm-empty-title">{title}</p>
      {children && <div className="adm-muted">{children}</div>}
    </div>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`adm-badge adm-badge-${tone}`}>{children}</span>;
}

export function Field({ label, hint, error, children, id }) {
  return (
    <div className={`adm-field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="adm-hint">{hint}</p>}
      {error && <p className="adm-field-error">{error}</p>}
    </div>
  );
}

export function Notice({ tone = "info", children }) {
  return <div className={`adm-notice adm-notice-${tone}`} role="note">{children}</div>;
}

export function errorText(err) {
  if (!err) return "";
  if (err.fieldErrors && Object.keys(err.fieldErrors).length) {
    return Object.values(err.fieldErrors).flat().join(" ");
  }
  return err.message || "Something went wrong. Please try again.";
}
