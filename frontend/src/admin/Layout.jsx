import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./auth";

const NAV = [
  ["dashboard", "Overview"],
  ["hero-images", "Hero images"],
  ["case-studies", "Case studies"],
  ["branding", "Branding"],
  ["media", "Media library"],
  ["website-content", "Website content"],
  ["settings", "Settings"],
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.add("admin-page");
    return () => document.body.classList.remove("admin-page");
  }, []);

  const signOut = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className={`adm-shell${open ? " is-nav-open" : ""}`}>
      <aside className="adm-sidebar" aria-label="Admin navigation">
        <div className="adm-brand">
          <span className="adm-brand-mark" aria-hidden="true">A</span>
          <div>
            <strong>Ajitha Dental</strong>
            <span>Website admin</span>
          </div>
        </div>
        <nav id="adm-nav">
          {NAV.map(([path, label]) => (
            <NavLink key={path} to={`/${path}`} onClick={() => setOpen(false)}>{label}</NavLink>
          ))}
        </nav>
        <a className="adm-public-link" href="/" target="_blank" rel="noopener noreferrer">View public website ↗</a>
      </aside>

      <div className="adm-main">
        <header className="adm-topbar">
          <button type="button" className="adm-menu-btn" aria-expanded={open} aria-controls="adm-nav"
            onClick={() => setOpen(!open)}>
            <span className="sr-only">Toggle navigation</span>☰
          </button>
          <div className="adm-topbar-user">
            <span className="adm-role">{user ? roleLabel(user.role) : ""}</span>
            <span className="adm-username">{user?.username}</span>
            <button type="button" className="adm-btn adm-btn-ghost adm-btn-small" onClick={signOut}>Sign out</button>
          </div>
        </header>
        <main className="adm-content" id="adm-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function roleLabel(role) {
  return { admin: "Administrator", editor: "Editor", viewer: "Viewer (read-only)" }[role] || "";
}
