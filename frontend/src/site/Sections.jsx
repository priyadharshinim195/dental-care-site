import { contactLink, WHATSAPP_MESSAGE } from "./hooks";
import { GALLERY, SERVICES, TESTIMONIALS } from "./defaults";
import { PhoneIcon, ToothUse, WhatsAppIcon } from "./icons";

export function About({ content, settings = {} }) {
  const image = settings.about_image_url || "/images/about-clinic-01.jpg";
  return (
    <section className="section about" id="about" aria-labelledby="aboutTitle">
      <div className="container split">
        <figure className="about-figure">
          <img className="about-img" src={image} width={settings.about_image_width || 1200}
            height={settings.about_image_height || 900} loading="lazy"
            decoding="async" alt={settings.about_image_alt || "A view inside Ajitha Dental Care"} />
        </figure>
        <div className="split-content">
          <p className="eyebrow">{content["about.eyebrow"]}</p>
          <h2 id="aboutTitle" className="section-title">{content["about.title"]}</h2>
          <p className="subhead">{content["about.subhead"]}</p>
          <p>{content["about.body"]}</p>
          <div className="about-features" aria-label="Our approach to care">
            <article className="about-feature">
              <span className="about-feature-icon" aria-hidden="true"><ToothUse size={32} /></span>
              <h3>{content["about.feature1.title"]}</h3>
              <p>{content["about.feature1.text"]}</p>
            </article>
            <article className="about-feature">
              <span className="about-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32"><path d="M16 4c-4 5-9 10-9 16a9 9 0 0 0 18 0c0-6-5-11-9-16z" /><path d="M12 21a4 4 0 0 0 4 4" /></svg>
              </span>
              <h3>{content["about.feature2.title"]}</h3>
              <p>{content["about.feature2.text"]}</p>
            </article>
            <article className="about-feature">
              <span className="about-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 32 32"><path d="M16 27s-10-6-10-14a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 8-10 14-10 14z" /></svg>
              </span>
              <h3>{content["about.feature3.title"]}</h3>
              <p>{content["about.feature3.text"]}</p>
            </article>
          </div>
          <a href="#services" className="btn btn-primary">Learn More <span className="card-arrow" aria-hidden="true">&rarr;</span></a>
        </div>
      </div>
    </section>
  );
}

export function Services({ content, services }) {
  const items = services == null
    ? SERVICES.map((service, index) => ({
      id: service.title,
      title: content[`services.${index + 1}.title`] || service.title,
      description: content[`services.${index + 1}.text`] || service.text,
      image_url: `/images/${service.img}`,
      image_alt: service.alt,
      image_width: 800,
      image_height: 597,
    }))
    : services;
  return (
    <section className="section services" id="services" aria-labelledby="servicesTitle">
      <div className="container">
        <header className="section-head center">
          <p className="eyebrow">{content["services.eyebrow"]}</p>
          <h2 id="servicesTitle" className="section-title">{content["services.title"]}</h2>
          <p className="section-sub">{content["services.sub"]}</p>
        </header>
      </div>
      <div className="service-marquee" id="serviceMarquee" role="region" aria-label="Our services">
        <div className="service-track" id="serviceTrack">
          <div className="service-group">
            {items.map((service) => {
              const title = service.title;
              return (
                <article className="service-card" key={service.id}>
                  <div className="service-media media-placeholder">
                    <span className="img-zoom">
                      {service.image_url && <img className="service-img" src={service.image_url}
                        width={service.image_width || undefined} height={service.image_height || undefined}
                        decoding="async" alt={service.image_alt || title} />}
                    </span>
                    <span className="service-badge" aria-hidden="true"><ToothUse size={20} /></span>
                  </div>
                  <div className="service-body">
                    <h3>{title}</h3>
                    <p>{service.description}</p>
                    <a href="#connect" className="card-link">Learn More <span className="card-arrow" aria-hidden="true">&rarr;</span>
                      <span className="sr-only"> {title}</span></a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhyChooseUs({ content }) {
  return (
    <section className="section why" id="why-choose-us" aria-labelledby="whyTitle">
      <div className="container">
        <header className="why-head">
          <p className="eyebrow">{content["why.eyebrow"]}</p>
          <h2 id="whyTitle" className="section-title">{content["why.title"]}</h2>
        </header>
        <div className="why-grid">
          <div className="why-item">
            <span className="why-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="16" r="7" /><path d="M10 40c1.5-7 7-11 14-11s12.5 4 14 11" /></svg>
            </span>
            <div><h3>{content["why.1.title"]}</h3><p>{content["why.1.text"]}</p></div>
          </div>
          <div className="why-item">
            <span className="why-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 6l14 5v11c0 9-6 16-14 20-8-4-14-11-14-20V11z" /><path d="M18 24l4 4 8-8" /></svg>
            </span>
            <div><h3>{content["why.2.title"]}</h3><p>{content["why.2.text"]}</p></div>
          </div>
          <div className="why-item">
            <span className="why-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 42s-13-7.5-13-18a7 7 0 0 1 13-3.5A7 7 0 0 1 37 24c0 10.5-13 18-13 18z" /></svg>
            </span>
            <div><h3>{content["why.3.title"]}</h3><p>{content["why.3.text"]}</p></div>
          </div>
          <div className="why-item">
            <span className="why-icon" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M24 8c-6 8-12 13-12 21a12 12 0 0 0 24 0c0-8-6-13-12-21z" /><path d="M19 30a5 5 0 0 0 5 5" /></svg>
            </span>
            <div><h3>{content["why.4.title"]}</h3><p>{content["why.4.text"]}</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Connect({ content, settings }) {
  const wa = contactLink("whatsapp", settings, WHATSAPP_MESSAGE);
  const tel = contactLink("phone", settings);
  const scriptLines = String(content["connect.script"] || "").split("\n");
  return (
    <section className="section book" id="connect" aria-labelledby="connectTitle">
      <div className="container book-grid">
        <div className="book-media">
          <img className="book-img" src="/images/book-clinic-01.jpg" width="800" height="1423" loading="lazy"
            decoding="async" alt="Ajitha Dental Care reception" />
        </div>
        <div className="book-main">
          <p className="eyebrow">{content["connect.eyebrow"]}</p>
          <h2 id="connectTitle" className="section-title">{content["connect.title"]}</h2>
          <p className="subhead">{content["connect.subhead"]}</p>
          <p className="book-text">{content["connect.text"]}</p>
          <div className="book-contact-actions">
            <a {...wa} className="btn btn-primary" aria-label="Chat with us on WhatsApp">
              <WhatsAppIcon /><span>WhatsApp</span>
            </a>
            <a {...tel} className="btn btn-outline-dark" aria-label="Call Ajitha Dental Care now">
              <PhoneIcon /><span>Call Now</span>
            </a>
          </div>
        </div>
        <aside className="book-aside" aria-hidden="true">
          <p className="book-script">
            {scriptLines.map((line, i) => (
              <span key={i}>{i > 0 && <br />}{line}</span>
            ))}
          </p>
          <span className="book-rule" />
          <ToothUse size={26} />
        </aside>
      </div>
    </section>
  );
}

export function Testimonials({ content, items }) {
  const isLive = Array.isArray(items);
  const testimonials = isLive ? items : TESTIMONIALS;
  return (
    <section className="section testimonials" id="testimonials" aria-labelledby="testimonialsTitle">
      <div className="container">
        <header className="section-head center">
          <p className="eyebrow">{content["testimonials.eyebrow"]}</p>
          <h2 id="testimonialsTitle" className="section-title">{content["testimonials.title"]}</h2>
          {!isLive && <p className="testimonial-sample-notice">{content["testimonials.notice"]}</p>}
        </header>
        <div className="slider" id="slider">
          <div className="slider-viewport" id="sliderViewport" tabIndex={0}
            aria-label={`${isLive ? "Patient testimonial" : "Sample feedback"} cards; scroll horizontally to browse`}>
            <div className="slider-track" id="sliderTrack">
              <div className="testimonial-group">
                {testimonials.map((t, i) => {
                  const displayName = t.display_name || t.displayName;
                  const quote = t.quote;
                  return (
                    <article className="testimonial" role="group" aria-label={`Testimonial ${i + 1}`} key={t.id || displayName}>
                      {!isLive && <span className="placeholder-badge">Placeholder · Not a patient review</span>}
                      <header className="testimonial-header">
                        <cite>{displayName}</cite>
                        <span className="testimonial-status">{isLive ? "Patient feedback" : "Sample feedback"}</span>
                      </header>
                      <p className="testimonial-placeholder-message">{quote}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Gallery({ content, images }) {
  const photos = images === null ? GALLERY : images;
  return (
    <section className="section gallery" id="gallery" aria-labelledby="galleryTitle">
      <div className="container">
        <header className="section-head center">
          <p className="eyebrow">{content["gallery.eyebrow"]}</p>
          <h2 id="galleryTitle" className="section-title">{content["gallery.title"]}</h2>
        </header>
        <div className="gallery-grid">
          {photos.map((photo) => (
            <figure className="gallery-item" key={photo.id || photo.src}>
              <span className="img-zoom">
                <img className="gallery-img" src={photo.url || photo.src} width={photo.width || 1200} height={photo.height || 900} loading="lazy"
                  decoding="async" alt={photo.alt || ""} />
              </span>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact({ content, settings }) {
  const address = (settings.address || "").trim();
  const mapsUrl = settings.maps_url ? settings.maps_url : address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}` : "";
  return (
    <section className="contact" id="contact" aria-labelledby="contactTitle">
      <div className="container contact-grid">
        <div className="contact-intro">
          <h2 id="contactTitle">{content["contact.title"]}</h2>
          <p>{content["contact.text"]}</p>
        </div>
        <ContactItem label="Clinic Address" icon="pin" value={address} placeholder="[Clinic address to be added]" />
        <ContactItem label="Phone" icon="phone" value={settings.phone} placeholder="[Contact number to be added]"
          href={settings.phone ? `tel:${settings.phone.replace(/[^\d+]/g, "")}` : null} />
        <ContactItem label="Opening Hours" icon="clock" value={settings.hours} placeholder="[Opening hours to be added]" />
        <ContactItem label="Email" icon="mail" value={settings.email} placeholder="[Email address, if available]"
          href={settings.email ? `mailto:${settings.email}` : null} />
        {mapsUrl ? (
          <a href={mapsUrl} className="btn btn-light contact-btn" target="_blank" rel="noopener noreferrer" id="directionsBtn">Get Directions</a>
        ) : (
          <a href="#" className="btn btn-light contact-btn" aria-disabled="true" id="directionsBtn"
            title="Available once the clinic's location is added">Get Directions</a>
        )}
      </div>
      <div className="container">
        <div className="map-frame" id="mapFrame">
          {address ? (
            <iframe title="Map showing the location of Ajitha Dental Care" loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin" allowFullScreen
              src={`https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`} />
          ) : (
            <p className="map-note" id="mapNote">Clinic map will appear here once the clinic address is added in the admin dashboard.</p>
          )}
        </div>
      </div>
    </section>
  );
}

const ICONS = {
  pin: <path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="1.5" /><path d="M3.5 6.5 12 13l8.5-6.5" /></>,
};

function ContactItem({ label, icon, value, placeholder, href }) {
  const text = value ? (
    href ? <a href={href} className="contact-value">{value}</a> : value
  ) : (
    <span className="placeholder-text">{placeholder}</span>
  );
  return (
    <dl className="contact-item">
      <dt>
        <span className="contact-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.4">{ICONS[icon]}</svg>
        </span>
        {label}
      </dt>
      <dd>{text}</dd>
    </dl>
  );
}

export function Footer({ content, settings, visible }) {
  const nav = [["about", "About"], ["services", "Services"], ["case-studies", "Case Studies"],
    ["testimonials", "Testimonials"], ["gallery", "Gallery"], ["contact", "Contact"]];
  const sectionOrder = settings.section_order || [];
  nav.sort(([left], [right]) => sectionOrder.indexOf(left) - sectionOrder.indexOf(right));
  return (
    <footer className="site-footer">
      <div className="container footer-top">
        <a href="#home" className="brand footer-brand" aria-label="Ajitha Dental Care home">
          <img className="footer-brand-logo"
            src={settings.logo_url || "/images/ajitha-dental-clinic-logo.png"}
            alt="" aria-hidden="true" decoding="async" />
          <span className="footer-brand-name">{settings.brand_name}</span>
        </a>
        <nav aria-label="Footer">
          <ul className="footer-links">
            {nav.filter(([key]) => visible[key] !== false).map(([key, label]) => (
              <li key={key}><a href={`#${key}`}>{label}</a></li>
            ))}
          </ul>
        </nav>
        <p className="footer-social">
          {settings.social_links && settings.social_links.length ? (
            settings.social_links.map((link) => {
              const label = String(link.label || "");
              const contact = /whatsapp/i.test(label)
                ? contactLink("whatsapp", settings, WHATSAPP_MESSAGE)
                : /\b(phone|call|telephone)\b/i.test(label) ? contactLink("phone", settings) : null;
              return (
                <a key={link.url} {...(contact || {})} href={contact?.href || link.url}
                  target={contact ? contact.target : "_blank"}
                  rel={contact ? contact.rel : "noopener noreferrer"}>{link.label}</a>
              );
            })
          ) : (
            <span className="placeholder-text">[Social links, when provided]</span>
          )}
        </p>
      </div>
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>&copy; {new Date().getFullYear()} {settings.brand_name}. {content["footer.copyright"]}</p>
          <p className="footer-tagline">{content["footer.tagline"]}</p>
        </div>
      </div>
    </footer>
  );
}
