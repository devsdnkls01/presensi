import { v2 as cloudinary } from 'cloudinary';

// Cloudinary will automatically read process.env.CLOUDINARY_URL if present,
// but we also configure explicit options if needed
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
  });
}

/**
 * Upload an image (base64 data URL, remote URL, or local path) to Cloudinary.
 * If photo is updated with the same publicId, it automatically overwrites and invalidates CDN cache.
 *
 * @param imageSource base64 data URI (e.g. "data:image/png;base64,...") or file path
 * @param folder Folder name in Cloudinary (e.g. "presensi-siswa/students" or "presensi-siswa/logos")
 * @param publicId Optional unique ID (e.g. "student_123" or "school_kalisalak_logo")
 * @returns The secure HTTPS Cloudinary URL, or fallback to original source if Cloudinary credentials fail
 */
export async function uploadToCloudinary(
  imageSource: string,
  folder: string = 'presensi-siswa',
  publicId?: string
): Promise<string> {
  if (!imageSource) return imageSource;

  // If it's already a full cloudinary URL and we don't have new raw data, keep it
  if (imageSource.startsWith('https://res.cloudinary.com/')) {
    return imageSource;
  }

  // Only upload if it's a base64 data URL or local image
  const isBase64 = imageSource.startsWith('data:image/');
  const isLocalFile = imageSource.startsWith('/') || imageSource.includes(':\\');

  if (!isBase64 && !isLocalFile && !imageSource.startsWith('http')) {
    return imageSource;
  }

  try {
    const uploadOptions: Record<string, any> = {
      folder,
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(imageSource, uploadOptions);
    console.log(`[Cloudinary] Successfully uploaded image to: ${result.secure_url}`);
    return result.secure_url;
  } catch (error: any) {
    console.warn('[Cloudinary Warning] Upload failed:', error?.message || error);
    if (error?.http_code === 401 || error?.message?.includes('api_secret mismatch')) {
      console.warn(
        '[Cloudinary Notice] Cloudinary API Secret mismatch. Please verify the API Secret in CLOUDINARY_URL.'
      );
    }
    // Return original source as fallback so user action is not blocked
    return imageSource;
  }
}

/**
 * Delete an image from Cloudinary by public ID
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    const res = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    return res.result === 'ok';
  } catch (error) {
    console.warn('[Cloudinary Warning] Delete failed:', error);
    return false;
  }
}

export default cloudinary;
