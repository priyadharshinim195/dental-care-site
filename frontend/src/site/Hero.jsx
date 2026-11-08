import { useEffect, useState } from "react";
import { contactLink, prefersReducedMotion, WHATSAPP_MESSAGE } from "./hooks";
import { PhoneIcon, WhatsAppIcon } from "./icons";

/* Automatic hero slideshow. Images crossfade and drift with a subtle scale; the loop restarts
   after the last image. It pauses while the tab is hidden and is static for reduced motion. */
export default function Hero({ slides, content, settings, scrolled }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;
  const interval = Math.max(1200, Number(settings.hero_interval_ms) || 2000);
  const fade = Math.max(200, Number(settings.hero_fade_ms) || 400);
  const reduce = prefersReducedMotion();

  useEffect(() => {
    setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || reduce) return undefined;
    const timer = setInterval(() => {
      if (document.hidden) return;
      setIndex((current) => (current + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [count, interval, reduce]);

  useEffect(() => {
    if (count < 2) return;
    const next = slides[(index + 1) % count];
    if (next && next.url) {
      const img = new Image();
      img.fetchPriority = "low";
      img.src = next.url;
    }
  }, [index, count, slides]);

  const whatsapp = contactLink("whatsapp", settings, WHATSAPP_MESSAGE);
  const phone = contactLink("phone", settings);
  const [line1, line2] = [content["hero.name"], content["hero.sub"]];

  return (
    <section className="hero" id="home" aria-labelledby="heroTitle">
      <div className="hero-stage">
        <div className="hero-canvas hero-slides" style={{ "--hero-fade": `${fade}ms` }}>
          {slides.map((slide, i) => (
            <img key={slide.id} src={slide.url} alt="" width={slide.width || undefined}
              height={slide.height || undefined} decoding="async"
              loading={i === 0 ? "eager" : "lazy"}
              fetchpriority={i === 0 ? "high" : "low"}
              className={`hero-slide${i === index ? " is-active" : ""}`} />
          ))}
        </div>
        <div className="hero-overlay" aria-hidden="true" />

        <div className={`hero-content${scrolled ? " is-scrolled" : ""}`} id="heroContent">
          <h1 id="heroTitle" className="hero-title">
            <span className="hero-name">{line1}</span>
            <span className="hero-sub">{line2}</span>
          </h1>
          <span className="hero-rule" aria-hidden="true" />
          <p className="hero-tagline">
            {content["hero.tagline"]} <em className="gold-em">{content["hero.tagline_accent"]}</em>
          </p>
          <p className="hero-text">{content["hero.text"]}</p>
          <div className="hero-actions">
            <a {...whatsapp} className="btn btn-primary" aria-label="Chat with us on WhatsApp">
              <WhatsAppIcon /><span>WhatsApp</span>
            </a>
            <a {...phone} className="btn btn-outline-light" aria-label="Call Ajitha Dental Care now">
              <PhoneIcon /><span>Call Now</span>
            </a>
            <a href="#services" className="btn btn-outline-light">Our Services</a>
          </div>
        </div>
      </div>
    </section>
  );
}
