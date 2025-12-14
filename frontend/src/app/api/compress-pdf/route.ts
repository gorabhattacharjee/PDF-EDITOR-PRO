import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), 'pdf-compress');
  let inputPath = '';
  let outputPath = '';

  try {
    await mkdir(tempDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quality = formData.get('quality') as string || '75';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    inputPath = path.join(tempDir, `input_${timestamp}.pdf`);
    outputPath = path.join(tempDir, `compressed_${timestamp}.pdf`);

    await writeFile(inputPath, buffer);

    const pythonScript = path.join(process.cwd(), '..', 'backend', 'python', 'compress_pdf.py');

    console.log(`[API Compress] Starting compression with quality ${quality}`);

    const result = await new Promise<{ success: boolean; error?: string; stdout?: string }>((resolve) => {
      const pythonProcess = spawn('python', [
        pythonScript,
        inputPath,
        outputPath,
        quality,
      ]);
      let stderr = '';
      let stdout = '';

      pythonProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
        console.log(`[Python stdout] ${data}`);
      });

      pythonProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
        console.log(`[Python stderr] ${data}`);
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        } else {
          resolve({ success: true, stdout });
        }
      });

      pythonProcess.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Compression failed', details: result.error }, { status: 500 });
    }

    const outputBuffer = await readFile(outputPath);
    
    let originalSize = buffer.length;
    let compressedSize = outputBuffer.length;
    
    const resultMatch = result.stdout?.match(/RESULT:(\d+):(\d+)/);
    if (resultMatch) {
      originalSize = parseInt(resultMatch[1]);
      compressedSize = parseInt(resultMatch[2]);
    }

    const response = new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="compressed.pdf"`,
        'X-Original-Size': originalSize.toString(),
        'X-Compressed-Size': compressedSize.toString(),
      },
    });

    setTimeout(async () => {
      try {
        if (inputPath) await unlink(inputPath).catch(() => {});
        if (outputPath) await unlink(outputPath).catch(() => {});
      } catch (e) {}
    }, 5000);

    return response;
  } catch (error) {
    console.error('[API Compress] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}
