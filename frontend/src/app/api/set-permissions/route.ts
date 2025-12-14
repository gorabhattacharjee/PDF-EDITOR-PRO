import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), 'pdf-permissions');
  let inputPath = '';
  let outputPath = '';

  try {
    await mkdir(tempDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const ownerPassword = formData.get('ownerPassword') as string;
    const allowPrint = formData.get('allowPrint') === 'true';
    const allowCopy = formData.get('allowCopy') === 'true';
    const allowModify = formData.get('allowModify') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ownerPassword) {
      return NextResponse.json({ error: 'Owner password is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    inputPath = path.join(tempDir, `input_${timestamp}.pdf`);
    outputPath = path.join(tempDir, `protected_${timestamp}.pdf`);

    await writeFile(inputPath, buffer);

    const pythonScript = path.join(process.cwd(), '..', 'backend', 'python', 'set_permissions.py');

    console.log(`[API Permissions] Starting permission setting`);
    console.log(`[API Permissions] Script: ${pythonScript}`);

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const pythonProcess = spawn('python', [
        pythonScript,
        inputPath,
        outputPath,
        ownerPassword,
        allowPrint ? '1' : '0',
        allowCopy ? '1' : '0',
        allowModify ? '1' : '0',
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
          resolve({ success: true });
        }
      });

      pythonProcess.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Permission setting failed', details: result.error }, { status: 500 });
    }

    const outputBuffer = await readFile(outputPath);

    const response = new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="protected.pdf"`,
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
    console.error('[API Permissions] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}
