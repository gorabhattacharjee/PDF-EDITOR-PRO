let pdfjsLib: any = null;

// Lazy load pdfjs-dist only when needed
async function getPDFLibrary() {
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import("pdfjs-dist");
      // ✅ Ensure pdf.js worker is initialized
      if (typeof window !== "undefined") {
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
        }
      }
    } catch (error) {
      console.error("Failed to load pdfjs-dist:", error);
      throw error;
    }
  }
  return pdfjsLib;
}

/**
 * Utility to download a Blob as a file.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Utility to duplicate an ArrayBuffer safely.
 */
function copyBuffer(buf: ArrayBuffer): ArrayBuffer {
  const copy = new ArrayBuffer(buf.byteLength);
  new Uint8Array(copy).set(new Uint8Array(buf));
  return copy;
}

/**
 * ✅ Enhanced HTML export — renders each page as an image + selectable text overlay
 * preserving PDF layout and fidelity.
 */
export async function exportPdfAsHtml(data: ArrayBuffer, filename: string) {
  try {
    const pdfModule = await getPDFLibrary();
    const pdf = await pdfModule.getDocument({ data: copyBuffer(data) }).promise;
    let html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${filename.replace(/\.html$/i, "")}</title>
<style>
  body {
    margin: 0;
    padding: 20px;
    background: #ccc;
    font-family: sans-serif;
  }
  .page {
    position: relative;
    background: white;
    margin: 20px auto;
    box-shadow: 0 0 8px rgba(0,0,0,0.3);
  }
  .page img {
    width: 100%;
    display: block;
  }
  .textLayer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    color: black;
    white-space: pre;
  }
</style>
</head>
<body>
`;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgData = canvas.toDataURL("image/png");

      const textContent = await page.getTextContent();
      let textLayer = "";
      textContent.items.forEach((item: any) => {
        const [a, b, , , x, y] = item.transform;
        const fontSize = Math.abs(a || b);
        const escaped = item.str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        textLayer += `<div style="position:absolute; left:${x}px; bottom:${y}px; font-size:${fontSize}px;">${escaped}</div>`;
      });

      html += `
<div class="page" style="width:${viewport.width}px; height:${viewport.height}px;">
  <img src="${imgData}" alt="PDF page ${i}" />
  <div class="textLayer">${textLayer}</div>
</div>`;
    }

    html += `
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    downloadBlob(blob, filename);
  } catch (err) {
    console.error("HTML export failed:", err);
    alert("Failed to export HTML");
  }
}
