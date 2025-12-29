import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  CalendarProject,
  CalendarType,
  ImageAsset,
  ImageGroup,
  MonthPage,
  Frame,
  ImageTransform,
  HistoryAction,
  DEFAULT_IMAGE_FRAME,
  DEFAULT_GRID_FRAME,
  DEFAULT_IMAGE_TRANSFORM,
  DEFAULT_GRID_STYLE,
  AppStateSnapshot,
  ImageFit,
} from '@/lib/types';
import { loadFromLocalStorage, loadState, createDebouncedSave } from '@/lib/storage';

const MAX_HISTORY = 20;

interface AppState {
  // Projects
  projects: CalendarProject[];
  activeProjectId: string | null;
  activePageIndex: number;
  
  // Assets
  assets: ImageAsset[];
  groups: ImageGroup[];
  selectedAssetIds: string[];
  
  // UI State
  selectedFrameType: 'image' | 'grid' | null;
  imageFit: ImageFit;
  isPreviewMode: boolean;
  
  // History for undo/redo
  history: HistoryAction[];
  historyIndex: number;
  
  // Computed
  getActiveProject: () => CalendarProject | null;
  getActivePage: () => MonthPage | null;
  getAssetById: (id: string) => ImageAsset | undefined;
  getGroupById: (id: string) => ImageGroup | undefined;
  
  // Project actions
    createProject: (title: string, type: CalendarType, format: { width: number; height: number; unit: 'mm' | 'px' }, orientation: 'portrait' | 'landscape', monthsPerPage?: 1 | 2) => string;
  updateProject: (id: string, updates: Partial<CalendarProject>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActivePage: (index: number) => void;
  
  // Page/Frame actions
  updatePageLayout: (pageIndex: number, frameType: 'image' | 'grid', frame: Frame) => void;
  updateImageTransform: (pageIndex: number, transform: ImageTransform) => void;
  assignImageToPage: (pageIndex: number, imageId: string | null) => void;
  toggleGrid: (pageIndex: number) => void;
  updateCoverText: (pageIndex: number, textType: 'top' | 'bottom', text: string) => void;
  updatePageMargins: (pageIndex: number, margins: { top: number; right: number; bottom: number; left: number }, applyToAllMonths?: boolean) => void;
  
  // Asset actions
  addAsset: (asset: Omit<ImageAsset, 'id' | 'createdAt' | 'groupIds' | 'tags'>, id?: string) => string;
  updateAsset: (id: string, updates: Partial<ImageAsset>) => void;
  deleteAsset: (id: string) => void;
  selectAsset: (id: string, multi?: boolean) => void;
  selectAssetRange: (startId: string, endId: string, assetIds?: string[]) => void;
  selectAllAssets: (assetIds: string[]) => void;
  clearSelection: () => void;
  
  // Group actions
  createGroup: (name: string, color?: string) => string;
  updateGroup: (id: string, updates: Partial<ImageGroup>) => void;
  deleteGroup: (id: string) => void;
  addImagesToGroup: (groupId: string, imageIds: string[]) => void;
  removeImagesFromGroup: (groupId: string, imageIds: string[]) => void;
  
  // UI actions
  setSelectedFrame: (type: 'image' | 'grid' | null) => void;
  setImageFit: (fit: ImageFit) => void;
  setPreviewMode: (mode: boolean) => void;
  
  // History actions
  pushHistory: (action: Omit<HistoryAction, 'id' | 'timestamp'>) => void;
  undo: () => void;
  redo: () => void;
  
  // Persistence
  loadState: () => Promise<void>;
  loadStateSync: () => void; // Synchronous version using localStorage
  getSnapshot: () => AppStateSnapshot;
  loadSnapshot: (snapshot: AppStateSnapshot) => void;
  seedSampleData: () => void;
}

const DEFAULT_COVER_MARGINS = { top: 10, right: 10, bottom: 10, left: 10 };
const DEFAULT_MONTH_MARGINS = { top: 10, right: 10, bottom: 10, left: 10 };

const createDefaultMonthPages = (monthsPerPage: 1 | 2 = 2): MonthPage[] => {
  const pages: MonthPage[] = [];
  
  // Cover page
  pages.push({
    month: 'cover',
    layout: {
      imageFrame: { x: 0.1, y: 0.15, w: 0.8, h: 0.7, lockAspect: false },
      calendarGridFrame: { x: 0.1, y: 0.88, w: 0.8, h: 0.08, lockAspect: false },
    },
    assignedImageId: null,
    imageTransform: DEFAULT_IMAGE_TRANSFORM,
    showGrid: false,
    gridStyle: DEFAULT_GRID_STYLE,
    margins: { ...DEFAULT_COVER_MARGINS },
  });
  
  if (monthsPerPage === 1) {
    // 12 month pages (1 month per page)
  for (let i = 1; i <= 12; i++) {
    pages.push({
      month: i,
      layout: {
        imageFrame: { ...DEFAULT_IMAGE_FRAME },
        calendarGridFrame: { ...DEFAULT_GRID_FRAME },
      },
      assignedImageId: null,
      imageTransform: DEFAULT_IMAGE_TRANSFORM,
      showGrid: true,
      gridStyle: DEFAULT_GRID_STYLE,
        margins: { ...DEFAULT_MONTH_MARGINS },
      });
    }
  } else {
    // 6 pages for 2 months per page (Jan-Feb, Mar-Apr, May-Jun, Jul-Aug, Sep-Oct, Nov-Dec)
    for (let i = 1; i <= 12; i += 2) {
      pages.push({
        month: i, // First month of the pair
        layout: {
          imageFrame: { ...DEFAULT_IMAGE_FRAME },
          calendarGridFrame: { ...DEFAULT_GRID_FRAME },
        },
        assignedImageId: null,
        imageTransform: DEFAULT_IMAGE_TRANSFORM,
        showGrid: true,
        gridStyle: DEFAULT_GRID_STYLE,
        margins: { ...DEFAULT_MONTH_MARGINS },
    });
    }
  }
  
  return pages;
};

const debouncedSave = createDebouncedSave(1000);

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    projects: [],
    activeProjectId: null,
    activePageIndex: 0,
    assets: [],
    groups: [],
    selectedAssetIds: [],
    selectedFrameType: null,
    imageFit: 'cover',
    isPreviewMode: false,
    history: [],
    historyIndex: -1,
    
    // Computed getters
    getActiveProject: () => {
      const { projects, activeProjectId } = get();
      const project = projects.find(p => p.id === activeProjectId);
      if (!project) return null;
      
      // Ensure monthsPerPage exists (for backward compatibility)
      if (project.monthsPerPage === undefined || project.monthsPerPage === null) {
        // Update the project in state with default value
        get().updateProject(project.id, { monthsPerPage: 1 });
        return { ...project, monthsPerPage: 1 };
      }
      
      // Fix pages structure if monthsPerPage doesn't match page count
      const expectedPageCount = project.monthsPerPage === 1 ? 13 : 7; // cover + 12 months or cover + 6 pairs
      if (project.months.length !== expectedPageCount) {
        // Regenerate pages to match monthsPerPage
        // This will trigger the regenerate logic in updateProject
        get().updateProject(project.id, { monthsPerPage: project.monthsPerPage });
        // Get the updated project
        const updatedProject = get().projects.find(p => p.id === activeProjectId);
        return updatedProject || project;
      }
      
      return project;
    },
    
    getActivePage: () => {
      const project = get().getActiveProject();
      if (!project) return null;
      return project.months[get().activePageIndex] || null;
    },
    
    getAssetById: (id: string) => get().assets.find(a => a.id === id),
    
    getGroupById: (id: string) => get().groups.find(g => g.id === id),
    
    // Project actions
    createProject: (title, type, format, orientation) => {
      const id = uuidv4();
      const now = new Date().toISOString();
      
      const project: CalendarProject = {
        id,
        title,
        calendarType: type,
        format,
        orientation,
        bleed: 3,
        margin: 10,
              months: createDefaultMonthPages(2),
              monthsPerPage: 2, // Default to 2 months per page
              fontFamily: 'Inter', // Default font
              coverImageFit: 'cover', // Default fit mode for cover page
              monthsImageFit: 'cover', // Default fit mode for months pages
        createdAt: now,
        updatedAt: now,
      };
      
      set(state => ({
        projects: [...state.projects, project],
        activeProjectId: id,
        activePageIndex: 0,
      }));
      
      return id;
    },
    
    updateProject: (id, updates) => {
      set(state => {
        const updatedProjects = state.projects.map(p => {
          if (p.id === id) {
            const updated = { ...p, ...updates, updatedAt: new Date().toISOString() };
            
            // If monthsPerPage changed, regenerate months pages
            // Also regenerate if page count doesn't match monthsPerPage
            const expectedPageCount = (updates.monthsPerPage !== undefined ? updates.monthsPerPage : p.monthsPerPage) === 1 ? 13 : 7;
            const shouldRegenerate = 
              (updates.monthsPerPage !== undefined && updates.monthsPerPage !== p.monthsPerPage) ||
              (p.months.length !== expectedPageCount);
            
            if (shouldRegenerate) {
              const targetMonthsPerPage = updates.monthsPerPage !== undefined ? updates.monthsPerPage : p.monthsPerPage;
              
              // Preserve existing assigned images and layouts where possible
              const existingPages = p.months;
              const newPages = createDefaultMonthPages(targetMonthsPerPage);
              
              // Try to preserve assignments and layouts
              const preservedPages = newPages.map((newPage, index) => {
                if (index === 0) {
                  // Cover page - preserve from existing
                  const existingCover = existingPages.find(page => page.month === 'cover');
                  return existingCover || newPage;
                }
                
                // For month pages, try to find matching month
                if (typeof newPage.month === 'number') {
                  const existingPage = existingPages.find(page => page.month === newPage.month);
                  if (existingPage) {
                    return existingPage;
                  }
                }
                
                return newPage;
              });
              
              updated.months = preservedPages;
              
              // Reset active page index if it's out of bounds
              if (state.activeProjectId === id && state.activePageIndex >= preservedPages.length) {
                set({ activePageIndex: Math.max(0, preservedPages.length - 1) });
              }
            }
            
            return updated;
          }
          return p;
        });
        return { projects: updatedProjects };
      });
    },
    
    deleteProject: (id) => {
      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
      }));
    },
    
    setActiveProject: (id) => {
      set({ activeProjectId: id, activePageIndex: 0 });
    },
    
    setActivePage: (index) => {
      set({ activePageIndex: index });
    },
    
    // Page/Frame actions
    updatePageLayout: (pageIndex, frameType, frame) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page) return;
      
      // Store for undo
      const beforeFrame = frameType === 'image' ? page.layout.imageFrame : page.layout.calendarGridFrame;
      get().pushHistory({
        type: 'frame',
        before: beforeFrame,
        after: frame,
        pageIndex,
      });
      
      const updatedMonths = [...project.months];
      updatedMonths[pageIndex] = {
        ...page,
        layout: {
          ...page.layout,
          [frameType === 'image' ? 'imageFrame' : 'calendarGridFrame']: frame,
        },
      };
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    updateImageTransform: (pageIndex, transform) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page) return;
      
      get().pushHistory({
        type: 'transform',
        before: page.imageTransform,
        after: transform,
        pageIndex,
      });
      
      const updatedMonths = [...project.months];
      updatedMonths[pageIndex] = { ...page, imageTransform: transform };
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    assignImageToPage: (pageIndex, imageId) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page) return;
      
      get().pushHistory({
        type: 'assign',
        before: page.assignedImageId,
        after: imageId,
        pageIndex,
      });
      
      const updatedMonths = [...project.months];
      updatedMonths[pageIndex] = { 
        ...page, 
        assignedImageId: imageId,
        imageTransform: DEFAULT_IMAGE_TRANSFORM, // Reset transform on new image
      };
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    toggleGrid: (pageIndex) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page) return;
      
      const updatedMonths = [...project.months];
      updatedMonths[pageIndex] = { ...page, showGrid: !page.showGrid };
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    updateCoverText: (pageIndex, textType, text) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page || page.month !== 'cover') return;
      
      const updatedMonths = [...project.months];
      updatedMonths[pageIndex] = {
        ...page,
        [textType === 'top' ? 'coverTextTop' : 'coverTextBottom']: text,
      };
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    updatePageMargins: (pageIndex, margins, applyToAllMonths = false) => {
      const project = get().getActiveProject();
      if (!project) return;
      
      const page = project.months[pageIndex];
      if (!page) return;
      
      const updatedMonths = [...project.months];
      
      if (applyToAllMonths && page.month !== 'cover') {
        // Apply margins to all month pages (not cover)
        updatedMonths.forEach((p, idx) => {
          if (p.month !== 'cover') {
            updatedMonths[idx] = {
              ...p,
              margins: { ...margins },
            };
          }
        });
      } else {
        // Apply margins only to current page
        updatedMonths[pageIndex] = {
          ...page,
          margins: { ...margins },
        };
      }
      
      get().updateProject(project.id, { months: updatedMonths });
    },
    
    // Asset actions
    addAsset: (assetData, providedId) => {
      const id = providedId || uuidv4();
      const asset: ImageAsset = {
        ...assetData,
        id,
        createdAt: new Date().toISOString(),
        tags: [],
        groupIds: [],
      };
      
      set(state => ({ assets: [...state.assets, asset] }));
      return id;
    },
    
    updateAsset: (id, updates) => {
      set(state => ({
        assets: state.assets.map(a => (a.id === id ? { ...a, ...updates } : a)),
      }));
    },
    
    deleteAsset: (id) => {
      // Remove from all groups first
      const asset = get().getAssetById(id);
      if (asset) {
        asset.groupIds.forEach(groupId => {
          get().removeImagesFromGroup(groupId, [id]);
        });
      }
      
      // Unassign from any pages
      get().projects.forEach(project => {
        const updatedMonths = project.months.map(page =>
          page.assignedImageId === id ? { ...page, assignedImageId: null } : page
        );
        if (updatedMonths.some((m, i) => m !== project.months[i])) {
          get().updateProject(project.id, { months: updatedMonths });
        }
      });
      
      set(state => ({
        assets: state.assets.filter(a => a.id !== id),
        selectedAssetIds: state.selectedAssetIds.filter(aid => aid !== id),
      }));
    },
    
    selectAsset: (id, multi = false) => {
      set(state => ({
        selectedAssetIds: multi
          ? state.selectedAssetIds.includes(id)
            ? state.selectedAssetIds.filter(aid => aid !== id)
            : [...state.selectedAssetIds, id]
          : [id],
      }));
    },
    
    selectAssetRange: (startId, endId, assetIds?: string[]) => {
      set(state => {
        // Use provided assetIds (filtered list) or fallback to all assets
        const allIds = assetIds || state.assets.map(a => a.id);
        const startIndex = allIds.indexOf(startId);
        const endIndex = allIds.indexOf(endId);
        
        if (startIndex === -1 || endIndex === -1) return state;
        
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        const rangeIds = allIds.slice(minIndex, maxIndex + 1);
        
        // Merge with existing selection, avoiding duplicates
        const newSelection = [...new Set([...state.selectedAssetIds, ...rangeIds])];
        
        return { selectedAssetIds: newSelection };
      });
    },
    
    selectAllAssets: (assetIds) => {
      set({ selectedAssetIds: assetIds });
    },
    
    clearSelection: () => {
      set({ selectedAssetIds: [] });
    },
    
    // Group actions
    createGroup: (name, color) => {
      const id = uuidv4();
      const group: ImageGroup = {
        id,
        name,
        color,
        createdAt: new Date().toISOString(),
        imageIds: [],
      };
      
      set(state => ({ groups: [...state.groups, group] }));
      return id;
    },
    
    updateGroup: (id, updates) => {
      set(state => ({
        groups: state.groups.map(g => (g.id === id ? { ...g, ...updates } : g)),
      }));
    },
    
    deleteGroup: (id) => {
      // Remove group reference from assets
      set(state => ({
        groups: state.groups.filter(g => g.id !== id),
        assets: state.assets.map(a => ({
          ...a,
          groupIds: a.groupIds.filter(gid => gid !== id),
        })),
      }));
    },
    
    addImagesToGroup: (groupId, imageIds) => {
      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, imageIds: [...new Set([...g.imageIds, ...imageIds])] }
            : g
        ),
        assets: state.assets.map(a =>
          imageIds.includes(a.id) && !a.groupIds.includes(groupId)
            ? { ...a, groupIds: [...a.groupIds, groupId] }
            : a
        ),
      }));
    },
    
    removeImagesFromGroup: (groupId, imageIds) => {
      set(state => ({
        groups: state.groups.map(g =>
          g.id === groupId
            ? { ...g, imageIds: g.imageIds.filter(id => !imageIds.includes(id)) }
            : g
        ),
        assets: state.assets.map(a =>
          imageIds.includes(a.id)
            ? { ...a, groupIds: a.groupIds.filter(gid => gid !== groupId) }
            : a
        ),
      }));
    },
    
    // UI actions
    setSelectedFrame: (type) => {
      set({ selectedFrameType: type });
    },
    
    setImageFit: (fit) => {
      set({ imageFit: fit });
    },
    
    setPreviewMode: (mode) => {
      set({ isPreviewMode: mode });
    },
    
    // History actions
    pushHistory: (action) => {
      set(state => {
        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push({
          ...action,
          id: uuidv4(),
          timestamp: Date.now(),
        });
        
        // Keep only last MAX_HISTORY actions
        while (newHistory.length > MAX_HISTORY) {
          newHistory.shift();
        }
        
        return {
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      });
    },
    
    undo: () => {
      const { history, historyIndex } = get();
      if (historyIndex < 0) return;
      
      const action = history[historyIndex];
      // Apply the 'before' state
      // This is simplified - in production you'd have specific handlers per action type
      
      set({ historyIndex: historyIndex - 1 });
    },
    
    redo: () => {
      const { history, historyIndex } = get();
      if (historyIndex >= history.length - 1) return;
      
      set({ historyIndex: historyIndex + 1 });
    },
    
    // Persistence
    loadState: async () => {
      const snapshot = await loadState();
      if (snapshot) {
        get().loadSnapshot(snapshot);
      }
    },
    
    loadStateSync: () => {
      const snapshot = loadFromLocalStorage();
      if (snapshot) {
        get().loadSnapshot(snapshot);
      }
    },
    
    getSnapshot: (): AppStateSnapshot => {
      const { projects, assets, groups, activeProjectId, activePageIndex } = get();
      return {
        version: 1,
        projects,
        assets,
        groups,
        activeProjectId,
        activePageIndex,
        lastUpdated: new Date().toISOString(),
      };
    },
    
    loadSnapshot: (snapshot) => {
      // Remove duplicate groups by ID first, then by name (keep first occurrence)
      const uniqueById = (snapshot.groups || []).filter(
        (group, index, self) => index === self.findIndex(g => g.id === group.id)
      );
      const uniqueByName = uniqueById.filter(
        (group, index, self) => index === self.findIndex(g => g.name === group.name)
      );
      
      set({
        projects: snapshot.projects || [],
        assets: snapshot.assets || [],
        groups: uniqueByName,
        activeProjectId: snapshot.activeProjectId,
        activePageIndex: snapshot.activePageIndex || 0,
      });
    },
    
    seedSampleData: () => {
      // Add sample images
      const sampleImages = [
        'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
        'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
        'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
        'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
      ];
      
      const assetIds = sampleImages.map((url, i) => 
        get().addAsset({
          name: `Sample ${i + 1}`,
          sourceType: 'url',
          url,
          originalWidth: 800,
          originalHeight: 600,
        })
      );
      
      // Create a sample group
      const groupId = get().createGroup('Nature', '#22c55e');
      get().addImagesToGroup(groupId, assetIds.slice(0, 3));
      
      // Create a sample project
      get().createProject('My 2025 Calendar', 'wall', { width: 210, height: 297, unit: 'mm' }, 'portrait');
    },
  }))
);

// Auto-save on state changes
useAppStore.subscribe(
  state => ({
    projects: state.projects,
    assets: state.assets,
    groups: state.groups,
    activeProjectId: state.activeProjectId,
    activePageIndex: state.activePageIndex,
  }),
  () => {
    debouncedSave(useAppStore.getState().getSnapshot());
  }
);
