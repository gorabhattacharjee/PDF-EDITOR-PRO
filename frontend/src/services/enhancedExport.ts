/**
 * Enhanced Export Services
 * Handles exports to various formats beyond basic Word/Excel/PPT
 */

import * as pdfjsLib from 'pdfjs-dist';

export const enhancedExport = {
  /**
   * Export to HTML
   */
  async exportToHTML(pdfDoc: pdfjsLib.PDFDocumentProxy, filename: string): Promise<void> {
    let html = '<html><head><style>body { font-family: Arial; padding: 20px; }</style></head><body>';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      html += `<div class="page"><h2>Page ${i}</h2><p>${pageText}</p></div>`;
    }
    
    html += '</body></html>';
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.pdf', '.html');
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export to ePub (simplified)
   */
  async exportToEPub(pdfDoc: pdfjsLib.PDFDocumentProxy, filename: string): Promise<void> {
    // ePub is a zip of XML files
    // This is simplified - real ePub needs proper structure
    let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
    content += '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">\n';
    content += '<metadata><title>' + filename + '</title></metadata>\n';
    content += '<manifest>\n';
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      content += `<item id="page${i}" href="page${i}.xhtml" media-type="application/xhtml+xml"/>\n`;
    }
    
    content += '</manifest>\n</package>';
    
    const blob = new Blob([content], { type: 'application/epub+zip' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.pdf', '.epub');
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export to Markdown
   */
  async exportToMarkdown(pdfDoc: pdfjsLib.PDFDocumentProxy, filename: string): Promise<void> {
    let markdown = `# ${filename}\n\n`;
    
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      
      markdown += `## Page ${i}

${pageText}

`;
    }
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.pdf', '.md');
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Export all pages as images (ZIP)
   */
  async exportAllPagesAsImages(pdfDoc: pdfjsLib.PDFDocumentProxy, filename: string): Promise<void> {
    // Would use JSZip to create a zip file of all pages
    // Simplified version - downloads first page
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({ canvasContext: context, viewport, canvas } as any).promise;
    
    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename.replace('.pdf', '_page1.png');
        link.click();
        URL.revokeObjectURL(url);
      }
    });
  }
};
