import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/site.css";
import "./styles/site-enhancements.css";
import PublicSite from "./site/PublicSite";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <PublicSite />
  </StrictMode>,
);
