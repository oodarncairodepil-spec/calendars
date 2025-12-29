import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logFontDebug } from "./lib/font-debug";

// #region agent log
// Log initial page load
logFontDebug('main.tsx:init', 'Application starting', {
  href: typeof window !== 'undefined' ? window.location.href : 'unknown',
  referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
  hasGoogleFontsLink: typeof document !== 'undefined' && !!document.querySelector('link[href*="fonts.googleapis.com"]'),
  googleFontsLinks: typeof document !== 'undefined' 
    ? Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]')).map((link: any) => link.href)
    : [],
}, 'E');
// #endregion

// Render app immediately - fonts will load asynchronously via Google Fonts link tag
// The font-display: swap ensures text is visible while fonts load
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
