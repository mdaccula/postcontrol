/**
 * Storage Service
 * Handles all file storage operations (uploads, downloads, signed URLs)
 */

import { supabase } from '@/integrations/supabase/client';
import type { ServiceResponse, SignedUrlResponse, UploadResponse } from '@/types/api';

/**
 * Uploads a file to a storage bucket
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @param file - File to upload
 * @returns Upload response with path and URL
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<ServiceResponse<UploadResponse>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Generate signed URL for the uploaded file
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 3600);

    if (urlError) throw urlError;

    return {
      data: {
        path: data.path,
        url: urlData.signedUrl,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Uploads a screenshot to the screenshots bucket
 * @param userId - User ID (for path organization)
 * @param file - Screenshot file
 * @param prefix - Optional prefix for file path
 * @returns Upload response
 */
export async function uploadScreenshot(
  userId: string,
  file: File,
  prefix?: string
): Promise<ServiceResponse<UploadResponse>> {
  try {
    const timestamp = Date.now();
    const fileName = `${prefix || 'screenshot'}_${timestamp}.${file.name.split('.').pop()}`;
    const path = `${userId}/${fileName}`;

    return await uploadFile('screenshots', path, file);
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Generates a signed URL for a file
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Signed URL
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600
): Promise<ServiceResponse<string>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;

    return {
      data: data.signedUrl,
      error: null,
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Generates signed URLs for multiple files
 * @param bucket - Bucket name
 * @param paths - Array of file paths
 * @param expiresIn - Expiration time in seconds (default: 3600)
 * @returns Array of signed URL responses
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn: number = 3600
): Promise<ServiceResponse<SignedUrlResponse[]>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrls(paths, expiresIn);

    if (error) throw error;

    const signedUrls = data.map((item, index) => ({
      url: item.signedUrl,
      path: paths[index],
    }));

    return {
      data: signedUrls,
      error: null,
    };
  } catch (error) {
    console.error('Error generating signed URLs:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes a file from storage
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @returns Success status
 */
export async function deleteFile(
  bucket: string,
  path: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Deletes multiple files from storage
 * @param bucket - Bucket name
 * @param paths - Array of file paths
 * @returns Success status
 */
export async function deleteFiles(
  bucket: string,
  paths: string[]
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.storage.from(bucket).remove(paths);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting files:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Lists files in a storage bucket path
 * @param bucket - Bucket name
 * @param path - Path in bucket (optional)
 * @returns List of files
 */
export async function listFiles(
  bucket: string,
  path?: string
): Promise<ServiceResponse<any[]>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Downloads a file from storage
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @returns File blob
 */
export async function downloadFile(
  bucket: string,
  path: string
): Promise<ServiceResponse<Blob>> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;

    return {
      data,
      error: null,
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Gets public URL for a file (for public buckets)
 * @param bucket - Bucket name
 * @param path - File path in bucket
 * @returns Public URL
 */
export async function getPublicUrl(
  bucket: string,
  path: string
): Promise<ServiceResponse<string>> {
  try {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    return {
      data: data.publicUrl,
      error: null,
    };
  } catch (error) {
    console.error('Error getting public URL:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Moves a file to a new path
 * @param bucket - Bucket name
 * @param fromPath - Current file path
 * @param toPath - New file path
 * @returns Success status
 */
export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error moving file:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}

/**
 * Copies a file to a new path
 * @param bucket - Bucket name
 * @param fromPath - Source file path
 * @param toPath - Destination file path
 * @returns Success status
 */
export async function copyFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<ServiceResponse<null>> {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .copy(fromPath, toPath);

    if (error) throw error;

    return {
      data: null,
      error: null,
    };
  } catch (error) {
    console.error('Error copying file:', error);
    return {
      data: null,
      error: error as Error,
    };
  }
}
