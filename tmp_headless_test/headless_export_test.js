const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  try {
    const pdfPath = path.resolve(__dirname, '../backend/uploads/041122-Account Opening Form.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.error('Sample PDF not found:', pdfPath);
      process.exit(2);
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const b64 = pdfBuffer.toString('base64');

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});

    // Perform a fetch in the page context using the base64 PDF
    const result = await page.evaluate(async (b64data) => {
      function b64ToUint8Array(b64) {
        const binary = atob(b64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
        return bytes;
      }

      try {
        const arr = b64ToUint8Array(b64data);
        const file = new File([arr], '041122-Account Opening Form.pdf', { type: 'application/pdf' });
        const fd = new FormData();
        fd.append('file', file);
        const resp = await fetch('http://localhost:5000/api/convert/pdf-to-word', { method: 'POST', body: fd });
        if (!resp.ok) {
          return { ok: false, status: resp.status, text: await resp.text() };
        }
        const blob = await resp.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const u8 = new Uint8Array(arrayBuffer);
        // Convert to base64 to return (may be large)
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < u8.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, u8.subarray(i, i + chunkSize));
        }
        const b64out = btoa(binary);
        return { ok: true, b64: b64out.slice(0, 200) + '... (truncated)', length: u8.length };
      } catch (err) {
        return { ok: false, error: String(err) };
      }
    }, b64);

    console.log('Headless result:', result);
    await browser.close();
    process.exit(result && result.ok ? 0 : 3);
  } catch (err) {
    console.error('Script error:', err);
    process.exit(1);
  }
})();
