import { PDFDocument, rgb, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

export const pdfOperations = {
  // Add text to PDF
  addText: async (
    pdfDoc: PDFDocument,
    text: string,
    pageIndex: number,
    x: number,
    y: number,
    fontSize = 12,
    color = rgb(0, 0, 0)
  ) => {
    const pages = pdfDoc.getPages();
    const page = pages[pageIndex];
    page.drawText(text, { x, y, size: fontSize, color });
    return pdfDoc;
  },

  // Rotate page
  rotatePage: async (pdfDoc: PDFDocument, pageIndex: number, angle: number) => {
    const pages = pdfDoc.getPages();
    const page = pages[pageIndex];
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + angle));
    return pdfDoc;
  },

  // Delete page
  deletePage: async (pdfDoc: PDFDocument, pageIndex: number) => {
    pdfDoc.removePage(pageIndex);
    return pdfDoc;
  },

  // Insert blank page
  insertPage: async (pdfDoc: PDFDocument, atIndex: number) => {
    pdfDoc.insertPage(atIndex);
    return pdfDoc;
  },

  // Duplicate page
  duplicatePage: async (pdfDoc: PDFDocument, pageIndex: number) => {
    const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [pageIndex]);
    pdfDoc.insertPage(pageIndex + 1, copiedPage);
    return pdfDoc;
  },

  // Extract pages to new PDF
  extractPages: async (pdfDoc: PDFDocument, pageIndices: number[]) => {
    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
    copiedPages.forEach((page) => newPdf.addPage(page));
    return newPdf;
  },

  // Split PDF into multiple files
  splitPdf: async (pdfDoc: PDFDocument) => {
    const splits: PDFDocument[] = [];
    const numPages = pdfDoc.getPageCount();
    
    for (let i = 0; i < numPages; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(copiedPage);
      splits.push(newPdf);
    }
    
    return splits;
  },

  // Merge multiple PDFs
  mergePdfs: async (pdfDocs: PDFDocument[]) => {
    const mergedPdf = await PDFDocument.create();
    
    for (const pdfDoc of pdfDocs) {
      const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }
    
    return mergedPdf;
  },

  // Save PDF
  savePdf: async (pdfDoc: PDFDocument, filename: string) => {
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    URL.revokeObjectURL(url);
  },

  // Convert page to image
  pageToImage: async (pdfDoc: any, pageNum: number, scale = 2) => {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;
    
    return canvas.toDataURL('image/png');
  },

  // Compress PDF (simplified - just re-save with compression)
  compressPdf: async (pdfDoc: PDFDocument) => {
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: true,
    });
    return PDFDocument.load(pdfBytes);
  },

  // Add image to PDF
  addImage: async (
    pdfDoc: PDFDocument,
    imageBytes: Uint8Array,
    pageIndex: number,
    x: number,
    y: number,
    width: number,
    height: number,
    imageType: 'png' | 'jpg'
  ) => {
    const pages = pdfDoc.getPages();
    const page = pages[pageIndex];
    
    const image = imageType === 'png' 
      ? await pdfDoc.embedPng(imageBytes)
      : await pdfDoc.embedJpg(imageBytes);
    
    page.drawImage(image, { x, y, width, height });
    return pdfDoc;
  },

  // Flatten annotations (burn them into the PDF)
  flattenPdf: async (pdfDoc: PDFDocument) => {
    // This is a simplified version - just re-save
    // In production, you'd need to render all annotations as actual content
    const pdfBytes = await pdfDoc.save();
    return PDFDocument.load(pdfBytes);
  },

  // Password protect PDF
  encryptPdf: async (pdfDoc: PDFDocument, password: string) => {
    // Note: pdf-lib doesn't support encryption directly
    // This would need a backend service or different library
    // For now, just save normally
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  },

  // Export to text
  exportToText: async (pdfDoc: any, pageNum: number) => {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(' ');
    return text;
  },
};
