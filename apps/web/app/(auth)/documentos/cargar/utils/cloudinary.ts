/**
 * Cloudinary transformation utilities for optimized image loading
 * Provides thumbnail generation with different sizes for list and modal views
 */

export interface CloudinaryThumbnailOptions {
  width?: number
  height?: number
  quality?: 'auto:good' | 'auto:best' | 'auto:eco' | 'auto:low'
  format?: 'auto' | 'webp' | 'jpg' | 'png'
}

/**
 * Generates a Cloudinary thumbnail URL with specified transformations
 * Optimized for mobile devices with lazy loading support
 *
 * @param publicId - The Cloudinary public ID from the database
 * @param options - Transformation options for the thumbnail
 * @returns Transformed Cloudinary URL
 *
 * @example
 * // List view thumbnail (150x150)
 * getCloudinaryThumbnail(doc.publicId, { width: 150, height: 150 })
 *
 * // Modal view (800x800)
 * getCloudinaryThumbnail(doc.publicId, { width: 800, height: 800 })
 */
export function getCloudinaryThumbnail(
  publicId: string,
  options: CloudinaryThumbnailOptions = {}
): string {
  const {
    width = 150,
    height = 150,
    quality = 'auto:good',
    format = 'auto',
  } = options

  // Build transformation string
  const transformations = [
    `c_fill`,           // Crop mode: fill
    `w_${width}`,       // Width
    `h_${height}`,      // Height
    `q_${quality}`,     // Quality
    `f_${format}`,      // Format
  ].join(',')

  // Replace /upload/ with /upload/{transformations}/
  return publicId.replace(
    '/upload/',
    `/upload/${transformations}/`
  )
}

/**
 * Preset configurations for common thumbnail sizes
 */
export const CloudinaryPresets = {
  /** Small thumbnail for list view (150x150) */
  listThumbnail: (publicId: string) =>
    getCloudinaryThumbnail(publicId, { width: 150, height: 150, quality: 'auto:good' }),

  /** Medium thumbnail for grid view (300x300) */
  gridThumbnail: (publicId: string) =>
    getCloudinaryThumbnail(publicId, { width: 300, height: 300, quality: 'auto:good' }),

  /** Large thumbnail for modal/preview (800x800) */
  modalPreview: (publicId: string) =>
    getCloudinaryThumbnail(publicId, { width: 800, height: 800, quality: 'auto:best' }),

  /** Full image without transformations */
  original: (publicId: string) => publicId,
} as const
