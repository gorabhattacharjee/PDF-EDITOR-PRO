import logger from "./logger";

export interface ImageFormat {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  supported: boolean;
  category: 'standard' | 'professional' | 'vector' | 'raw';
  description?: string;
}

export const IMAGE_FORMATS: ImageFormat[] = [
  // Standard formats - fully supported in browser
  { id: 'png', name: 'PNG', extension: 'png', mimeType: 'image/png', supported: true, category: 'standard', description: 'Lossless, best quality' },
  { id: 'jpg', name: 'JPEG', extension: 'jpg', mimeType: 'image/jpeg', supported: true, category: 'standard', description: 'Compressed, smaller size' },
  { id: 'webp', name: 'WebP', extension: 'webp', mimeType: 'image/webp', supported: true, category: 'standard', description: 'Modern, optimized' },
  { id: 'gif', name: 'GIF', extension: 'gif', mimeType: 'image/gif', supported: true, category: 'standard', description: 'Animation support' },
  { id: 'bmp', name: 'BMP', extension: 'bmp', mimeType: 'image/bmp', supported: true, category: 'standard', description: 'Uncompressed bitmap' },
  { id: 'ico', name: 'ICO', extension: 'ico', mimeType: 'image/x-icon', supported: true, category: 'standard', description: 'Windows icon' },
  { id: 'tiff', name: 'TIFF', extension: 'tiff', mimeType: 'image/tiff', supported: true, category: 'professional', description: 'Print-ready TIFF' },
  { id: 'svg', name: 'SVG', extension: 'svg', mimeType: 'image/svg+xml', supported: true, category: 'vector', description: 'Scalable vector' },
  // Professional formats - partial/fallback support
  { id: 'avif', name: 'AVIF', extension: 'avif', mimeType: 'image/avif', supported: false, category: 'professional', description: 'Next-gen format (exports as PNG)' },
  { id: 'heif', name: 'HEIF', extension: 'heif', mimeType: 'image/heif', supported: false, category: 'professional', description: 'Apple/iOS format (exports as PNG)' },
  { id: 'psd', name: 'PSD', extension: 'psd', mimeType: 'image/vnd.adobe.photoshop', supported: false, category: 'professional', description: 'Adobe Photoshop (exports as PNG)' },
  { id: 'xcf', name: 'XCF', extension: 'xcf', mimeType: 'image/x-xcf', supported: false, category: 'professional', description: 'GIMP native format (exports as PNG)' },
  { id: 'ai', name: 'AI', extension: 'ai', mimeType: 'image/x-adobe-illustrator', supported: false, category: 'professional', description: 'Adobe Illustrator (exports as PNG)' },
  { id: 'eps', name: 'EPS', extension: 'eps', mimeType: 'application/postscript', supported: false, category: 'professional', description: 'Encapsulated PostScript (exports as PNG)' },
  { id: 'wmf', name: 'WMF', extension: 'wmf', mimeType: 'image/x-wmf', supported: false, category: 'professional', description: 'Windows Metafile (exports as PNG)' },
  { id: 'emf', name: 'EMF', extension: 'emf', mimeType: 'image/x-emf', supported: false, category: 'professional', description: 'Enhanced Metafile (exports as PNG)' },
  { id: 'raw', name: 'RAW', extension: 'raw', mimeType: 'image/x-raw', supported: false, category: 'raw', description: 'Raw image data (exports as PNG)' },
  { id: 'dng', name: 'DNG', extension: 'dng', mimeType: 'image/x-dng', supported: false, category: 'raw', description: 'Digital Negative (exports as PNG)' },
  { id: 'icns', name: 'ICNS', extension: 'icns', mimeType: 'image/x-icns', supported: false, category: 'professional', description: 'macOS icon format (exports as PNG)' },
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
  const numTags = 14;
  const ifdSize = 2 + numTags * 12 + 4;
  const rationalsOffset = 8 + ifdSize;
  const bitsPerSampleOffset = rationalsOffset + 16;
  const stripOffset = bitsPerSampleOffset + 6;
  const fileSize = stripOffset + stripSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  
  view.setUint8(0, 0x49);
  view.setUint8(1, 0x49);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  
  let offset = 8;
  view.setUint16(offset, numTags, true);
  offset += 2;
  
  const writeTag = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(offset, tag, true);
    view.setUint16(offset + 2, type, true);
    view.setUint32(offset + 4, count, true);
    view.setUint32(offset + 8, value, true);
    offset += 12;
  };
  
  writeTag(256, 4, 1, width);
  writeTag(257, 4, 1, height);
  writeTag(258, 3, 3, bitsPerSampleOffset);
  writeTag(259, 3, 1, 1);
  writeTag(262, 3, 1, 2);
  writeTag(273, 4, 1, stripOffset);
  writeTag(277, 3, 1, 3);
  writeTag(278, 4, 1, height);
  writeTag(279, 4, 1, stripSize);
  writeTag(282, 5, 1, rationalsOffset);
  writeTag(283, 5, 1, rationalsOffset + 8);
  writeTag(284, 3, 1, 1);
  writeTag(296, 3, 1, 2);
  writeTag(339, 3, 1, 1);
  
  view.setUint32(offset, 0, true);
  
  view.setUint32(rationalsOffset, 72, true);
  view.setUint32(rationalsOffset + 4, 1, true);
  view.setUint32(rationalsOffset + 8, 72, true);
  view.setUint32(rationalsOffset + 12, 1, true);
  
  view.setUint16(bitsPerSampleOffset, 8, true);
  view.setUint16(bitsPerSampleOffset + 2, 8, true);
  view.setUint16(bitsPerSampleOffset + 4, 8, true);
  
  let pixelOffset = stripOffset;
  for (let i = 0; i < data.length; i += 4) {
    bytes[pixelOffset++] = data[i];
    bytes[pixelOffset++] = data[i + 1];
    bytes[pixelOffset++] = data[i + 2];
  }
  
  return new Blob([buffer], { type: 'image/tiff' });
}

export interface ExportOptions {
  quality?: number;
  scale?: number;
}

export async function exportCanvasToFormat(
  canvas: HTMLCanvasElement,
  formatId: string,
  filename: string,
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string; filename?: string }> {
  const format = IMAGE_FORMATS.find(f => f.id === formatId);
  if (!format) {
    return { success: false, error: `Unknown format: ${formatId}` };
  }
  
  const quality = options.quality ?? 0.92;
  
  try {
    let blob: Blob | null = null;
    const outputFilename = `${filename}.${format.extension}`;
    let actualFormat = format;
    
    switch (formatId) {
      case 'png':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
        break;
        
      case 'jpg':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
        });
        break;
        
      case 'webp':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/webp', quality);
        });
        if (!blob) {
          blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/png');
          });
          if (blob) {
            const pngFilename = `${filename}.png`;
            downloadBlob(blob, pngFilename);
            logger.success(`Exported as PNG (WebP not supported): ${pngFilename}`);
            return { 
              success: true, 
              filename: pngFilename,
              error: 'WebP not supported in this browser. Exported as PNG instead.'
            };
          }
        }
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
            const pngFilename = `${filename}.png`;
            downloadBlob(blob, pngFilename);
            logger.success(`Exported as PNG (GIF not supported): ${pngFilename}`);
            return { 
              success: true, 
              filename: pngFilename,
              error: 'GIF not supported. Exported as PNG instead.'
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
        
      case 'avif':
      case 'heif':
      case 'psd':
      case 'xcf':
      case 'ai':
      case 'eps':
      case 'wmf':
      case 'emf':
      case 'raw':
      case 'dng':
      case 'icns':
        blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
        if (blob) {
          const pngFilename = `${filename}.png`;
          downloadBlob(blob, pngFilename);
          const formatName = formatId.toUpperCase();
          logger.success(`Exported as PNG (${formatName} requires specialized tools): ${pngFilename}`);
          return { 
            success: true, 
            filename: pngFilename,
            error: `${formatName} format not supported in browser. Exported as PNG instead.`
          };
        }
        break;
        
      default:
        return { success: false, error: `Format ${formatId} not implemented` };
    }
    
    if (!blob) {
      return { success: false, error: `Failed to create ${format.name} image` };
    }
    
    downloadBlob(blob, outputFilename);
    logger.success(`Exported as ${format.name}: ${outputFilename}`);
    return { success: true, filename: outputFilename };
  } catch (err) {
    logger.error(`Export to ${format.name} failed: ${err}`);
    return { success: false, error: String(err) };
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function findPdfCanvas(): Promise<HTMLCanvasElement | null> {
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
    let canvasElement = document.querySelector('canvas[class*="shadow"]') as HTMLCanvasElement;
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
  formatId: string,
  pageNumber?: number,
  options: ExportOptions = {}
): Promise<{ success: boolean; error?: string; filename?: string }> {
  const canvas = await findPdfCanvas();
  
  if (!canvas || canvas.width === 0) {
    return { 
      success: false, 
      error: 'PDF canvas not rendered. Please wait for the PDF to fully load and try again.' 
    };
  }
  
  const baseName = documentName.replace('.pdf', '');
  const pageSuffix = pageNumber ? `_page${pageNumber}` : '';
  const filename = `${baseName}${pageSuffix}`;
  
  return await exportCanvasToFormat(canvas, formatId, filename, options);
}
