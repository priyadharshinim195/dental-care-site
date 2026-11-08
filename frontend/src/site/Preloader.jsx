import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./hooks";

/* Shows once per page load. It leaves when essentials are ready, and has a five-second
   safety timeout for requests that never resolve. */
export function usePreloaderGate(ready) {
  const [phase, setPhase] = useState("show");
  useEffect(() => {
    let exitTimer;
    let goneTimer;
    let finished = false;
    const begin = (timedOut = false) => {
      if (finished) return;
      finished = true;
      if (timedOut) {
        setPhase("exit");
        goneTimer = setTimeout(() => setPhase("gone"), 800);
        return;
      }
      const minWait = prefersReducedMotion() ? 0 : 900;
      exitTimer = setTimeout(() => {
        setPhase("exit");
        goneTimer = setTimeout(() => setPhase("gone"), 800);
      }, minWait);
    };
    if (ready) begin();
    const safety = setTimeout(() => begin(true), 5000);
    return () => {
      clearTimeout(safety);
      clearTimeout(exitTimer);
      clearTimeout(goneTimer);
    };
  }, [ready]);
  return phase;
}

export default function Preloader({ phase, settings }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = settings.logo_url || "/images/ajitha-dental-clinic-logo.png";
  const label = settings.logo_alt || settings.brand_name;
  return (
    <div className={`site-preloader${phase === "exit" ? " is-exiting" : ""}`} role="status"
      aria-live="polite" aria-label="Loading Ajitha Dental Care website">
      <div className="preloader-center">
        <span className="preloader-ring" aria-hidden="true" />
        {logoFailed ? (
          <p className="preloader-fallback">{settings.brand_name}</p>
        ) : (
          <img className="preloader-logo" src={logo} alt={label} onError={() => setLogoFailed(true)} />
        )}
      </div>
    </div>
  );
}
