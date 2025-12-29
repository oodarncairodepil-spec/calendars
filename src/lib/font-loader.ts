/**
 * Font loading utility to ensure Google Fonts are loaded before rendering
 * This helps prevent font loading issues on Vercel and other production environments
 */

import { logFontDebug, getLoadedFonts } from './font-debug';

// Helper to get environment (duplicated to avoid circular dependency)
const getEnvironment = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app')) return 'vercel';
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'localhost';
  return 'unknown';
};

/**
 * Wait for fonts to be loaded using the Font Loading API
 * Has a fallback timeout to prevent blocking indefinitely
 */
export const waitForFonts = (timeout: number = 3000): Promise<void> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // #region agent log
    logFontDebug('font-loader.ts:waitForFonts', 'waitForFonts started', {
      hasDocumentFonts: typeof document !== 'undefined' && !!document.fonts,
      hasFontsReady: typeof document !== 'undefined' && !!document.fonts?.ready,
      timeout,
    }, 'A');
    // #endregion

    // If document.fonts is available, wait for fonts to load
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      // #region agent log
      const loadedFontsBefore = getLoadedFonts();
      logFontDebug('font-loader.ts:waitForFonts', 'Before fonts.ready check', {
        loadedFontsBefore: loadedFontsBefore,
        loadedFontsCount: loadedFontsBefore.length,
        fontsStatus: document.fonts.status,
        fontsStatusText: document.fonts.status === 'loading' ? 'loading' : document.fonts.status === 'loaded' ? 'loaded' : 'unloaded',
      }, 'A');
      
      // Log each loaded font individually for debugging
      if (loadedFontsBefore.length > 0) {
        console.log(`[Font Debug ${getEnvironment()}] Loaded fonts list:`, loadedFontsBefore);
      } else {
        console.log(`[Font Debug ${getEnvironment()}] No fonts loaded yet`);
      }
      // #endregion
      
      // Race between fonts loading and timeout
      const timeoutId = setTimeout(() => {
        const elapsed = Date.now() - startTime;
        // #region agent log
        logFontDebug('font-loader.ts:waitForFonts', 'Font loading timeout', {
          elapsed,
          loadedFontsAtTimeout: getLoadedFonts(),
        }, 'A');
        // #endregion
        console.warn('Font loading timeout - proceeding anyway');
        resolve();
      }, timeout);
      
      document.fonts.ready
        .then(() => {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          
          // #region agent log
          const loadedFontsAfter = getLoadedFonts();
          logFontDebug('font-loader.ts:waitForFonts', 'Fonts ready resolved', {
            elapsed,
            loadedFontsAfter: loadedFontsAfter,
            loadedFontsCount: loadedFontsAfter.length,
            fontsStatus: document.fonts.status,
          }, 'A');
          
          // Log each loaded font individually
          console.log(`[Font Debug ${getEnvironment()}] Fonts after ready:`, loadedFontsAfter);
          
          // Check for specific custom fonts
          const customFonts = ['Lovely Coffee', 'Cadillac', 'Freebooter Script'];
          customFonts.forEach(fontName => {
            const found = loadedFontsAfter.some(f => f.toLowerCase().includes(fontName.toLowerCase()));
            console.log(`[Font Debug ${getEnvironment()}] Custom font "${fontName}": ${found ? 'LOADED' : 'NOT FOUND'}`);
          });
          // #endregion
          
          // Small delay to ensure all fonts are fully loaded
          setTimeout(() => {
            // #region agent log
            logFontDebug('font-loader.ts:waitForFonts', 'waitForFonts completed', {
              totalElapsed: Date.now() - startTime,
              finalLoadedFonts: getLoadedFonts(),
            }, 'A');
            // #endregion
            resolve();
          }, Math.max(0, 100 - elapsed));
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          // #region agent log
          logFontDebug('font-loader.ts:waitForFonts', 'Error waiting for fonts', {
            error: error.message || String(error),
            elapsed,
          }, 'A');
          // #endregion
          console.warn('Error waiting for fonts:', error);
          // Fallback: wait a bit and resolve anyway
          setTimeout(resolve, 500);
        });
    } else {
      // #region agent log
      logFontDebug('font-loader.ts:waitForFonts', 'Font Loading API not available, using fallback', {
        hasDocument: typeof document !== 'undefined',
      }, 'A');
      // #endregion
      // Fallback for browsers without Font Loading API
      // Wait a reasonable amount of time for fonts to load
      setTimeout(resolve, 500);
    }
  });
};

/**
 * Check if a specific font family is loaded
 */
export const isFontLoaded = (fontFamily: string): boolean => {
  if (typeof document === 'undefined' || !document.fonts) {
    return true; // Assume loaded if API not available
  }
  
  try {
    // Extract font name from font-family string (first name before comma)
    const fontName = fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    // Check if font is loaded by testing against a known size
    return document.fonts.check(`12px "${fontName}"`) || document.fonts.check(`12px ${fontName}`);
  } catch (error) {
    console.warn('Error checking font:', error);
    return true; // Assume loaded on error
  }
};

/**
 * React hook to wait for fonts and trigger re-render when loaded
 */
import { useEffect, useState } from 'react';

export const useFontsLoaded = (): boolean => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    // #region agent log
    logFontDebug('font-loader.ts:useFontsLoaded', 'useFontsLoaded hook mounted', {
      initialFontsLoaded: fontsLoaded,
    }, 'A');
    // #endregion

    waitForFonts().then(() => {
      // #region agent log
      logFontDebug('font-loader.ts:useFontsLoaded', 'useFontsLoaded fonts ready, setting state', {
        loadedFonts: getLoadedFonts(),
      }, 'A');
      // #endregion
      setFontsLoaded(true);
    });
  }, []);

  return fontsLoaded;
};

