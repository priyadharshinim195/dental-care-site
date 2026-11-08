import { useEffect, useState } from "react";
import { contactLink, WHATSAPP_MESSAGE } from "./hooks";
import { PhoneIcon, WhatsAppIcon } from "./icons";

const NAV = [
  { href: "#home", label: "Home", key: null },
  { href: "#about", label: "About", key: "about" },
  { href: "#services", label: "Services", key: "services" },
  { href: "#case-studies", label: "Case Studies", key: "case-studies" },
  { href: "#testimonials", label: "Testimonials", key: "testimonials" },
  { href: "#gallery", label: "Gallery", key: "gallery" },
  { href: "#contact", label: "Contact", key: "contact" },
];

export default function Header({ settings, visible, heroGone, homePage = true }) {
  const [open, setOpen] = useState(false);
  const wa = contactLink("whatsapp", settings, WHATSAPP_MESSAGE);
  const tel = contactLink("phone", settings);
  const homeHref = (href) => homePage ? href : `/${href}`;
  const sectionOrder = settings.section_order || [];
  const rank = (key) => key === null ? -1 : Math.max(0, sectionOrder.indexOf(key));
  const navItems = NAV.slice().sort((left, right) => rank(left.key) - rank(right.key));
  const logo = settings.logo_url || "/images/ajitha-dental-clinic-logo.png";
  const logoAlt = settings.logo_alt || `${settings.brand_name} logo`;
  const brandWords = (settings.brand_name || "").trim().split(/\s+/);
  if (!brandWords[0]) brandWords.push("AJITHA", "DENTAL", "CARE");

  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className={`site-header${heroGone ? " is-solid" : ""}`} id="siteHeader">
      <div className="container header-inner">
        <a href={homeHref("#home")} className="brand" aria-label="Ajitha Dental Care home">
          <img className="brand-logo" src={logo} alt={logoAlt} decoding="async" />
          <span className="brand-text">
            <span className="brand-name">
              <span className="brand-name-first">{brandWords[0]}</span>{" "}
              <span className="brand-name-rest">{brandWords.slice(1).join(" ")}</span>
            </span>
          </span>
        </a>

        <div className="header-actions">
          <a {...wa} className="header-wa" aria-label="Chat with us on WhatsApp"><WhatsAppIcon size={22} /></a>
          <button className="nav-toggle" id="navToggle" type="button" aria-expanded={open}
            aria-controls="primaryNav" aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}>
            <span /><span /><span />
          </button>
        </div>

        <nav className={`primary-nav${open ? " is-open" : ""}`} id="primaryNav" aria-label="Primary">
          <ul>
            {navItems.filter((item) => !item.key || visible[item.key] !== false).map((item) => (
              <li key={item.href}>
                <a href={homeHref(item.href)} onClick={() => setOpen(false)}>{item.label}</a>
              </li>
            ))}
            <li>
              <a href="/admin/login" onClick={() => setOpen(false)}>Admin</a>
            </li>
            <li className="nav-wa-item">
              <a {...wa} className="nav-wa" aria-label="Chat with us on WhatsApp"
                onClick={(e) => { wa.onClick?.(e); setOpen(false); }}>
                <WhatsAppIcon size={20} />
              </a>
            </li>
            <li>
              <a {...tel} className="btn btn-primary btn-small" aria-label="Call Ajitha Dental Care now"
                onClick={(e) => { tel.onClick?.(e); setOpen(false); }}>
                <PhoneIcon size={16} /><span>Call Now</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
