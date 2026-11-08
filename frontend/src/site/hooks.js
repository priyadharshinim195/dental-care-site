import { useEffect, useMemo, useState } from "react";
import { publicApi } from "../lib/api";
import { DEFAULT_CONTENT, DEFAULT_SETTINGS, FALLBACK_HERO } from "./defaults";

/* Essential site settings and hero data do not wait for secondary content endpoints.
   Case studies have no illustrative fallback; other sections use their local defaults. */
export function useSiteData() {
  const [state, setState] = useState({
    status: "loading", site: null, hero: null, cases: null, gallery: null, testimonials: null,
    services: null,
  });

  useEffect(() => {
    let cancelled = false;
    const siteRequest = publicApi.site();
    const heroRequest = publicApi.heroImages();
    Promise.allSettled([siteRequest, heroRequest]).then(([site, hero]) => {
      if (cancelled) return;
      const ok = site.status === "fulfilled" || hero.status === "fulfilled";
      setState((current) => ({
        ...current,
        status: ok ? "ready" : "offline",
        site: site.status === "fulfilled" ? site.value : null,
        hero: hero.status === "fulfilled" ? hero.value : null,
      }));
    });

    Promise.allSettled([
      publicApi.caseStudies(), publicApi.gallery(), publicApi.testimonials(), publicApi.services(),
    ]).then(([cases, gallery, testimonials, services]) => {
      if (cancelled) return;
      setState((current) => ({
        ...current,
        cases: cases.status === "fulfilled" ? cases.value : null,
        gallery: gallery.status === "fulfilled" ? gallery.value : null,
        testimonials: testimonials.status === "fulfilled" ? testimonials.value : null,
        services: services.status === "fulfilled" ? services.value : null,
      }));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const settings = { ...DEFAULT_SETTINGS, ...(state.site?.settings || {}) };
    const content = { ...DEFAULT_CONTENT, ...(state.site?.content || {}) };
    // Keep the site visible while offline; an empty API result is an intentional admin choice.
    const slides = state.hero === null ? FALLBACK_HERO : state.hero;
    return {
      status: state.status, settings, content, slides, publishedCases: state.cases,
      gallery: state.gallery, testimonials: state.testimonials, services: state.services,
    };
  }, [state]);
}

/* Resolves true once an image has loaded or failed, so the preloader never waits forever. */
export function useImageReady(url) {
  const [ready, setReady] = useState(!url);
  useEffect(() => {
    if (!url) {
      setReady(true);
      return undefined;
    }
    let active = true;
    const img = new Image();
    img.fetchPriority = "high";
    const done = () => active && setReady(true);
    img.onload = done;
    img.onerror = done;
    img.src = url;
    if (img.complete) done();
    return () => {
      active = false;
    };
  }, [url]);
  return ready;
}

/* Header: solid background once the hero has scrolled away, and the hero text fades on scroll. */
export function useScrollState() {
  const [scrolled, setScrolled] = useState(false);
  const [heroGone, setHeroGone] = useState(false);
  useEffect(() => {
    const update = () => {
      setScrolled(window.scrollY > 0);
      const hero = document.getElementById("home");
      const header = document.getElementById("siteHeader");
      if (hero && header) {
        setHeroGone(hero.getBoundingClientRect().bottom <= header.offsetHeight);
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return { scrolled, heroGone };
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* Scroll reveal, matching the original script: targets fade up with staggered timing. */
export function useReveal(deps) {
  useEffect(() => {
    document.documentElement.classList.add("js");
    const selector =
      ".service-card, .case-card, .case-study-card, .gallery-item, .why-item, .book-main, .about .split-content, .about-feature";
    const targets = Array.from(document.querySelectorAll(selector));
    const counts = new Map();
    targets.forEach((el) => {
      const parent = el.parentElement;
      const i = counts.get(parent) || 0;
      counts.set(parent, i + 1);
      el.style.setProperty("--d", `${Math.min(i, 4) * 120}ms`);
      el.classList.add("reveal");
    });
    const figure = document.querySelector(".about-figure");
    if (figure && !prefersReducedMotion()) figure.classList.add("reveal-ready");

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      if (figure) figure.classList.add("is-visible");
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    if (figure) io.observe(figure);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* Disabled links must not jump to the top of the page, as in the original script. */
export function stopDisabled(event) {
  event.preventDefault();
}

/* WhatsApp and phone links follow the original rules: disabled until the details are provided. */
export function contactLink(kind, settings, message) {
  if (kind === "whatsapp") {
    const digits = (settings.whatsapp_number || "").replace(/\D/g, "");
    if (digits) {
      return {
        href: `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
        target: "_blank",
        rel: "noopener noreferrer",
        title: "Chat with us on WhatsApp",
      };
    }
    return { href: "#", "aria-disabled": "true", title: "WhatsApp number not added yet", onClick: stopDisabled };
  }
  const tel = (settings.phone || "").replace(/[^\d+]/g, "");
  if (tel) return { href: `tel:${tel}`, title: "Call the clinic" };
  return { href: "#", "aria-disabled": "true", title: "Phone number not added yet", onClick: stopDisabled };
}

export const WHATSAPP_MESSAGE = "Hello Ajitha Dental Clinic, I would like to enquire about your dental services.";
