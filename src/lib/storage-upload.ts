import { supabase } from './supabase';
import { ImageAsset } from './types';

const STORAGE_BUCKET = 'images';

/**
 * Upload image file to Supabase Storage
 */
export const uploadImageToStorage = async (
  file: File,
  assetId: string
): Promise<string> => {
  try {
    // Create file path with asset ID
    const fileExt = file.name.split('.').pop();
    const fileName = `${assetId}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading to storage:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to get public URL');
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error('Failed to upload image to storage:', error);
    throw error;
  }
};

/**
 * Delete image from Supabase Storage
 */
export const deleteImageFromStorage = async (asset: ImageAsset): Promise<void> => {
  try {
    // Only delete if it's an uploaded file (stored in Supabase)
    if (asset.sourceType === 'upload' && asset.url.includes('supabase.co')) {
      // Extract file path from URL
      const urlParts = asset.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([fileName]);

      if (error) {
        console.error('Error deleting from storage:', error);
        // Don't throw - file might not exist
      }
    }
  } catch (error) {
    console.error('Failed to delete image from storage:', error);
    // Don't throw - continue even if deletion fails
  }
};

/**
 * Check if Supabase Storage bucket exists and is accessible
 */
export const checkStorageBucket = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('Error checking storage buckets:', error);
      return false;
    }

    const bucketExists = data?.some(bucket => bucket.name === STORAGE_BUCKET);
    return bucketExists || false;
  } catch (error) {
    console.error('Failed to check storage bucket:', error);
    return false;
  }
};

