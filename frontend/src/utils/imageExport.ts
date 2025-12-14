import logger from "./logger";

export interface ImageFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  supported: boolean;
  category: 'standard' | 'professional' | 'vector' | 'raw';
}

export const IMAGE_FORMATS: ImageFormat[] = [
  { id: 'png', name: 'PNG (Lossless)', extension: 'png', mimeType: 'image/png', supported: true, category: 'standard' },
  { id: 'jpg', name: 'JPEG (Compressed)', extension: 'jpg', mimeType: 'image/jpeg', supported: true, category: 'standard' },
  { id: 'webp', name: 'WebP (Modern)', extension: 'webp', mimeType: 'image/webp', supported: true, category: 'standard' },
  { id: 'gif', name: 'GIF (Animation)', extension: 'gif', mimeType: 'image/gif', supported: true, category: 'standard' },
  { id: 'bmp', name: 'BMP (Bitmap)', extension: 'bmp', mimeType: 'image/bmp', supported: true, category: 'standard' },
  { id: 'ico', name: 'ICO (Icon)', extension: 'ico', mimeType: 'image/x-icon', supported: true, category: 'standard' },
  { id: 'avif', name: 'AVIF (Next-Gen)', extension: 'avif', mimeType: 'image/avif', supported: true, category: 'standard' },
  { id: 'tiff', name: 'TIFF (Professional)', extension: 'tiff', mimeType: 'image/tiff', supported: true, category: 'professional' },
  { id: 'heif', name: 'HEIF (Apple)', extension: 'heif', mimeType: 'image/heif', supported: false, category: 'professional' },
  { id: 'psd', name: 'PSD (Photoshop)', extension: 'psd', mimeType: 'image/vnd.adobe.photoshop', supported: false, category: 'professional' },
  { id: 'xcf', name: 'XCF (GIMP)', extension: 'xcf', mimeType: 'image/x-xcf', supported: false, category: 'professional' },
  { id: 'svg', name: 'SVG (Vector)', extension: 'svg', mimeType: 'image/svg+xml', supported: true, category: 'vector' },
  { id: 'ai', name: 'AI (Illustrator)', extension: 'ai', mimeType: 'application/postscript', supported: false, category: 'vector' },
  { id: 'eps', name: 'EPS (PostScript)', extension: 'eps', mimeType: 'application/postscript', supported: false, category: 'vector' },
  { id: 'wmf', name: 'WMF (Windows Meta)', extension: 'wmf', mimeType: 'image/x-wmf', supported: false, category: 'vector' },
  { id: 'emf', name: 'EMF (Enhanced Meta)', extension: 'emf', mimeType: 'image/x-emf', supported: false, category: 'vector' },
  { id: 'raw', name: 'RAW (Camera)', extension: 'raw', mimeType: 'image/x-raw', supported: false, category: 'raw' },
  { id: 'dng', name: 'DNG (Adobe Raw)', extension: 'dng', mimeType: 'image/x-adobe-dng', supported: false, category: 'raw' },
  { id: 'icns', name: 'ICNS (macOS Icon)', extension: 'icns', mimeType: 'image/x-icns', supported: false, category: 'standard' },
];

export const SUPPORTED_FORMATS = IMAGE_FORMATS.filter(f => f.supported);

function canvasToBMP(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  view.setUint8(0, 0x42);
  view.setUint8(1, 0x4D);
  view.setUint32(2, fileSize, true);
  view.setUint32(6, 0, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(30, 0, true);
  view.setUint32(34, pixelArraySize, true);
  view.setUint32(38, 2835, true);
  view.setUint32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);
  
  let offset = 54;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      view.setUint8(offset++, data[i + 2]);
      view.setUint8(offset++, data[i + 1]);
      view.setUint8(offset++, data[i]);
    }
    const padding = rowSize - width * 3;
    for (let p = 0; p < padding; p++) {
      view.setUint8(offset++, 0);
    }
  }
  
  return new Blob([buffer], { type: 'image/bmp' });
}

function canvasToICO(canvas: HTMLCanvasElement, size: number = 32): Blob {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = size;
  tempCanvas.height = size;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  ctx.drawImage(canvas, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const { data } = imageData;
  
  const pngDataUrl = tempCanvas.toDataURL('image/png');
  const base64 = pngDataUrl.split(',')[1];
  const pngBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  
  const icoSize = 6 + 16 + pngBytes.length;
  const buffer = new ArrayBuffer(icoSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  
  view.setUint8(6, size === 256 ? 0 : size);
  view.setUint8(7, size === 256 ? 0 : size);
  view.setUint8(8, 0);
  view.setUint8(9, 0);
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, pngBytes.length, true);
  view.setUint32(18, 22, true);
  
  bytes.set(pngBytes, 22);
  
  return new Blob([buffer], { type: 'image/x-icon' });
}

function canvasToSVG(canvas: HTMLCanvasElement): Blob {
  const dataUrl = canvas.toDataURL('image/png');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}">
  <title>PDF Page Export</title>
  <image width="${canvas.width}" height="${canvas.height}" xlink:href="${dataUrl}"/>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

function canvasToTIFF(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Cannot get canvas context');
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { width, height, data } = imageData;
  
  const stripSize = width * height * 3;
  const ifdOffset = 8;
  const numTags = 12;
  const ifdSize = 2 + numTags * 12 + 4;
  const stripOffset = ifdOffset + ifdSize;
  const fileSize = stripOffset + stripSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  view.setUint16(0, 0x4949, false);
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  
  let offset = ifdOffset;
  view.setUint16(offset, numTags, true);
  offset += 2;
  
  const writeTag = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, count, true);
    view.setUint32(offset + 8, value, true);
    offset += 12;
  };
  
  writeTag(256, 3, 1, width);
  writeTag(257, 3, 1, height);
  writeTag(258, 3, 1, 8);
  writeTag(259, 3, 1, 1);
  writeTag(262, 3, 1, 2);
  writeTag(273, 4, 1, stripOffset);
  writeTag(277, 3, 1, 3);
  writeTag(278, 4, 1, height);
  writeTag(279, 4, 1, stripSize);
  writeTag(282, 5, 1, 0);
  writeTag(283, 5, 1, 0);
  writeTag(296, 3, 1, 2);
  
  view.setUint32(offset, 0, true);
  
  let pixelOffset = stripOffset;
  for (let i = 0; i < data.length; i += 4) {
    bytes[pixelOffset++] = data[i];
    bytes[pixelOffset++] = data[i + 1];
    bytes[pixelOffset++] = data[i + 2];
  }
  
  return new Blob([buffer], { type: 'image/tiff' });
}

export async function exportCanvasToFormat(
  canvas: HTMLCanvasElement,
  formatId: string,
  filename: string
): Promise<{ success: boolean; error?: string; filename?: string }> {
  const format = IMAGE_FORMATS.find(f => f.id === formatId);
  if (!format) {
    return { success: false, error: `Unknown format: ${formatId}` };
  }
  
  if (!format.supported) {
    const fallbackFilename = `${filename}.png`;
    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    
    if (fallbackBlob) {
      const url = URL.createObjectURL(fallbackBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fallbackFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      logger.success(`Exported as PNG (${format.name} not available in browser): ${fallbackFilename}`);
      return { 
        success: true, 
        filename: fallbackFilename,
        error: `${format.name} requires specialized software. Exported as PNG instead - you can convert it using Adobe, GIMP, or online converters.`
      };
    }
    return { success: false, error: `Failed to create fallback PNG export` };
  }
  
  try {
    let blob: Blob | null = null;
    const outputFilename = `${filename}.${format.extension}`;
    
    switch (formatId) {
      case 'png':
      case 'jpg':
      case 'webp':
      case 'avif':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), format.mimeType, 0.92);
        });
        break;
        
      case 'gif':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/gif');
        });
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
          });
          if (blob) {
            return { 
              success: true, 
              filename: filename + '.png',
              error: 'GIF not supported, exported as PNG instead'
            };
          }
        }
        break;
        
      case 'bmp':
        blob = canvasToBMP(canvas);
        break;
        
      case 'ico':
        blob = canvasToICO(canvas, 256);
        break;
        
      case 'svg':
        blob = canvasToSVG(canvas);
        break;
        
      case 'tiff':
        blob = canvasToTIFF(canvas);
        break;
        
      default:
        return { success: false, error: `Format ${formatId} not implemented` };
    }
    
    if (!blob) {
      return { success: false, error: `Failed to create ${format.name} blob` };
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = outputFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    logger.success(`Exported as ${format.name}: ${outputFilename}`);
    return { success: true, filename: outputFilename };
  } catch (err) {
    logger.error(`Export to ${format.name} failed: ${err}`);
    return { success: false, error: String(err) };
  }
}

export function buildFormatSelectionPrompt(): string {
  let prompt = 'SELECT IMAGE FORMAT\n\n';
  prompt += '━━━ Standard Formats ━━━\n';
  prompt += '1 = PNG (lossless, best quality)\n';
  prompt += '2 = JPEG (compressed, smaller)\n';
  prompt += '3 = WebP (modern, optimized)\n';
  prompt += '4 = GIF (animation support)\n';
  prompt += '5 = BMP (uncompressed bitmap)\n';
  prompt += '6 = ICO (Windows icon)\n';
  prompt += '7 = AVIF (next-gen, smallest)\n';
  prompt += '\n━━━ Professional Formats ━━━\n';
  prompt += '8 = TIFF (print-ready)\n';
  prompt += '9 = SVG (scalable vector)\n';
  prompt += '\n━━━ Specialized (exports as PNG) ━━━\n';
  prompt += '10 = HEIF/HEIC (Apple format)\n';
  prompt += '11 = PSD (Photoshop)\n';
  prompt += '12 = RAW/DNG (Camera)\n';
  prompt += '13 = AI/EPS (Illustrator)\n';
  prompt += '14 = WMF/EMF (Windows Meta)\n';
  prompt += '15 = ICNS (macOS icon)\n';
  prompt += '\nEnter number (1-15):';
  return prompt;
}

export function getFormatFromChoice(choice: string): string | null {
  const formatMap: Record<string, string> = {
    '1': 'png',
    '2': 'jpg',
    '3': 'webp',
    '4': 'gif',
    '5': 'bmp',
    '6': 'ico',
    '7': 'avif',
    '8': 'tiff',
    '9': 'svg',
    '10': 'heif',
    '11': 'psd',
    '12': 'raw',
    '13': 'ai',
    '14': 'wmf',
    '15': 'icns',
  };
  return formatMap[choice] || null;
}

export async function findPdfCanvas(): Promise<HTMLCanvasElement | null> {
  let canvasElement: HTMLCanvasElement | null = null;
  
  const canvasPanel = document.querySelector('.canvas-panel');
  if (canvasPanel) {
    for (let i = 0; i < 50; i++) {
      const canvases = canvasPanel.querySelectorAll('canvas');
      if (canvases.length > 0) {
        const mainCanvas = canvases[0] as HTMLCanvasElement;
        if (mainCanvas && mainCanvas.width > 0) {
          return mainCanvas;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  for (let i = 0; i < 30; i++) {
    canvasElement = document.querySelector('canvas[class*="shadow"]') as HTMLCanvasElement;
    if (!canvasElement) {
      canvasElement = document.querySelector('canvas') as HTMLCanvasElement;
    }
    if (canvasElement && canvasElement.width > 0) {
      return canvasElement;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return null;
}

export async function performImageExport(
  documentName: string,
  pageNumber?: number
): Promise<boolean> {
  const canvas = await findPdfCanvas();
  
  if (!canvas || canvas.width === 0) {
    alert('ERROR: PDF canvas not rendered.\n\nMake sure:\n1. PDF is fully loaded\n2. Canvas is visible on screen\n3. Wait 2-3 seconds after loading\n4. Try again');
    return false;
  }
  
  const choice = prompt(buildFormatSelectionPrompt(), '1');
  if (!choice) return false;
  
  const formatId = getFormatFromChoice(choice);
  if (!formatId) {
    alert('Invalid choice. Please enter a number 1-15.');
    return false;
  }
  
  const baseName = documentName.replace('.pdf', '');
  const pageSuffix = pageNumber ? `_page${pageNumber}` : `_${Date.now()}`;
  const filename = `${baseName}${pageSuffix}`;
  
  const result = await exportCanvasToFormat(canvas, formatId, filename);
  
  if (result.success) {
    const format = IMAGE_FORMATS.find(f => f.id === formatId);
    let message = `Image exported successfully!\n\nFile: ${result.filename}\nFormat: ${format?.name || formatId.toUpperCase()}`;
    if (result.error) {
      message += `\n\nNote: ${result.error}`;
    }
    alert(message);
    return true;
  } else {
    alert(`Export failed: ${result.error}`);
    return false;
  }
}
