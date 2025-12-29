// Core data model types for Calendar Design Maker

export interface Frame {
  x: number;      // Normalized 0..1 relative to page
  y: number;
  w: number;
  h: number;
  lockAspect?: boolean;
}

export interface ImageTransform {
  x: number;      // Pan offset within frame (normalized)
  y: number;
  scale: number;  // 1 = fit, >1 = zoom in
  rotation: number; // Degrees
  crop: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface GridStyle {
  typographyScale: number;
  weekdayStart: 0 | 1; // 0 = Sunday, 1 = Monday
  language: string;
  showWeekNumbers?: boolean;
}

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MonthPage {
  month: number | 'cover'; // 1-12 or 'cover'
  layout: {
    imageFrame: Frame;
    calendarGridFrame: Frame;
  };
  assignedImageId: string | null;
  imageTransform: ImageTransform;
  showGrid: boolean;
  gridStyle: GridStyle;
  coverTextTop?: string; // Text for top section of cover page
  coverTextBottom?: string; // Text for bottom section of cover page
  margins?: PageMargins; // Page margins (top, right, bottom, left)
}

export interface CalendarFormat {
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export type CalendarType = 'wall' | 'desk';
export type Orientation = 'portrait' | 'landscape';
export type ImageFit = 'cover' | 'contain' | 'stretch';

export interface CalendarProject {
  id: string;
  title: string;
  calendarType: CalendarType;
  format: CalendarFormat;
  orientation: Orientation;
  bleed: number;
  margin: number;
  months: MonthPage[];
  monthsPerPage: 1 | 2; // Number of months to display per page
  selectedGroupId?: string | null; // Selected group ID for ImagePanel
  fontFamily?: string; // Font family for the calendar (e.g., 'Inter', 'Sora', 'Roboto', etc.)
  coverImageFit?: ImageFit; // Image fit mode for cover page
  monthsImageFit?: ImageFit; // Image fit mode for all month pages
  createdAt: string;
  updatedAt: string;
}

export type ImageSourceType = 'upload' | 'url';

export interface ImageAsset {
  id: string;
  name: string;
  sourceType: ImageSourceType;
  url: string; // objectURL for uploads, actual URL for url type
  thumbnailUrl?: string;
  originalWidth: number;
  originalHeight: number;
  createdAt: string;
  tags: string[];
  groupIds: string[];
}

export interface ImageGroup {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  imageIds: string[];
}

// Preset formats for quick project setup
export interface FormatPreset {
  name: string;
  width: number;
  height: number;
  unit: 'mm' | 'px';
}

export const FORMAT_PRESETS: FormatPreset[] = [
  { name: 'A4', width: 210, height: 297, unit: 'mm' },
  { name: 'A3', width: 297, height: 420, unit: 'mm' },
  { name: 'Letter', width: 216, height: 279, unit: 'mm' },
  { name: 'Legal', width: 216, height: 356, unit: 'mm' },
  { name: 'Square (12")', width: 305, height: 305, unit: 'mm' },
  { name: 'Custom', width: 210, height: 297, unit: 'mm' },
];

// Font presets for calendar projects
export interface FontPreset {
  name: string;
  family: string;
  displayName: string;
}

export const FONT_PRESETS: FontPreset[] = [
  { name: 'Inter', family: 'Inter, system-ui, sans-serif', displayName: 'Inter' },
  { name: 'Sora', family: 'Sora, system-ui, sans-serif', displayName: 'Sora' },
  { name: 'Roboto', family: 'Roboto, system-ui, sans-serif', displayName: 'Roboto' },
  { name: 'Open Sans', family: '"Open Sans", system-ui, sans-serif', displayName: 'Open Sans' },
  { name: 'Lato', family: 'Lato, system-ui, sans-serif', displayName: 'Lato' },
  { name: 'Montserrat', family: 'Montserrat, system-ui, sans-serif', displayName: 'Montserrat' },
  { name: 'Poppins', family: 'Poppins, system-ui, sans-serif', displayName: 'Poppins' },
  { name: 'Nunito', family: 'Nunito, system-ui, sans-serif', displayName: 'Nunito' },
  { name: 'Raleway', family: 'Raleway, system-ui, sans-serif', displayName: 'Raleway' },
  { name: 'Source Sans Pro', family: '"Source Sans Pro", system-ui, sans-serif', displayName: 'Source Sans Pro' },
  { name: 'Ubuntu', family: 'Ubuntu, system-ui, sans-serif', displayName: 'Ubuntu' },
  { name: 'Work Sans', family: '"Work Sans", system-ui, sans-serif', displayName: 'Work Sans' },
  { name: 'DM Sans', family: '"DM Sans", system-ui, sans-serif', displayName: 'DM Sans' },
  { name: 'Outfit', family: 'Outfit, system-ui, sans-serif', displayName: 'Outfit' },
  { name: 'Cabin', family: 'Cabin, system-ui, sans-serif', displayName: 'Cabin' },
  { name: 'Playfair Display', family: '"Playfair Display", serif', displayName: 'Playfair Display' },
  { name: 'Merriweather', family: 'Merriweather, serif', displayName: 'Merriweather' },
  { name: 'Lora', family: 'Lora, serif', displayName: 'Lora' },
  { name: 'PT Serif', family: '"PT Serif", serif', displayName: 'PT Serif' },
  { name: 'Crimson Text', family: '"Crimson Text", serif', displayName: 'Crimson Text' },
  { name: 'Libre Baskerville', family: '"Libre Baskerville", serif', displayName: 'Libre Baskerville' },
  { name: 'Georgia', family: 'Georgia, serif', displayName: 'Georgia' },
  { name: 'Times New Roman', family: '"Times New Roman", Times, serif', displayName: 'Times New Roman' },
  { name: 'Dancing Script', family: '"Dancing Script", cursive', displayName: 'Dancing Script' },
  { name: 'Pacifico', family: 'Pacifico, cursive', displayName: 'Pacifico' },
  { name: 'Caveat', family: 'Caveat, cursive', displayName: 'Caveat' },
  { name: 'Comfortaa', family: 'Comfortaa, cursive', displayName: 'Comfortaa' },
  { name: 'Lovely Coffee', family: '"Lovely Coffee", cursive', displayName: 'Lovely Coffee' },
  { name: 'Cadillac', family: '"Cadillac", serif', displayName: 'Cadillac' },
  { name: 'Milkshake', family: '"Milkshake", cursive', displayName: 'Milkshake' },
  { name: 'Freebooter Script', family: '"Freebooter Script", cursive', displayName: 'Freebooter Script' },
];

// Default values for new projects
export const DEFAULT_IMAGE_TRANSFORM: ImageTransform = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  crop: { x: 0, y: 0, w: 1, h: 1 },
};

export const DEFAULT_GRID_STYLE: GridStyle = {
  typographyScale: 1,
  weekdayStart: 0,
  language: 'en',
  showWeekNumbers: false,
};

export const DEFAULT_IMAGE_FRAME: Frame = {
  x: 0.05,
  y: 0.05,
  w: 0.9,
  h: 0.55,
  lockAspect: false,
};

export const DEFAULT_GRID_FRAME: Frame = {
  x: 0.05,
  y: 0.65,
  w: 0.9,
  h: 0.3,
  lockAspect: false,
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
];

// JavaScript Date.getDay() returns: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
// For Indonesian calendar display, we map: Minggu (0), Senin (1), Selasa (2), Rabu (3), Kamis (4), Jumat (5), Sabtu (6)
export const DAY_NAMES_SHORT = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu (0), Senin (1), Selasa (2), Rabu (3), Kamis (4), Jumat (5), Sabtu (6)
export const DAY_NAMES_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Undo/Redo action types
export interface HistoryAction {
  id: string;
  type: 'frame' | 'transform' | 'assign' | 'project';
  timestamp: number;
  before: unknown;
  after: unknown;
  pageIndex?: number;
}

// App state snapshot for persistence
export interface AppStateSnapshot {
  version: number;
  projects: CalendarProject[];
  assets: ImageAsset[];
  groups: ImageGroup[];
  activeProjectId: string | null;
  activePageIndex: number;
  lastUpdated: string;
}

export const CURRENT_SCHEMA_VERSION = 1;
