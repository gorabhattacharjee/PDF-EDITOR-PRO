import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { Highlight } from '@/stores/useAnnotationsStore';
import type { TextEdit } from '@/stores/useTextEditsStore';
import type { ImageEdit } from '@/stores/useImageEditsStore';

export async function loadPdfLib(file: File): Promise<PDFDocument> {
  const arrayBuffer = await file.arrayBuffer();
  return await PDFDocument.load(arrayBuffer);
}

export async function loadPdfFromBytes(bytes: ArrayBuffer | Uint8Array): Promise<PDFDocument> {
  return await PDFDocument.load(bytes);
}

export async function addTextToPdf(
  pdfDoc: PDFDocument,
  text: string,
  pageIndex: number,
  x: number,
  y: number
): Promise<void> {
  const page = pdfDoc.getPages()[pageIndex];
  page.drawText(text, { x, y, size: 12, color: rgb(0, 0, 0) });
}

export async function savePdf(pdfDoc: PDFDocument): Promise<Uint8Array> {
  return await pdfDoc.save();
}

export async function mergePdfs(files: File[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const pdfDoc = await loadPdfLib(file);
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
    };
  }
  return { r: 1, g: 1, b: 0 };
}

export async function addHighlightsToPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  highlights: Highlight[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const highlight of highlights) {
    const pageIndex = highlight.page;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    const creationZoom = highlight.creationZoom || 1;
    const pdfX = highlight.x / creationZoom;
    const pdfWidth = highlight.width / creationZoom;
    const pdfHeight = highlight.height / creationZoom;
    const pdfY = pageHeight - (highlight.y / creationZoom) - pdfHeight;

    const color = hexToRgb(highlight.color);

    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
      color: rgb(color.r, color.g, color.b),
      opacity: 0.4,
    });
  }

  return await pdfDoc.save();
}

export async function applyTextEditsToPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  textEdits: TextEdit[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const edit of textEdits) {
    const pageIndex = edit.page;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];

    page.drawRectangle({
      x: edit.x - 1,
      y: edit.y - 2,
      width: edit.width + 4,
      height: edit.height + 2,
      color: rgb(1, 1, 1),
      opacity: 1,
    });

    page.drawText(edit.editedText, {
      x: edit.x,
      y: edit.y,
      size: edit.fontSize,
      font: helveticaFont,
      color: rgb(0, 0, 0),
    });
  }

  return await pdfDoc.save();
}

async function getFontForFamily(pdfDoc: PDFDocument, fontFamily: string) {
  const fontMap: Record<string, typeof StandardFonts[keyof typeof StandardFonts]> = {
    'Helvetica': StandardFonts.Helvetica,
    'Helvetica-Bold': StandardFonts.HelveticaBold,
    'Helvetica-Oblique': StandardFonts.HelveticaOblique,
    'TimesRoman': StandardFonts.TimesRoman,
    'TimesRoman-Bold': StandardFonts.TimesRomanBold,
    'TimesRoman-Italic': StandardFonts.TimesRomanItalic,
    'Courier': StandardFonts.Courier,
    'Courier-Bold': StandardFonts.CourierBold,
    'Courier-Oblique': StandardFonts.CourierOblique,
  };
  const fontKey = fontMap[fontFamily] || StandardFonts.Helvetica;
  return await pdfDoc.embedFont(fontKey);
}

export async function applyAllModificationsToPdf(
  pdfBytes: ArrayBuffer | Uint8Array,
  highlights: Highlight[],
  textEdits: TextEdit[],
  imageEdits: ImageEdit[] = []
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  for (const edit of textEdits) {
    const pageIndex = edit.page;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();
    const font = await getFontForFamily(pdfDoc, edit.fontFamily);
    
    const textColor = edit.fontColor ? hexToRgb(edit.fontColor) : { r: 0, g: 0, b: 0 };
    
    const isNewText = edit.id?.startsWith('new-text-');
    const creationZoom = edit.creationZoom || 1;
    
    let pdfX: number;
    let pdfY: number;
    
    if (isNewText) {
      // For NEW text: coordinates are stored as PDF units (already divided by zoom)
      // edit.y is distance from TOP of page in PDF units
      // PDF Y coordinate is from BOTTOM, so we flip it
      pdfX = edit.x;
      pdfY = pageHeight - edit.y;
    } else {
      // For EDITED existing text: use original coordinates
      pdfX = edit.x;
      pdfY = edit.y;
    }
    
    console.log('[pdf-lib] Text edit:', edit.id, 'isNew:', isNewText, 'page:', pageIndex);
    console.log('[pdf-lib] Stored coords: x=', edit.x, 'y=', edit.y, 'creationZoom=', creationZoom);
    console.log('[pdf-lib] PDF coords: x=', pdfX, 'y=', pdfY, 'pageHeight=', pageHeight);

    // Only draw white rectangle for edits to existing text (to cover original)
    if (!isNewText) {
      page.drawRectangle({
        x: pdfX - 1,
        y: pdfY - 2,
        width: edit.width + 4,
        height: edit.height + 2,
        color: rgb(1, 1, 1),
        opacity: 1,
      });
    }

    page.drawText(edit.editedText, {
      x: pdfX,
      y: pdfY,
      size: edit.fontSize,
      font: font,
      color: rgb(textColor.r, textColor.g, textColor.b),
    });
    
    console.log('[pdf-lib] Drew text:', edit.editedText, 'at', pdfX, pdfY);
  }

  console.log('[pdf-lib] Processing', imageEdits.length, 'image edits');
  for (const imageEdit of imageEdits) {
    const pageIndex = imageEdit.page - 1;
    console.log('[pdf-lib] ImageEdit:', imageEdit.id, 'page:', imageEdit.page, '(index:', pageIndex, ') deleted:', imageEdit.deleted, 'hasImageData:', !!imageEdit.imageData);
    if (pageIndex < 0 || pageIndex >= pages.length) {
      console.log('[pdf-lib] Skipping - page out of range');
      continue;
    }

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    const editZoom = imageEdit.zoom || 1;
    console.log('[pdf-lib] EditZoom:', editZoom, 'PageHeight:', pageHeight);
    
    const pdfOrigX = imageEdit.originalX / editZoom;
    const pdfOrigY = imageEdit.originalY / editZoom;
    const pdfOrigWidth = imageEdit.originalWidth / editZoom;
    const pdfOrigHeight = imageEdit.originalHeight / editZoom;
    
    console.log('[pdf-lib] Original PDF coords:', pdfOrigX, pdfOrigY, pdfOrigWidth, 'x', pdfOrigHeight);

    if (imageEdit.deleted) {
      const rectY = pageHeight - pdfOrigY - pdfOrigHeight;
      console.log('[pdf-lib] Drawing white rectangle to delete image at', pdfOrigX, rectY);
      page.drawRectangle({
        x: pdfOrigX,
        y: rectY,
        width: pdfOrigWidth,
        height: pdfOrigHeight,
        color: rgb(1, 1, 1),
        opacity: 1,
      });
    } else if (imageEdit.imageData) {
      const rectY = pageHeight - pdfOrigY - pdfOrigHeight;
      console.log('[pdf-lib] Covering original image with white at', pdfOrigX, rectY, 'size', pdfOrigWidth, 'x', pdfOrigHeight);
      
      page.drawRectangle({
        x: pdfOrigX,
        y: rectY,
        width: pdfOrigWidth,
        height: pdfOrigHeight,
        color: rgb(1, 1, 1),
        opacity: 1,
      });

      try {
        const base64Data = imageEdit.imageData.replace(/^data:image\/\w+;base64,/, '');
        const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        let embeddedImage;
        if (imageEdit.imageData.includes('image/png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        const imageY = pageHeight - pdfOrigY - pdfOrigHeight;
        console.log('[pdf-lib] Drawing edited image at PDF coords:', pdfOrigX, imageY, 'size', pdfOrigWidth, 'x', pdfOrigHeight);
        
        page.drawImage(embeddedImage, {
          x: pdfOrigX,
          y: imageY,
          width: pdfOrigWidth,
          height: pdfOrigHeight,
        });
        console.log('[pdf-lib] Image embedded successfully at exact original position');
      } catch (err) {
        console.error('[pdf-lib] Failed to embed image edit:', err);
      }
    }
  }

  for (const highlight of highlights) {
    const pageIndex = highlight.page;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;

    const page = pages[pageIndex];
    const { height: pageHeight } = page.getSize();

    const creationZoom = highlight.creationZoom || 1;
    const pdfX = highlight.x / creationZoom;
    const pdfWidth = highlight.width / creationZoom;
    const pdfHeight = highlight.height / creationZoom;
    const pdfY = pageHeight - (highlight.y / creationZoom) - pdfHeight;

    const color = hexToRgb(highlight.color);

    page.drawRectangle({
      x: pdfX,
      y: pdfY,
      width: pdfWidth,
      height: pdfHeight,
      color: rgb(color.r, color.g, color.b),
      opacity: 0.4,
    });
  }

  return await pdfDoc.save();
}
