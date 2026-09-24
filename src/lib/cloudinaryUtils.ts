/**
 * Client-safe Cloudinary URL optimizer.
 * Does not import any server-side libraries (like 'cloudinary' or 'fs').
 */
export function optimizeCloudinaryUrl(url: string | null | undefined, width: number = 300): string {
  if (!url) return '';
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  if (url.includes('/upload/f_auto') || url.includes('/upload/c_')) {
    return url;
  }
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}
