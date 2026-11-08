import "@testing-library/jest-dom/vitest";

// jsdom does not implement matchMedia; the site reads it for reduced-motion and viewport checks.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  });
}
