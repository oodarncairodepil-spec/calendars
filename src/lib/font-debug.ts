/**
 * Font debugging utilities to diagnose font loading issues
 * Works on both localhost and Vercel production
 */

const LOG_ENDPOINT = 'http://127.0.0.1:7244/ingest/060299a5-b9d1-49ae-9e54-31d3e944dc91';

// Determine if running on Vercel
const isVercel = typeof window !== 'undefined' && (
  window.location.hostname.includes('vercel.app') ||
  window.location.hostname.includes('calendax.vercel.app')
);

const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
);

const getEnvironment = (): string => {
  if (isVercel) return 'vercel';
  if (isLocalhost) return 'localhost';
  return 'unknown';
};

/**
 * Log font debugging information
 */
export const logFontDebug = (
  location: string,
  message: string,
  data: any,
  hypothesisId: string = 'A'
): void => {
  const logData = {
    location,
    message,
    data: {
      ...data,
      environment: getEnvironment(),
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    },
    timestamp: Date.now(),
    sessionId: 'font-debug-session',
    runId: getEnvironment(),
    hypothesisId,
  };

  // Always log to console (works on both localhost and Vercel)
  const env = getEnvironment();
  
  // Log main message
  console.log(`[Font Debug ${env}] ${message}`);
  
  // Log key data fields separately for better readability
  if (logData.data.fontName) {
    console.log(`  → Font Name: "${logData.data.fontName}"`);
  }
  if (logData.data.fontFamily) {
    console.log(`  → Font Family String: "${logData.data.fontFamily}"`);
  }
  if (logData.data.fontCheck || logData.data.fontCheckResult) {
    const check = logData.data.fontCheck || logData.data.fontCheckResult;
    console.log(`  → Font Loaded: ${check.loaded ? 'YES ✓' : 'NO ✗'}`);
    console.log(`  → Extracted Font Name: "${check.fontName || check.extractedFontName || 'unknown'}"`);
    if (check.checks) {
      console.log(`  → Check with quotes: ${check.checks.withQuotes ? 'YES' : 'NO'}`);
      console.log(`  → Check without quotes: ${check.checks.withoutQuotes ? 'YES' : 'NO'}`);
    }
  }
  if (logData.data.allLoadedFonts) {
    const fonts = logData.data.allLoadedFonts;
    console.log(`  → Total Loaded Fonts: ${fonts.length}`);
    if (fonts.length > 0) {
      console.log(`  → Loaded Fonts List:`, fonts);
    }
  }
  if (logData.data.loadedFontsBefore || logData.data.loadedFontsAfter) {
    const fonts = logData.data.loadedFontsBefore || logData.data.loadedFontsAfter;
    console.log(`  → Loaded Fonts (${fonts.length}):`, fonts);
  }
  
  // Log full data object for detailed inspection
  console.log(`  → Full Data:`, logData.data);
  
  // Also try to send to debug server (only works on localhost when server is running)
  fetch(LOG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(logData),
  }).catch(() => {
    // Silently fail if debug server is not available (expected on Vercel)
  });
};

/**
 * Check if a specific font is loaded
 * Note: document.fonts.check() may return true for system fonts too,
 * so we also check if the font is in the actual loaded fonts list
 */
export const checkFontLoaded = (fontFamily: string): {
  loaded: boolean;
  fontName: string;
  checks: { withQuotes: boolean; withoutQuotes: boolean };
  inLoadedList: boolean;
  isSystemFont: boolean;
} => {
  if (typeof document === 'undefined' || !document.fonts) {
    return {
      loaded: false,
      fontName: 'unknown',
      checks: { withQuotes: false, withoutQuotes: false },
      inLoadedList: false,
      isSystemFont: false,
    };
  }

  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  const withQuotes = document.fonts.check(`12px "${fontName}"`);
  const withoutQuotes = document.fonts.check(`12px ${fontName}`);
  
  // Check if font is actually in the loaded fonts list
  const loadedFonts = getLoadedFonts();
  const inLoadedList = loadedFonts.some(f => f.toLowerCase() === fontName.toLowerCase());
  
  // If check returns true but not in loaded list, it's likely a system font
  const isSystemFont = (withQuotes || withoutQuotes) && !inLoadedList;

  return {
    loaded: withQuotes || withoutQuotes,
    fontName,
    checks: { withQuotes, withoutQuotes },
    inLoadedList,
    isSystemFont,
  };
};

/**
 * Get all loaded fonts from document.fonts
 * Returns unique font family names (deduplicated)
 */
export const getLoadedFonts = (): string[] => {
  if (typeof document === 'undefined' || !document.fonts) {
    return [];
  }

  const loadedFonts: Set<string> = new Set();
  try {
    document.fonts.forEach((font) => {
      if (font.family) {
        // Extract just the font family name (before comma)
        const familyName = font.family.split(',')[0].trim().replace(/['"]/g, '');
        loadedFonts.add(familyName);
      }
    });
  } catch (error) {
    // Font iterator might not be available in all browsers
  }

  return Array.from(loadedFonts).sort();
};

/**
 * Get computed font-family from an element
 */
export const getComputedFontFamily = (element: HTMLElement | null): string | null => {
  if (!element || typeof window === 'undefined') return null;

  try {
    const styles = window.getComputedStyle(element);
    return styles.fontFamily;
  } catch (error) {
    return null;
  }
};

