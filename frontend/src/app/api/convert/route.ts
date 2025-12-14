import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';

export async function POST(request: NextRequest) {
  const tempDir = path.join(os.tmpdir(), 'pdf-convert');
  let inputPath = '';
  let outputPath = '';

  try {
    await mkdir(tempDir, { recursive: true });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const format = formData.get('format') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!['word', 'excel', 'ppt', 'html', 'text'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const baseName = file.name.replace('.pdf', '');
    inputPath = path.join(tempDir, `input_${timestamp}.pdf`);
    
    const extensions: Record<string, string> = {
      word: '.docx',
      excel: '.xlsx',
      ppt: '.pptx',
      html: '.html',
      text: '.txt',
    };
    outputPath = path.join(tempDir, `${baseName}_converted${extensions[format]}`);

    await writeFile(inputPath, buffer);

    const pythonScript = path.join(process.cwd(), '..', 'backend', 'python', 'py_word_excel_html_ppt.py');
    const textScript = path.join(process.cwd(), '..', 'backend', 'python', 'pdf_to_text.py');
    
    const scriptToRun = format === 'text' ? textScript : pythonScript;
    const pythonArgs = format === 'text' 
      ? [scriptToRun, inputPath, outputPath]
      : [scriptToRun, format, inputPath, outputPath];

    console.log(`[API Convert] Starting ${format} conversion`);
    console.log(`[API Convert] Script: ${scriptToRun}`);
    console.log(`[API Convert] Input: ${inputPath}`);
    console.log(`[API Convert] Output: ${outputPath}`);

    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const pythonProcess = spawn('python3', pythonArgs);
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
      return NextResponse.json({ error: 'Conversion failed', details: result.error }, { status: 500 });
    }

    const outputBuffer = await readFile(outputPath);
    
    const contentTypes: Record<string, string> = {
      word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      html: 'text/html',
      text: 'text/plain',
    };

    const response = new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${baseName}${extensions[format]}"`,
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
    console.error('[API Convert] Error:', error);
    return NextResponse.json({ error: 'Server error', details: String(error) }, { status: 500 });
  }
}
