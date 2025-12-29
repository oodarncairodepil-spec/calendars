/**
 * Font loading utility to ensure Google Fonts are loaded before rendering
 * This helps prevent font loading issues on Vercel and other production environments
 */

/**
 * Wait for fonts to be loaded using the Font Loading API
 * Has a fallback timeout to prevent blocking indefinitely
 */
export const waitForFonts = (timeout: number = 3000): Promise<void> => {
  return new Promise((resolve) => {
    // If document.fonts is available, wait for fonts to load
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      const startTime = Date.now();
      
      // Race between fonts loading and timeout
      const timeoutId = setTimeout(() => {
        console.warn('Font loading timeout - proceeding anyway');
        resolve();
      }, timeout);
      
      document.fonts.ready
        .then(() => {
          clearTimeout(timeoutId);
          const elapsed = Date.now() - startTime;
          // Small delay to ensure all fonts are fully loaded
          setTimeout(resolve, Math.max(0, 100 - elapsed));
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          console.warn('Error waiting for fonts:', error);
          // Fallback: wait a bit and resolve anyway
          setTimeout(resolve, 500);
        });
    } else {
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
    waitForFonts().then(() => {
      setFontsLoaded(true);
    });
  }, []);

  return fontsLoaded;
};

