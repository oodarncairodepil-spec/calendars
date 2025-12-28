import { supabase } from './supabase';
import {
  CalendarProject,
  ImageAsset,
  ImageGroup,
  AppStateSnapshot,
} from './types';
import { deleteImageFromStorage } from './storage-upload';

// Database types (matching Supabase schema)
interface DbProject {
  id: string;
  title: string;
  calendar_type: 'wall' | 'desk';
  format: { width: number; height: number; unit: 'mm' | 'px' };
  orientation: 'portrait' | 'landscape';
  bleed: number;
  margin: number;
  months: unknown; // JSONB
  months_per_page?: number; // Optional for backward compatibility
  created_at: string;
  updated_at: string;
}

interface DbAsset {
  id: string;
  name: string;
  source_type: 'upload' | 'url';
  url: string;
  thumbnail_url: string | null;
  original_width: number;
  original_height: number;
  tags: string[];
  created_at: string;
}

interface DbGroup {
  id: string;
  name: string;
  color: string | null;
  image_ids: string[];
  created_at: string;
}

// Convert database project to app project
const dbProjectToProject = (db: DbProject): CalendarProject => ({
  id: db.id,
  title: db.title,
  calendarType: db.calendar_type,
  format: db.format,
  orientation: db.orientation,
  bleed: db.bleed,
  margin: db.margin,
  months: db.months as CalendarProject['months'],
  monthsPerPage: (db as any).months_per_page || 1, // Default to 1 if not present
  createdAt: db.created_at,
  updatedAt: db.updated_at,
});

// Convert app project to database project
const projectToDbProject = (project: CalendarProject): Omit<DbProject, 'id' | 'created_at' | 'updated_at'> => ({
  title: project.title,
  calendar_type: project.calendarType,
  format: project.format,
  orientation: project.orientation,
  bleed: project.bleed,
  margin: project.margin,
  months: project.months as unknown,
  months_per_page: project.monthsPerPage || 1,
});

// Convert database asset to app asset
const dbAssetToAsset = async (db: DbAsset): Promise<ImageAsset> => {
  // Get group IDs for this asset
  const { data: assetGroups } = await supabase
    .from('asset_groups')
    .select('group_id')
    .eq('asset_id', db.id);

  const groupIds = assetGroups?.map(ag => ag.group_id) || [];

  return {
    id: db.id,
    name: db.name,
    sourceType: db.source_type,
    url: db.url,
    thumbnailUrl: db.thumbnail_url || undefined,
    originalWidth: db.original_width,
    originalHeight: db.original_height,
    createdAt: db.created_at,
    tags: db.tags || [],
    groupIds,
  };
};

// Convert app asset to database asset
const assetToDbAsset = (asset: ImageAsset): Omit<DbAsset, 'id' | 'created_at'> => ({
  name: asset.name,
  source_type: asset.sourceType,
  url: asset.url,
  thumbnail_url: asset.thumbnailUrl || null,
  original_width: asset.originalWidth,
  original_height: asset.originalHeight,
  tags: asset.tags || [],
});

// Convert database group to app group
const dbGroupToGroup = (db: DbGroup): ImageGroup => ({
  id: db.id,
  name: db.name,
  color: db.color || undefined,
  createdAt: db.created_at,
  imageIds: db.image_ids || [],
});

// Convert app group to database group
const groupToDbGroup = (group: ImageGroup): Omit<DbGroup, 'id' | 'created_at'> => ({
  name: group.name,
  color: group.color || null,
  image_ids: group.imageIds || [],
});

/**
 * Save app state to Supabase
 */
export const saveToSupabase = async (state: AppStateSnapshot): Promise<void> => {
  try {
    // Save projects
    for (const project of state.projects) {
      const dbProject = projectToDbProject(project);
      const { error: projectError } = await supabase
        .from('projects')
        .upsert({
          id: project.id,
          ...dbProject,
          updated_at: project.updatedAt,
        }, {
          onConflict: 'id',
        });

      if (projectError) {
        console.error('Error saving project:', projectError);
        throw projectError;
      }
    }

    // Save assets
    for (const asset of state.assets) {
      const dbAsset = assetToDbAsset(asset);
      const { error: assetError } = await supabase
        .from('assets')
        .upsert({
          id: asset.id,
          ...dbAsset,
        }, {
          onConflict: 'id',
        });

      if (assetError) {
        console.error('Error saving asset:', assetError);
        throw assetError;
      }

      // Update asset-group relationships
      // First, remove all existing relationships
      await supabase
        .from('asset_groups')
        .delete()
        .eq('asset_id', asset.id);

      // Then, add new relationships
      if (asset.groupIds && asset.groupIds.length > 0) {
        const relationships = asset.groupIds.map(groupId => ({
          asset_id: asset.id,
          group_id: groupId,
        }));

        const { error: relError } = await supabase
          .from('asset_groups')
          .insert(relationships);

        if (relError) {
          console.error('Error saving asset-group relationships:', relError);
        }
      }
    }

    // Save groups
    for (const group of state.groups) {
      const dbGroup = groupToDbGroup(group);
      const { error: groupError } = await supabase
        .from('groups')
        .upsert({
          id: group.id,
          ...dbGroup,
        }, {
          onConflict: 'id',
        });

      if (groupError) {
        console.error('Error saving group:', groupError);
        throw groupError;
      }
    }
  } catch (error) {
    console.error('Failed to save to Supabase:', error);
    throw error;
  }
};

/**
 * Load app state from Supabase
 */
export const loadFromSupabase = async (): Promise<AppStateSnapshot | null> => {
  try {
    // Load projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error loading projects:', projectsError);
      throw projectsError;
    }

    const projects = (projectsData || []).map(dbProjectToProject);

    // Load assets
    const { data: assetsData, error: assetsError } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (assetsError) {
      console.error('Error loading assets:', assetsError);
      throw assetsError;
    }

    const assets = await Promise.all(
      (assetsData || []).map(dbAssetToAsset)
    );

    // Load groups
    const { data: groupsData, error: groupsError } = await supabase
      .from('groups')
      .select('*')
      .order('created_at', { ascending: false });

    if (groupsError) {
      console.error('Error loading groups:', groupsError);
      throw groupsError;
    }

    const groups = (groupsData || [])
      .map(dbGroupToGroup)
      // Remove duplicates by ID first, then by name (keep first occurrence)
      .filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      )
      .filter((group, index, self) =>
        index === self.findIndex(g => g.name === group.name)
      );

    return {
      version: 1,
      projects,
      assets,
      groups,
      activeProjectId: null, // This should be managed in the app state
      activePageIndex: 0,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to load from Supabase:', error);
    return null;
  }
};

/**
 * Delete a project from Supabase
 */
export const deleteProjectFromSupabase = async (projectId: string): Promise<void> => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

/**
 * Delete an asset from Supabase
 */
export const deleteAssetFromSupabase = async (asset: ImageAsset): Promise<void> => {
  try {
    // Delete from storage first (may fail silently for blob URLs, that's OK)
    await deleteImageFromStorage(asset);

    // Delete relationships
    const { error: relError } = await supabase
      .from('asset_groups')
      .delete()
      .eq('asset_id', asset.id);

    if (relError) {
      console.error('Error deleting asset-group relationships:', relError);
      // Continue even if relationships deletion fails
    }

    // Delete asset from database
    const { error, data } = await supabase
      .from('assets')
      .delete()
      .eq('id', asset.id)
      .select();

    if (error) {
      console.error('Error deleting asset from database:', error);
      throw error;
    }

    // Log deletion result
    if (data && data.length === 0) {
      console.warn(`Asset ${asset.id} not found in database (may have been already deleted)`);
    }
  } catch (error) {
    console.error('Failed to delete asset from Supabase:', error);
    throw error;
  }
};

/**
 * Delete a group from Supabase
 */
export const deleteGroupFromSupabase = async (groupId: string): Promise<void> => {
  // Delete relationships first
  await supabase
    .from('asset_groups')
    .delete()
    .eq('group_id', groupId);

  // Delete group
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId);

  if (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

