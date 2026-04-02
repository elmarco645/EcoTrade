/**
 * Safely parses images from a listing.
 * Handles both stringified JSON and actual arrays.
 */
export function getImages(imagesData: any): string[] {
  if (!imagesData) return [];
  
  if (Array.isArray(imagesData)) {
    return imagesData;
  }
  
  if (typeof imagesData === 'string') {
    try {
      const parsed = JSON.parse(imagesData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Failed to parse images string:', imagesData);
      return [];
    }
  }
  
  return [];
}

/**
 * Gets the first image from a listing or a fallback.
 */
export function getFirstImage(imagesData: any, fallbackId?: string): string {
  const images = getImages(imagesData);
  if (images.length > 0 && images[0]) {
    return images[0];
  }
  return `https://picsum.photos/seed/${fallbackId || 'default'}/400/400`;
}
