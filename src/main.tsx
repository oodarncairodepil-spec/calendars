import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { logFontDebug } from "./lib/font-debug";

// #region agent log
// Log initial page load
const googleFontsLinks = typeof document !== 'undefined' 
  ? Array.from(document.querySelectorAll('link[href*="fonts.googleapis.com"]')).map((link: any) => link.href)
  : [];

logFontDebug('main.tsx:init', 'Application starting', {
  href: typeof window !== 'undefined' ? window.location.href : 'unknown',
  referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
  hasGoogleFontsLink: typeof document !== 'undefined' && !!document.querySelector('link[href*="fonts.googleapis.com"]'),
  googleFontsLinks: googleFontsLinks,
  googleFontsLinkCount: googleFontsLinks.length,
}, 'E');

// Log Google Fonts link details
if (googleFontsLinks.length > 0) {
  console.log(`[Font Debug ${typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'vercel' : 'localhost'}] Google Fonts link:`, googleFontsLinks[0]);
  // Check if custom fonts are in the link
  const customFonts = ['Lovely Coffee', 'Cadillac', 'Freebooter Script'];
  customFonts.forEach(fontName => {
    const inLink = googleFontsLinks[0]?.includes(fontName.replace(' ', '+')) || googleFontsLinks[0]?.includes(encodeURIComponent(fontName));
    console.log(`[Font Debug ${typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'vercel' : 'localhost'}] Custom font "${fontName}" in Google Fonts link: ${inLink ? 'YES' : 'NO'}`);
  });
}
// #endregion

// Render app immediately - fonts will load asynchronously via Google Fonts link tag
// The font-display: swap ensures text is visible while fonts load
const root = createRoot(document.getElementById("root")!);
root.render(<App />);
