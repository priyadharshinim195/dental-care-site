/* Icon paths copied from the original index.html so every icon renders identically. */
export const WA_PATHS = (
  <>
    <path d="M20.5 11.6a8.5 8.5 0 0 1-12.4 7.5L3.5 20.5l1.5-4.5A8.5 8.5 0 1 1 20.5 11.6z" />
    <path d="M9 9.2c.2-.4.5-.5.8-.5h.5l.6 1.6-.7.9c.5 1 1.3 1.8 2.3 2.3l.9-.7 1.6.6v.5c0 .3-.1.6-.5.8-.5.3-1.2.6-2 .4-2.1-.6-3.8-2.3-4.4-4.4-.1-.8.2-1.5.5-2z" />
  </>
);

export const PHONE_PATH = (
  <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z" />
);

export function WhatsAppIcon({ size = 18, strokeWidth = 1.6 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {WA_PATHS}
    </svg>
  );
}

export function PhoneIcon({ size = 18, strokeWidth = 1.6 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PHONE_PATH}
    </svg>
  );
}

/* Reusable tooth glyph. The hidden <symbol id="tooth"> is rendered once by PublicSite. */
export function ToothUse({ size = 20, className }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      <use href="#tooth" />
    </svg>
  );
}

export function ToothSymbols() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <symbol id="tooth" viewBox="0 0 32 32">
        <path d="M8 6c-2.5 0-4 2-4 5 0 3 1 5 2 8s1.5 7 3.5 7 2.5-3 3.5-6c.4-1.3 1-1.3 1.5-1.3s1.1 0 1.5 1.3c1 3 1.5 6 3.5 6s2.5-4 3.5-7 2-5 2-8c0-3-1.5-5-4-5-2 0-3 1-4 1s-2-1-4-1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </symbol>
    </svg>
  );
}
