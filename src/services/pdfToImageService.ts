/**
 * Service to render PDF document pages into high-resolution images (PNG Data URLs)
 * using pdfjs-dist and HTML5 Canvas in the browser.
 */

export interface PdfPageImage {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Converts a base64 or ArrayBuffer PDF into an array of image data URLs (PNG)
 * @param pdfSource Data URL (data:application/pdf;base64,...), Base64 string, or ArrayBuffer/Uint8Array
 * @param scale Resolution scaling factor (default: 2.0 for sharp printing)
 * @param maxPages Maximum number of pages to convert (default: all pages, or pass 1 for first page only)
 */
export async function convertPdfToImages(
  pdfSource: string | ArrayBuffer | Uint8Array,
  scale: number = 2.0,
  maxPages?: number
): Promise<PdfPageImage[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('convertPdfToImages requires a browser environment with Canvas support.');
    return [];
  }

  let pdfData: Uint8Array | ArrayBuffer;

  if (typeof pdfSource === 'string') {
    if (pdfSource.startsWith('data:')) {
      const pureBase64 = pdfSource.includes(',') ? pdfSource.split(',')[1] : pdfSource;
      const binaryString = atob(pureBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfData = bytes;
    } else if (pdfSource.startsWith('http://') || pdfSource.startsWith('https://')) {
      // Fetch remote PDF
      const resp = await fetch(pdfSource);
      pdfData = await resp.arrayBuffer();
    } else {
      // Assume pure base64 string
      const binaryString = atob(pdfSource);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfData = bytes;
    }
  } else {
    pdfData = pdfSource;
  }

  const pdfjsLib = await import('pdfjs-dist');

  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  }

  const loadingTask = pdfjsLib.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  const totalPages = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;
  const pageImages: PdfPageImage[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill white background before rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: ctx,
      viewport: viewport,
    };

    await page.render(renderContext as any).promise;

    const dataUrl = canvas.toDataURL('image/png', 0.95);
    pageImages.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pageImages;
}

/**
 * Convenience helper: converts the first page of a PDF or returns image as-is
 */
export async function ensureImageFromCertificate(
  sourceUrl: string
): Promise<string | null> {
  if (!sourceUrl) return null;

  // If already an image (data:image/ or .png/.jpg/.jpeg)
  if (
    sourceUrl.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|bmp)(\?.*)?$/i.test(sourceUrl)
  ) {
    return sourceUrl;
  }

  // If it's a PDF
  const isPdf =
    sourceUrl.startsWith('data:application/pdf') ||
    /\.pdf(\?.*)?$/i.test(sourceUrl);

  if (isPdf) {
    try {
      const images = await convertPdfToImages(sourceUrl, 2.0, 1);
      if (images.length > 0) {
        return images[0].dataUrl;
      }
    } catch (err) {
      console.warn('Failed to convert certificate PDF to image:', err);
    }
  }

  return null;
}

