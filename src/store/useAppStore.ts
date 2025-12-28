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
  createProject: (title: string, type: CalendarType, format: { width: number; height: number; unit: 'mm' | 'px' }, orientation: 'portrait' | 'landscape') => string;
  updateProject: (id: string, updates: Partial<CalendarProject>) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActivePage: (index: number) => void;
  
  // Page/Frame actions
  updatePageLayout: (pageIndex: number, frameType: 'image' | 'grid', frame: Frame) => void;
  updateImageTransform: (pageIndex: number, transform: ImageTransform) => void;
  assignImageToPage: (pageIndex: number, imageId: string | null) => void;
  toggleGrid: (pageIndex: number) => void;
  
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

const createDefaultMonthPages = (): MonthPage[] => {
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
  });
  
  // 12 month pages
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
    });
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
      return projects.find(p => p.id === activeProjectId) || null;
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
        months: createDefaultMonthPages(),
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
      set(state => ({
        projects: state.projects.map(p =>
          p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        ),
      }));
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
      set({
        projects: snapshot.projects || [],
        assets: snapshot.assets || [],
        groups: snapshot.groups || [],
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
