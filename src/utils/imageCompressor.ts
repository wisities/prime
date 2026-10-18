/**
 * Image compression utility for report diagrams, logos, and photos
 * Automatically scales down massive camera/phone images (3-10MB) to optimal report resolution (100-300KB)
 * while preserving high visual sharpness for both screen display and Word (.docx) prints.
 */

export function compressImageFile(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.72
): Promise<string> {
  return new Promise((resolve) => {
    // If SVG, allow small SVGs only (< 500KB)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      if (file.size > 500 * 1024) {
        console.warn('SVG file too large, rejected to prevent memory bloat');
        resolve('');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    // Verify image format via mime type OR file extension (critical on Windows where file.type can be empty)
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|jfif)$/i.test(file.name);
    if (!isImage) {
      console.warn('Non-image file rejected in compressImageFile:', file.name, file.type);
      resolve('');
      return;
    }

    const img = new Image();
    const blobUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(blobUrl);

      let width = img.width;
      let height = img.height;

      // Calculate aspect ratio scale
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Small transparent PNGs (< 250KB) can remain PNG, otherwise JPEG for massive compression
      const isSmallPng = file.type === 'image/png' && file.size < 250 * 1024;
      const mimeType = isSmallPng ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);

      // Reclaim canvas memory from GPU & V8 Heap immediately
      canvas.width = 0;
      canvas.height = 0;

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(blobUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    };

    img.src = blobUrl;
  });
}
