import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminApp from "../admin/AdminApp";
import Header from "../site/Header";
import { DEFAULT_SETTINGS } from "../site/defaults";

const response = (data, status = 200) => ({
  ok: status < 400,
  status,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => data,
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public Admin navigation", () => {
  it("uses the official logo when branding settings have no uploaded logo", () => {
    render(<Header settings={DEFAULT_SETTINGS} visible={{}} heroGone={false} />);
    expect(screen.getByRole("img", { name: DEFAULT_SETTINGS.logo_alt }))
      .toHaveAttribute("src", "/images/ajitha-dental-clinic-logo.png");
  });

  it("adds a separate Admin link without removing public navigation", () => {
    render(<Header settings={{ ...DEFAULT_SETTINGS, logo_url: "/media/branding/clinic-logo.png",
      logo_alt: "Ajitha Dental Care logo" }} visible={{}} heroGone={false} />);
    const logo = screen.getByRole("img", { name: "Ajitha Dental Care logo" });
    expect(logo).toHaveAttribute("src", "/media/branding/clinic-logo.png");
    expect(logo).toHaveClass("brand-logo");
    expect(screen.getByText("AJITHA")).toBeInTheDocument();
    expect(screen.getByText("DENTAL CARE")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin/login");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "#home");
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "#about");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "#contact");

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    fireEvent.click(screen.getByRole("link", { name: "Admin" }));
    expect(screen.getByRole("button", { name: "Open menu" })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("admin route protection and session redirect", () => {
  it("sends an unauthenticated dashboard visitor to login", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => response({ detail: "Please sign in." }, 401)));
    window.history.replaceState({}, "", "/admin/dashboard");

    render(<AdminApp />);

    expect(await screen.findByRole("heading", { name: "Sign in to the admin" })).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      "/api/admin/dashboard/overview/",
      expect.anything(),
    );
  });

  it("clears the admin session when token refresh fails during a protected request", async () => {
    let refreshCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url) === "/api/auth/refresh/") {
        refreshCalls += 1;
        if (refreshCalls === 1) {
          return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
        }
        return response({ detail: "Session expired." }, 401);
      }
      if (String(url) === "/api/admin/dashboard/overview/") {
        return response({ detail: "Token expired." }, 401);
      }
      throw new Error(`Unexpected request: ${url}`);
    }));
    window.history.replaceState({}, "", "/admin/dashboard");

    render(<AdminApp />);

    expect(await screen.findByRole("heading", { name: "Sign in to the admin" })).toBeInTheDocument();
    expect(refreshCalls).toBe(2);
  });

  it("authenticates through the API and redirects to the dashboard", async () => {
    const overview = {
      case_studies: { total: 0, published: 0, draft: 0 },
      hero_images: { total: 0, active: 0, max: 6 },
      media: { total: 0, images: 0, videos: 0 },
      content_items: 0,
      contact_fields_missing: [],
      recent_activity: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      if (String(url) === "/api/auth/refresh/") return response({ detail: "No session." }, 401);
      if (String(url) === "/api/auth/login/") {
        return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
      }
      if (String(url) === "/api/admin/dashboard/overview/") return response(overview);
      throw new Error(`Unexpected request: ${url} ${options.method || "GET"}`);
    }));
    window.history.replaceState({}, "", "/admin/login");

    render(<AdminApp />);
    await screen.findByRole("heading", { name: "Sign in to the admin" });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "clinic-admin" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-horse" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/dashboard");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/auth/login/",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ username: "clinic-admin", password: "correct-horse" }) }),
    );
  });

  it("redirects an authenticated visitor from login to the protected dashboard", async () => {
    const overview = {
      case_studies: { total: 0, published: 0, draft: 0 },
      hero_images: { total: 0, active: 0, max: 6 },
      media: { total: 0, images: 0, videos: 0 },
      content_items: 0,
      contact_fields_missing: [],
      recent_activity: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url) === "/api/auth/refresh/") {
        return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
      }
      if (String(url) === "/api/admin/dashboard/overview/") return response(overview);
      throw new Error(`Unexpected request: ${url}`);
    }));
    window.history.replaceState({}, "", "/admin/login");

    render(<AdminApp />);

    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/admin/dashboard/overview/",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer access-token" }) }),
    ));
    expect(screen.getByRole("link", { name: "Website content" })).toHaveAttribute("href", "/admin/website-content");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/admin/settings");
  });

  it("clears recent activities only after confirmation and updates the dashboard immediately", async () => {
    const overview = {
      case_studies: { total: 0, published: 0, draft: 0 },
      hero_images: { total: 0, active: 0, max: 6 },
      media: { total: 0, images: 0, videos: 0 },
      content_items: 0,
      contact_fields_missing: [],
      recent_activity: [{
        id: 1,
        actor_name: "Clinic admin",
        action: "updated",
        entity: "case study",
        summary: "Updated case details",
        created_at: "2026-01-01T10:00:00Z",
      }],
    };
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      if (String(url) === "/api/auth/refresh/") {
        return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
      }
      if (String(url) === "/api/admin/dashboard/overview/") return response(overview);
      if (String(url) === "/api/admin/activity/clear/" && options.method === "DELETE") {
        return response(null, 204);
      }
      throw new Error(`Unexpected request: ${url} ${options.method || "GET"}`);
    }));
    window.history.replaceState({}, "", "/admin/dashboard");

    render(<AdminApp />);

    expect(await screen.findByText(/Updated case details/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    expect(screen.getByText("Are you sure you want to clear all recent activities?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText(/Updated case details/)).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      "/api/admin/activity/clear/",
      expect.objectContaining({ method: "DELETE" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear All" }));
    const confirmationButtons = screen.getAllByRole("button", { name: "Clear All" });
    fireEvent.click(confirmationButtons[confirmationButtons.length - 1]);

    expect(await screen.findByText("No recent activities.")).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/admin/activity/clear/",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("opens the website content modules and account settings at their requested routes", async () => {
    const settings = {
      brand_name: "Ajitha Dental Care",
      logo_alt: "Ajitha Dental Care logo",
      address: "",
      phone: "",
      email: "",
      hours: "",
      maps_url: "",
      whatsapp_number: "",
      seo_title: "",
      seo_description: "",
      social_links: [],
      hero_interval_ms: 2500,
      hero_fade_ms: 700,
      section_visibility: {},
    };
    vi.stubGlobal("fetch", vi.fn(async (url) => {
      if (String(url) === "/api/auth/refresh/") {
        return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
      }
      if (String(url) === "/api/admin/dashboard/overview/") {
        return response({
          case_studies: { total: 0, published: 0, draft: 0 },
          hero_images: { total: 0, active: 0, max: 6 },
          media: { total: 0, images: 0, videos: 0 },
          content_items: 0,
          contact_fields_missing: [],
          recent_activity: [],
        });
      }
      if (String(url) === "/api/admin/site-settings/") return response(settings);
      if (String(url) === "/api/admin/site-content/") return response([]);
      if (String(url) === "/api/admin/testimonials/") return response([]);
      if (String(url) === "/api/admin/gallery-images/") return response([]);
      throw new Error(`Unexpected request: ${url}`);
    }));
    window.history.replaceState({}, "", "/admin/dashboard");

    render(<AdminApp />);

    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(screen.getByRole("link", { name: "Website content" }));
    expect(await screen.findByRole("heading", { name: "Website content" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Testimonials" }));
    expect(await screen.findByText("No testimonials yet")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/website-content");

    fireEvent.click(screen.getByRole("tab", { name: "Gallery" }));
    expect(await screen.findByText("No gallery images yet")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("link", { name: "Settings" }));
    expect(await screen.findByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/admin/settings");
  });

  it("saves contact details to the API, reloads them, and keeps them after a page refresh", async () => {
    let storedSettings = {
      brand_name: "Ajitha Dental Care",
      logo_alt: "Ajitha Dental Care logo",
      address: "Old address",
      phone: "+91 73581 99090",
      email: "old@example.com",
      hours: "Old hours",
      maps_url: "https://maps.example/old",
      whatsapp_number: "917358199090",
      seo_title: "Ajitha Dental Care",
      seo_description: "Dental care",
      social_links: [],
      hero_interval_ms: 2500,
      hero_fade_ms: 700,
      section_visibility: {},
    };
    let finishPatch;
    const overview = {
      case_studies: { total: 0, published: 0, draft: 0 },
      hero_images: { total: 0, active: 0, max: 6 },
      media: { total: 0, images: 0, videos: 0 },
      content_items: 0,
      contact_fields_missing: [],
      recent_activity: [],
    };
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      if (String(url) === "/api/auth/refresh/") {
        return response({ access: "access-token", user: { username: "clinic-admin", role: "admin" } });
      }
      if (String(url) === "/api/admin/dashboard/overview/") return response(overview);
      if (String(url) === "/api/admin/site-settings/" && options.method === "PATCH") {
        const updates = JSON.parse(options.body);
        return new Promise((resolve) => {
          finishPatch = () => {
            storedSettings = { ...storedSettings, ...updates };
            resolve(response(storedSettings));
          };
        });
      }
      if (String(url) === "/api/admin/site-settings/") return response(storedSettings);
      if (String(url) === "/api/admin/site-content/") return response([]);
      throw new Error(`Unexpected request: ${url} ${options.method || "GET"}`);
    }));
    window.history.replaceState({}, "", "/admin/dashboard");

    const firstRender = render(<AdminApp />);
    await screen.findByRole("heading", { name: "Overview" });
    fireEvent.click(screen.getByRole("link", { name: "Website content" }));
    await screen.findByRole("heading", { name: "Contact details" });

    fireEvent.change(screen.getByLabelText("Clinic phone number"), { target: { value: "+91 81234 56789" } });
    fireEvent.change(screen.getByLabelText("WhatsApp number"), { target: { value: "+91 98765 43210" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "care@ajitha.example" } });
    fireEvent.change(screen.getByLabelText("Clinic address"), { target: { value: "12 New Clinic Road, Chennai" } });
    fireEvent.change(screen.getByLabelText("Google Maps link"), { target: { value: "https://maps.example/new-clinic" } });
    fireEvent.change(screen.getByLabelText("Opening hours"), { target: { value: "Mon-Sat, 9 AM-6 PM" } });
    fireEvent.click(screen.getByRole("button", { name: "Save contact details" }));

    expect(await screen.findByRole("button", { name: /Saving contact details/ })).toBeDisabled();
    expect(finishPatch).toBeTypeOf("function");
    await act(async () => finishPatch());

    expect(await screen.findByText("Contact details saved.")).toBeInTheDocument();
    expect(storedSettings).toMatchObject({
      phone: "+91 81234 56789",
      whatsapp_number: "919876543210",
      email: "care@ajitha.example",
      address: "12 New Clinic Road, Chennai",
      maps_url: "https://maps.example/new-clinic",
      hours: "Mon-Sat, 9 AM-6 PM",
    });

    firstRender.unmount();
    window.history.replaceState({}, "", "/admin/website-content");
    render(<AdminApp />);
    await screen.findByRole("heading", { name: "Contact details" });
    expect(screen.getByLabelText("Clinic phone number")).toHaveValue("+91 81234 56789");
    expect(screen.getByLabelText("WhatsApp number")).toHaveValue("919876543210");
    expect(screen.getByLabelText("Email")).toHaveValue("care@ajitha.example");
    expect(screen.getByLabelText("Clinic address")).toHaveValue("12 New Clinic Road, Chennai");
    expect(screen.getByLabelText("Google Maps link")).toHaveValue("https://maps.example/new-clinic");
    expect(screen.getByLabelText("Opening hours")).toHaveValue("Mon-Sat, 9 AM-6 PM");
  });
});
