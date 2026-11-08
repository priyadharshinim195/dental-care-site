import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PublicSite from "../site/PublicSite";
import { Footer } from "../site/Sections";
import { contactLink } from "../site/hooks";
import { DEFAULT_SETTINGS } from "../site/defaults";
import CaseStudies, { BeforeAfter, toCardModel } from "../site/CaseStudies";
import { moveItem } from "../admin/hooks";

function mockFetch(handler) {
  globalThis.fetch = vi.fn(async (url) => handler(String(url)));
}

const json = (body, status = 200) => ({
  ok: status < 400, status,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => body,
});

describe("public site when the backend is unreachable", () => {
  beforeEach(() => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("still shows the original sections without inventing case studies", async () => {
    render(<PublicSite />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    expect(await screen.findByRole("heading", { name: "Comprehensive Dental Care" })).toBeInTheDocument();
    expect(screen.getByText(/Verified before-and-after case studies will appear here/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View Case Study/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Patient Feedback" })).toBeInTheDocument();
  });

  it("uses the clinic contact number on WhatsApp and phone links when the API is offline", async () => {
    const { container } = render(<PublicSite />);
    await screen.findByRole("heading", { name: "Comprehensive Dental Care" });
    const whatsappLinks = container.querySelectorAll('a[href^="https://wa.me/"]');
    expect(whatsappLinks.length).toBeGreaterThan(0);
    whatsappLinks.forEach((link) => {
      expect(link.href).toContain("https://wa.me/917358199090?text=");
      expect(link.target).toBe("_blank");
      expect(link.rel).toContain("noopener");
    });
    const phoneLinks = container.querySelectorAll('a[href^="tel:"]');
    expect(phoneLinks.length).toBeGreaterThan(0);
    phoneLinks.forEach((link) => expect(link.getAttribute("href")).toBe("tel:+917358199090"));
    expect(screen.getByText("[Clinic address to be added]")).toBeInTheDocument();
  });

  it("does not hold the initial page behind delayed secondary API requests", async () => {
    vi.stubGlobal("Image", class {
      complete = false;
      set src(_value) {
        this.complete = true;
        this.onload?.();
      }
    });
    mockFetch((url) => {
      if (url === "/api/public/site/") return Promise.resolve(json({ settings: {}, content: {} }));
      if (url === "/api/public/hero-images/") return Promise.resolve(json([]));
      return new Promise(() => {});
    });

    const { container } = render(<PublicSite />);
    expect(await screen.findByRole("heading", { name: "Comprehensive Dental Care" })).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(6));

    act(() => vi.advanceTimersByTime(1700));
    await waitFor(() => expect(container.querySelector(".site-preloader")).not.toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "AJITHA DENTAL CARE" })).toBeInTheDocument();
  });

  it("uses the saved website section order", async () => {
    const sectionOrder = ["contact", "about", "services", "case-studies", "why-choose-us", "connect", "testimonials", "gallery"];
    mockFetch((url) => {
      if (url === "/api/public/site/") {
        return Promise.resolve(json({ settings: { ...DEFAULT_SETTINGS, section_order: sectionOrder }, content: {} }));
      }
      if (url === "/api/public/hero-images/") return Promise.resolve(json([]));
      if (url.startsWith("/api/public/")) return Promise.resolve(json([]));
      return Promise.reject(new TypeError("Unexpected request"));
    });

    render(<PublicSite />);
    await screen.findByRole("heading", { name: "Get In Touch" });
    const ids = Array.from(document.querySelectorAll("#main > section")).map((section) => section.id);
    expect(ids).toEqual(["home", ...sectionOrder]);
  });
});

describe("contactLink", () => {
  it("builds a wa.me link only from digits", () => {
    const link = contactLink("whatsapp", { ...DEFAULT_SETTINGS, whatsapp_number: "+91 98765-43210" }, "Hi there");
    expect(link.href).toBe("https://wa.me/919876543210?text=Hi%20there");
  });
  it("uses the requested clinic WhatsApp number and pre-filled enquiry message", () => {
    const link = contactLink("whatsapp", DEFAULT_SETTINGS, "Hello Ajitha Dental Clinic, I would like to enquire about your dental services.");
    expect(link.href).toBe("https://wa.me/917358199090?text=Hello%20Ajitha%20Dental%20Clinic%2C%20I%20would%20like%20to%20enquire%20about%20your%20dental%20services.");
  });
  it("builds a tel link and keeps the plus sign", () => {
    expect(contactLink("phone", { ...DEFAULT_SETTINGS, phone: "+91 98765 43210" }).href).toBe("tel:+919876543210");
  });
});

describe("footer contact links", () => {
  it("uses the official logo beside an unhighlighted, regular-weight clinic name", () => {
    const { container } = render(<Footer content={{ "footer.tagline": "" }} settings={DEFAULT_SETTINGS} visible={{}} />);
    const brand = container.querySelector(".footer-brand");
    const logo = brand.querySelector("img");
    expect(logo).toHaveAttribute("src", "/images/ajitha-dental-clinic-logo.png");
    expect(brand.querySelectorAll("img")).toHaveLength(1);
    expect(brand).toHaveTextContent("AJITHA DENTAL CARE");
    expect(brand.querySelector(".brand-name-first")).not.toBeInTheDocument();
    expect(brand.querySelector(".brand-mark")).not.toBeInTheDocument();
  });

  it("uses the configured logo URL like the navbar", () => {
    const { container } = render(<Footer content={{ "footer.tagline": "" }} settings={{
      ...DEFAULT_SETTINGS, logo_url: "/media/branding/clinic-logo.png",
    }} visible={{}} />);
    expect(container.querySelector(".footer-brand-logo"))
      .toHaveAttribute("src", "/media/branding/clinic-logo.png");
  });

  it("uses the clinic contact number instead of stale social-link URLs", () => {
    render(<Footer content={{ "footer.tagline": "" }} settings={{
      ...DEFAULT_SETTINGS,
      social_links: [
        { label: "WhatsApp", url: "https://wa.me/old-number" },
        { label: "Call us", url: "tel:old-number" },
      ],
    }} visible={{}} />);
    expect(screen.getByText("WhatsApp").closest("a").href).toContain("https://wa.me/917358199090?text=");
    expect(screen.getByText("Call us").closest("a")).toHaveAttribute("href", "tel:+917358199090");
  });
});

describe("case study mapping", () => {
  const base = { slug: "s", title: "T", category: "C", summary: "", description: "Desc", challenge: "", solution: " ", result: "Result text", images: [] };
  const pairedStudy = (index) => ({
    ...base,
    slug: `case-${index}`,
    title: `Case ${index}`,
    images: [{ kind: "before", url: `/before-${index}.jpg` }, { kind: "after", url: `/after-${index}.jpg` }],
  });
  it("does not map legacy composite images into a comparison", () => {
    const model = toCardModel({ ...base, images: [{ kind: "composite", url: "/media/x.jpg", alt: "a", width: 10, height: 6 }] }, 0);
    expect(model.before).toBeNull();
    expect(model.after).toBeNull();
    expect(model.details).toEqual([["Final Result", "Result text"]]);
    expect(model.overview).toBe("Desc");
  });
  it("uses a before and after pair for the slider only when both exist", () => {
    const pair = toCardModel({ ...base, images: [
      { kind: "before", url: "/b.jpg" }, { kind: "after", url: "/a.jpg" }] }, 1);
    expect(pair.before.url).toBe("/b.jpg");
    expect(pair.after.url).toBe("/a.jpg");
    expect(pair.number).toBe("Case Study 02");
  });
  it("does not allow a process image to replace the comparison pair", () => {
    const processOnly = toCardModel({ ...base, images: [
      { kind: "before", url: "/b.jpg" },
      { kind: "process", url: "/p.jpg" },
    ] }, 0);
    expect(processOnly.before.url).toBe("/b.jpg");
    expect(processOnly.after).toBeNull();
    expect(processOnly.process).toBeUndefined();
  });

  it("supports keyboard adjustment of the comparison slider", () => {
    render(<BeforeAfter before={{ url: "/before.jpg" }} after={{ url: "/after.jpg" }} />);
    const handle = screen.getByRole("slider", { name: "Compare before and after" });
    expect(handle).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(handle).toHaveAttribute("aria-valuenow", "52");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(handle).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(handle, { key: "End" });
    expect(handle).toHaveAttribute("aria-valuenow", "100");
  });

  it("tracks pointer dragging across the comparison area", () => {
    const { container } = render(<BeforeAfter before={{ url: "/before.jpg" }} after={{ url: "/after.jpg" }} />);
    const comparison = container.querySelector(".ba-compare");
    vi.spyOn(comparison, "getBoundingClientRect").mockReturnValue({
      left: 0, right: 200, top: 0, bottom: 150, width: 200, height: 150, x: 0, y: 0, toJSON: () => ({}),
    });
    const handle = screen.getByRole("slider", { name: "Compare before and after" });
    const pointerDown = new Event("pointerdown", { bubbles: true, cancelable: true });
    Object.defineProperties(pointerDown, { pointerId: { value: 7 }, clientX: { value: 40 } });
    fireEvent(handle, pointerDown);
    expect(handle).toHaveAttribute("aria-valuenow", "20");
    const pointerMove = new Event("pointermove", { bubbles: true });
    Object.defineProperties(pointerMove, { pointerId: { value: 7 }, clientX: { value: 140 } });
    fireEvent(handle, pointerMove);
    expect(handle).toHaveAttribute("aria-valuenow", "70");
    const pointerUp = new Event("pointerup", { bubbles: true });
    Object.defineProperty(pointerUp, "pointerId", { value: 7 });
    fireEvent(handle, pointerUp);
  });

  it("uses the same comparison slider in cards and the case detail view", async () => {
    render(<CaseStudies content={{}} publishedCases={[
      { ...base, slug: "legacy", title: "Legacy case", images: [{ kind: "composite", url: "/legacy.jpg" }] },
      { ...base, slug: "paired", title: "Paired case", images: [
        { kind: "before", url: "/before.jpg" }, { kind: "after", url: "/after.jpg" },
      ] },
    ]} />);
    expect(screen.queryByRole("heading", { name: "Legacy case" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Paired case", level: 3 })).toBeInTheDocument();
    expect(screen.getAllByRole("slider", { name: "Compare before and after" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /View Case Study/ }));
    await screen.findByRole("heading", { name: "Paired case", level: 2 });
    expect(screen.getAllByRole("slider", { name: "Compare before and after" })).toHaveLength(2);
  });

  it("shows only the selected case's clinical galleries in treatment details", async () => {
    const studies = [
      {
        ...pairedStudy(1),
        treatment_details: "Treatment notes for case one.",
      },
      {
        ...pairedStudy(2),
        images: [
          ...pairedStudy(2).images,
          { kind: "xray", url: "/case-two-xray.jpg" },
          { kind: "xray", url: "/case-two-xray-lateral.jpg" },
          { kind: "surgery", url: "/case-two-surgery.jpg" },
        ],
      },
    ];
    const { container } = render(<CaseStudies content={{}} publishedCases={studies} />);
    expect(container.querySelector(".case-treatment-gallery")).not.toBeInTheDocument();

    const secondCard = container.querySelector('[data-case-card="case-2"]');
    fireEvent.click(within(secondCard).getByRole("button", { name: "View Treatment Details" }));
    await screen.findByRole("heading", { name: "Case 2", level: 2 });
    expect(screen.getByRole("heading", { name: "X-Ray Images" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "During Surgery" })).toBeInTheDocument();
    expect(container.querySelectorAll(".case-dialog img").length).toBeGreaterThan(0);
    expect(Array.from(container.querySelectorAll(".case-dialog img")).map((image) => image.getAttribute("src")))
      .toContain("/case-two-xray-lateral.jpg");
    expect(container.querySelector('.case-dialog img[src="/case-one-xray.jpg"]')).not.toBeInTheDocument();
    expect(container.querySelector(".case-dialog [role=slider]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to Case Studies" }));
    const firstCard = container.querySelector('[data-case-card="case-1"]');
    fireEvent.click(within(firstCard).getByRole("button", { name: "View Treatment Details" }));
    await screen.findByRole("heading", { name: "Case 1", level: 2 });
    expect(screen.queryByRole("heading", { name: "X-Ray Images" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "During Surgery" })).not.toBeInTheDocument();
    expect(screen.getByText("Treatment notes for case one.")).toBeInTheDocument();
  });

  it("limits the homepage to six cases and shows Explore All only when more exist", () => {
    const studies = Array.from({ length: 7 }, (_, index) => pairedStudy(index + 1));
    const { rerender } = render(<CaseStudies content={{}} publishedCases={studies} limit={6} />);
    expect(screen.getAllByRole("button", { name: /View Case Study/ })).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: "View Treatment Details" })).toHaveLength(6);
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
      .toEqual(studies.slice(0, 6).map((study) => study.title));
    expect(screen.getByRole("link", { name: /Explore All Cases/ })).toHaveAttribute("href", "/case-studies/");

    rerender(<CaseStudies content={{}} publishedCases={studies.slice(0, 6)} limit={6} />);
    expect(screen.getAllByRole("button", { name: /View Case Study/ })).toHaveLength(6);
    expect(screen.queryByRole("link", { name: /Explore All Cases/ })).not.toBeInTheDocument();

    rerender(<CaseStudies content={{}} publishedCases={[]} limit={6} />);
    expect(screen.queryByRole("link", { name: /Explore All Cases/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Verified before-and-after case studies will appear here/)).toBeInTheDocument();
  });

  it("keeps all cases available on the separate case studies page", async () => {
    const previousPath = window.location.pathname;
    window.history.pushState({}, "", "/case-studies/");
    mockFetch((url) => {
      if (url === "/api/public/site/") return Promise.resolve(json({ settings: {}, content: {} }));
      if (url === "/api/public/hero-images/") return Promise.resolve(json([]));
      if (url === "/api/public/case-studies/") return Promise.resolve(json(
        Array.from({ length: 7 }, (_, index) => pairedStudy(index + 1)),
      ));
      if (url === "/api/public/gallery/" || url === "/api/public/testimonials/") return Promise.resolve(json([]));
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    try {
      render(<PublicSite />);
      expect(await screen.findByRole("heading", { name: "All Case Studies" })).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /View Case Study/ })).toHaveLength(7);
      expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent))
        .toEqual(Array.from({ length: 7 }, (_, index) => `Case ${index + 1}`));
      expect(screen.queryByRole("link", { name: /Explore All Cases/ })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Back to Case Studies/ })).toHaveAttribute("href", "/#case-studies");
    } finally {
      window.history.replaceState({}, "", previousPath);
    }
  });

  it("smoothly scrolls to the case studies section when the landing page opens with its anchor", async () => {
    const previousUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
    window.history.pushState({}, "", "/#case-studies");
    mockFetch((url) => {
      if (url === "/api/public/site/") return Promise.resolve(json({ settings: {}, content: {} }));
      if (url === "/api/public/hero-images/" || url === "/api/public/case-studies/"
        || url === "/api/public/gallery/" || url === "/api/public/testimonials/") {
        return Promise.resolve(json([]));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    try {
      render(<PublicSite />);
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "start",
      }));
      expect(document.getElementById("case-studies")).toBeInTheDocument();
    } finally {
      window.history.replaceState({}, "", previousUrl);
      if (originalScrollIntoView) window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      else delete window.HTMLElement.prototype.scrollIntoView;
    }
  });
});

describe("admin reorder helper", () => {
  it("moves an item to the drop target position", () => {
    const list = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(moveItem(list, 3, 1).map((i) => i.id)).toEqual([3, 1, 2]);
    expect(moveItem(list, 1, 1)).toBeNull();
  });
});
