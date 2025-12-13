import * as pdfjsLib from 'pdfjs-dist';

export async function exportToImage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  filename: string
): Promise<void> {
  const page = await pdfDoc.getPage(pageNum);
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
      link.download = `${filename}_page_${pageNum}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }
  });
}

export async function exportToText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNum: number,
  filename: string
): Promise<void> {
  const page = await pdfDoc.getPage(pageNum);
  const textContent = await page.getTextContent();
  const text = textContent.items.map((item: any) => item.str).join(' ');
  
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_page_${pageNum}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}
