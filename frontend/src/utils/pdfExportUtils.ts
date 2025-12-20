import * as pdfjsLib from "pdfjs-dist";

/* ----------------------------------------------
   Universal Pixel-Perfect PDF → HTML Converter
   - Works for ANY PDF
   - Zero backend / zero API
   - Renders page → PNG background
   - Extracts text with coordinates
   - Overlays selectable text
------------------------------------------------ */

if (typeof window !== "undefined") {
  // @ts-ignore
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    // @ts-ignore
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

export async function exportPdfAsHtml(data: ArrayBuffer, filename: string) {
  try {
    const pdfData = new Uint8Array(data);
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${filename.replace(".pdf", "")}</title>

<style>
  body {
    margin: 0;
    background: #e0e0e0;
    font-family: Arial, sans-serif;
  }
  .page {
    position: relative;
    margin: 20px auto;
    background: white;
    text-align: center;
    box-shadow: 0 0 8px rgba(0,0,0,0.3);
  }
  .bgLayer {
    width: 100%;
    display: block;
  }
  .textLayer {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
  }
  .textLayer span {
    position: absolute;
    white-space: pre;
    color: black !important;
    transform-origin: 0 0;
    font-family: sans-serif;
  }
</style>

</head>
<body>
`;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      // Render to canvas
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({
        canvasContext: canvas.getContext("2d") as CanvasRenderingContext2D,
        viewport
      }).promise;

      const imgUrl = canvas.toDataURL("image/png");

      // Extract searchable text
      const textContent = await page.getTextContent();
      let layer = "";

      (textContent.items as any[]).forEach((item) => {
        const t = item.transform;
        const x = t[4];
        const y = viewport.height - t[5];
        const size = Math.sqrt(t[0] * t[3]);

        layer += `<span style="font-size:${size}px; transform:translate(${x}px,${y}px);">${item.str}</span>`;
      });

      html += `
<div class="page" style="width:${viewport.width}px; height:${viewport.height}px;">
  <img src="${imgUrl}" class="bgLayer" />
  <div class="textLayer" style="width:${viewport.width}px; height:${viewport.height}px;">
    ${layer}
  </div>
</div>
`;
    }

    html += `
</body>
</html>
`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    console.error("HTML Export Error:", err);
    throw err;
  }
}
