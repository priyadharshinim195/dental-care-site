/* Shared API client for the public site and the admin dashboard.
   - The access token lives in memory only (never localStorage).
   - The refresh token is an HttpOnly cookie that JavaScript cannot read.
   - A 401 on an authenticated call triggers one silent refresh and a retry. */

const state = { accessToken: null, refreshing: null };
export const AUTH_EXPIRED_EVENT = "clinic-admin-auth-expired";

export class ApiError extends Error {
  constructor(message, { status = 0, data = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  get fieldErrors() {
    return (this.data && this.data.errors) || {};
  }
}

export function setAccessToken(token) {
  state.accessToken = token || null;
}

function expireSession() {
  state.accessToken = null;
  if (typeof window !== "undefined") window.dispatchEvent(new window.Event(AUTH_EXPIRED_EVENT));
}

async function parseBody(response) {
  if (response.status === 204) return null;
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  return null;
}

function firstMessage(data, status) {
  if (data && data.errors) {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
    if (typeof first === "string") return first;
  }
  if (data && typeof data.detail === "string") return data.detail;
  if (status >= 500) return "The server had a problem. Please try again.";
  if (status === 0) return "Could not reach the server. Check your connection.";
  return "The request could not be completed.";
}

export async function refreshSession() {
  if (!state.refreshing) {
    state.refreshing = fetch("/api/auth/refresh/", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const data = await parseBody(response);
        if (!response.ok) {
          state.accessToken = null;
          throw new ApiError(firstMessage(data, response.status), { status: response.status, data });
        }
        state.accessToken = data.access;
        return data;
      })
      .finally(() => {
        state.refreshing = null;
      });
  }
  return state.refreshing;
}

export async function apiRequest(path, { method = "GET", json, form, auth = false, signal } = {}) {
  const url = `/api${path}`;
  const build = () => {
    const headers = { Accept: "application/json" };
    let body;
    if (json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(json);
    }
    if (form) body = form; // the browser sets the multipart boundary itself
    if (auth && state.accessToken) headers.Authorization = `Bearer ${state.accessToken}`;
    return { method, headers, body, credentials: "same-origin", cache: "no-store", signal };
  };

  let response = await fetch(url, build());
  if (response.status === 401 && auth) {
    try {
      await refreshSession();
    } catch {
      expireSession();
      throw new ApiError("Your session has ended. Please sign in again.", { status: 401 });
    }
    response = await fetch(url, build());
    if (response.status === 401) expireSession();
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(firstMessage(data, response.status), { status: response.status, data });
  }
  return data;
}

/* Public (no login) */
export const publicApi = {
  site: () => apiRequest("/public/site/"),
  heroImages: () => apiRequest("/public/hero-images/"),
  caseStudies: () => apiRequest("/public/case-studies/"),
  gallery: () => apiRequest("/public/gallery/"),
  testimonials: () => apiRequest("/public/testimonials/"),
  services: () => apiRequest("/public/services/"),
};

/* Admin (requires an authenticated dashboard role) */
export const admin = {
  get: (path) => apiRequest(path, { auth: true }),
  post: (path, json) => apiRequest(path, { method: "POST", json: json ?? {}, auth: true }),
  patch: (path, json) => apiRequest(path, { method: "PATCH", json, auth: true }),
  del: (path) => apiRequest(path, { method: "DELETE", auth: true }),
  upload: (method, path, formData) => apiRequest(path, { method, form: formData, auth: true }),
};

export function formWith(fields) {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) form.append(key, value);
  });
  return form;
}
