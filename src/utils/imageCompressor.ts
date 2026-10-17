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
    // If not an image or is SVG, use standard base64 read
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
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
