import Tesseract from 'tesseract.js';

export async function performOCR(imageData: string): Promise<string> {
  const { data } = await Tesseract.recognize(imageData, 'eng', {
    logger: (m) => console.log(m),
  });
  return data.text;
}

export async function ocrPdfPage(canvas: HTMLCanvasElement): Promise<string> {
  const imageData = canvas.toDataURL('image/png');
  return await performOCR(imageData);
}
