import { AppStateSnapshot, CURRENT_SCHEMA_VERSION } from './types';
import {
  saveToSupabase,
  loadFromSupabase,
} from './supabase-service';

const STORAGE_KEY = 'calendar-maker-state';
const USE_SUPABASE = true; // Set to false to use localStorage instead

/**
 * Save app state to localStorage with debouncing
 */
export const saveToLocalStorage = (state: AppStateSnapshot): void => {
  try {
    const snapshot: AppStateSnapshot = {
      ...state,
      version: CURRENT_SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

/**
 * Save app state to Supabase or localStorage
 */
export const saveState = async (state: AppStateSnapshot): Promise<void> => {
  const snapshot: AppStateSnapshot = {
    ...state,
    version: CURRENT_SCHEMA_VERSION,
    lastUpdated: new Date().toISOString(),
  };

  if (USE_SUPABASE) {
    try {
      await saveToSupabase(snapshot);
      // Also save to localStorage as backup
      saveToLocalStorage(snapshot);
    } catch (error) {
      console.error('Failed to save to Supabase, falling back to localStorage:', error);
      saveToLocalStorage(snapshot);
    }
  } else {
    saveToLocalStorage(snapshot);
  }
};

/**
 * Load app state from localStorage with migration support
 */
export const loadFromLocalStorage = (): AppStateSnapshot | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as AppStateSnapshot;
    
    // Handle schema migrations here if needed
    if (parsed.version !== CURRENT_SCHEMA_VERSION) {
      return migrateState(parsed);
    }

    return parsed;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
};

/**
 * Load app state from Supabase or localStorage
 */
export const loadState = async (): Promise<AppStateSnapshot | null> => {
  if (USE_SUPABASE) {
    try {
      const state = await loadFromSupabase();
      if (state) {
        // Also save to localStorage as backup
        saveToLocalStorage(state);
        return state;
      }
      // If Supabase returns null, try localStorage
      return loadFromLocalStorage();
    } catch (error) {
      console.error('Failed to load from Supabase, falling back to localStorage:', error);
      return loadFromLocalStorage();
    }
  } else {
    return loadFromLocalStorage();
  }
};

/**
 * Migrate state from older schema versions
 */
const migrateState = (state: AppStateSnapshot): AppStateSnapshot => {
  // Add migration logic here when schema changes
  // For now, just update the version
  return {
    ...state,
    version: CURRENT_SCHEMA_VERSION,
  };
};

/**
 * Export project data as JSON
 */
export const exportProjectJSON = (state: AppStateSnapshot, includeAssetUrls = true): string => {
  const exportData = {
    ...state,
    exportedAt: new Date().toISOString(),
    assets: state.assets.map(asset => ({
      ...asset,
      // For uploads, we can't export the blob URL
      url: asset.sourceType === 'upload' && !includeAssetUrls 
        ? '[upload - not exported]' 
        : asset.url,
    })),
  };
  return JSON.stringify(exportData, null, 2);
};

/**
 * Import project data from JSON
 */
export const importProjectJSON = (jsonString: string): AppStateSnapshot | null => {
  try {
    const data = JSON.parse(jsonString) as AppStateSnapshot;
    // Validate basic structure
    if (!data.projects || !Array.isArray(data.projects)) {
      throw new Error('Invalid project data structure');
    }
    return data;
  } catch (error) {
    console.error('Failed to parse import JSON:', error);
    return null;
  }
};

/**
 * Clear all stored data
 */
export const clearLocalStorage = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * Create a debounced save function
 */
export const createDebouncedSave = (delay = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (state: AppStateSnapshot) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveState(state).catch(error => {
        console.error('Error in debounced save:', error);
      });
      timeoutId = null;
    }, delay);
  };
};
