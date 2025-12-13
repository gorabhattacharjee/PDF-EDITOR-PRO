export interface ExtractedImage {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageData: string;
}

export async function extractImagesFromPage(
  pdf: any,
  pageNum: number,
  scale: number
): Promise<ExtractedImage[]> {
  const images: ExtractedImage[] = [];
  
  try {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const operatorList = await page.getOperatorList();
    
    const pdfjs = (window as any).pdfjs || (window as any).pdfjsLib;
    if (!pdfjs || !pdfjs.OPS) {
      console.warn('[ImageExtract] PDF.js OPS not available');
      return images;
    }
    
    const OPS = pdfjs.OPS;
    let imageIndex = 0;
    
    const transformStack: number[][] = [];
    let currentTransform = [1, 0, 0, 1, 0, 0];
    
    const multiplyTransforms = (t1: number[], t2: number[]): number[] => {
      return [
        t1[0] * t2[0] + t1[2] * t2[1],
        t1[1] * t2[0] + t1[3] * t2[1],
        t1[0] * t2[2] + t1[2] * t2[3],
        t1[1] * t2[2] + t1[3] * t2[3],
        t1[0] * t2[4] + t1[2] * t2[5] + t1[4],
        t1[1] * t2[4] + t1[3] * t2[5] + t1[5],
      ];
    };
    
    const imageOps = [
      OPS.paintImageXObject,
      OPS.paintJpegXObject,
      OPS.paintImageXObjectRepeat,
      OPS.paintInlineImageXObject,
      OPS.paintInlineImageXObjectGroup,
    ].filter(Boolean);
    
    console.log('[ImageExtract] Looking for image operators:', imageOps);
    console.log('[ImageExtract] Total operators:', operatorList.fnArray.length);
    
    const opCounts: { [key: number]: number } = {};
    operatorList.fnArray.forEach((op: number) => {
      opCounts[op] = (opCounts[op] || 0) + 1;
    });
    
    const imageOpFound = imageOps.filter(op => opCounts[op] > 0);
    console.log('[ImageExtract] Image operators found in PDF:', imageOpFound.length > 0 ? imageOpFound : 'none');
    
    for (let i = 0; i < operatorList.fnArray.length; i++) {
      const fn = operatorList.fnArray[i];
      const args = operatorList.argsArray[i];
      
      if (fn === OPS.save) {
        transformStack.push([...currentTransform]);
      } else if (fn === OPS.restore) {
        if (transformStack.length > 0) {
          currentTransform = transformStack.pop()!;
        }
      } else if (fn === OPS.transform) {
        if (args && args.length >= 6) {
          currentTransform = multiplyTransforms(currentTransform, args);
        }
      } else if (imageOps.includes(fn)) {
        console.log(`[ImageExtract] Found image at operator ${i}, transform:`, currentTransform);
        
        const imgWidth = Math.abs(currentTransform[0]) || 100;
        const imgHeight = Math.abs(currentTransform[3]) || 100;
        const imgX = currentTransform[4];
        const imgY = viewport.height - currentTransform[5] - imgHeight;
        
        if (imgWidth > 5 && imgHeight > 5) {
          images.push({
            id: `img-${pageNum}-${imageIndex}`,
            page: pageNum,
            x: imgX * scale,
            y: imgY * scale,
            width: imgWidth * scale,
            height: imgHeight * scale,
            imageData: '',
          });
          
          console.log(`[ImageExtract] Added image: pos(${imgX.toFixed(1)}, ${imgY.toFixed(1)}) size(${imgWidth.toFixed(1)}x${imgHeight.toFixed(1)})`);
          imageIndex++;
        }
      }
    }
    
    console.log(`[ImageExtract] Total images extracted: ${images.length}`);
    
  } catch (err) {
    console.error('[ImageExtract] Error:', err);
  }
  
  return images;
}

export function getOPSInfo() {
  const pdfjs = (window as any).pdfjs || (window as any).pdfjsLib;
  if (!pdfjs || !pdfjs.OPS) {
    return null;
  }
  return pdfjs.OPS;
}
