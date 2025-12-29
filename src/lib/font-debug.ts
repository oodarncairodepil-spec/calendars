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
  console.log(`[Font Debug ${getEnvironment()}]`, message, logData);
  
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
 */
export const checkFontLoaded = (fontFamily: string): {
  loaded: boolean;
  fontName: string;
  checks: { withQuotes: boolean; withoutQuotes: boolean };
} => {
  if (typeof document === 'undefined' || !document.fonts) {
    return {
      loaded: false,
      fontName: 'unknown',
      checks: { withQuotes: false, withoutQuotes: false },
    };
  }

  const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
  const withQuotes = document.fonts.check(`12px "${fontName}"`);
  const withoutQuotes = document.fonts.check(`12px ${fontName}`);

  return {
    loaded: withQuotes || withoutQuotes,
    fontName,
    checks: { withQuotes, withoutQuotes },
  };
};

/**
 * Get all loaded fonts from document.fonts
 */
export const getLoadedFonts = (): string[] => {
  if (typeof document === 'undefined' || !document.fonts) {
    return [];
  }

  const loadedFonts: string[] = [];
  try {
    document.fonts.forEach((font) => {
      if (font.family) {
        loadedFonts.push(font.family);
      }
    });
  } catch (error) {
    // Font iterator might not be available in all browsers
  }

  return loadedFonts;
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

