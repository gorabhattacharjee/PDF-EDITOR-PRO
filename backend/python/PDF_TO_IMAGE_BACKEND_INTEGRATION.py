#!/usr/bin/env python3
"""
Example: Integrating PDF to Image conversion with Node.js/Express backend

This file shows how to call pdf_to_images.py from a Node.js/TypeScript backend
to convert PDFs to various image formats via API.

Usage in Node.js/TypeScript:
import { spawn } from 'child_process';
import path from 'path';

app.post('/api/pdf-to-image', async (req, res) => {
  const python = spawn('python', [
    path.join(__dirname, '../python/pdf_to_images.py'),
    req.file.path,      // Input PDF
    req.body.format,    // Format: png, jpg, psd, etc
    tempDir,            // Output directory
    req.body.page || '', // Page number (optional, empty = all pages)
    req.body.quality || '95', // Quality 1-100
    req.body.dpi || '300'     // DPI
  ]);

  let stdout = '';
  let stderr = '';

  python.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  python.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  python.on('close', (code) => {
    if (code === 0) {
      // Conversion successful - find output file and send
      const outputFile = path.join(tempDir, `${req.file.filename.replace('.pdf', '')}_page${req.body.page || 1}.${req.body.format}`);
      res.download(outputFile);
    } else {
      res.status(500).json({ error: 'Conversion failed', details: stderr });
    }
  });
});

================================================================================
FULL EXAMPLE: PDF to Image API Endpoint (TypeScript)
================================================================================
"""

# This is a Python file that documents the integration.
# The actual integration happens in Node.js/TypeScript backend.

EXAMPLE_NODE_CODE = """
// File: backend/server.ts (or backend/routes/image-convert.ts)

import express, { Request, Response } from 'express';
import { spawn } from 'child_process';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

const router = express.Router();
const upload = multer({ dest: os.tmpdir() });

/**
 * Convert PDF page to image format
 * 
 * POST /api/pdf-to-image
 * 
 * Form Data:
 *   - file: PDF file (required)
 *   - format: Image format - png, jpg, webp, gif, bmp, tiff, svg, psd, ai, eps, etc (required)
 *   - page: Page number (optional, default: 1)
 *   - quality: Quality 1-100 (optional, default: 95, only for jpg/webp/avif/heif)
 *   - dpi: DPI resolution (optional, default: 300)
 * 
 * Response:
 *   - Binary image file
 *   - Or JSON error with details
 */
router.post('/api/pdf-to-image', upload.single('file'), async (req: Request, res: Response) => {
  const inputPdf = req.file?.path;
  const format = req.body.format?.toLowerCase();
  const pageNum = req.body.page || '1';
  const quality = req.body.quality || '95';
  const dpi = req.body.dpi || '300';
  
  if (!inputPdf || !format) {
    return res.status(400).json({ error: 'Missing file or format' });
  }

  const tempDir = path.join(os.tmpdir(), 'pdf-to-image');
  await fs.mkdir(tempDir, { recursive: true });

  const python = spawn('python', [
    path.join(__dirname, '../python/pdf_to_images.py'),
    inputPdf,
    format,
    tempDir,
    pageNum,
    quality,
    dpi
  ]);

  let stdout = '';
  let stderr = '';

  python.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  python.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  python.on('close', async (code: number) => {
    try {
      if (code === 0) {
        // Find the output file
        const baseName = path.basename(inputPdf, '.pdf');
        const outputFileName = `${baseName}_page${pageNum}.${format}`;
        const outputPath = path.join(tempDir, outputFileName);

        // Check if file exists
        try {
          await fs.stat(outputPath);
        } catch {
          // File not found - try alternate naming
          const files = await fs.readdir(tempDir);
          const matchingFile = files.find(f => f.includes('_page') && f.endsWith(`.${format}`));
          if (!matchingFile) {
            throw new Error('Output file not created');
          }
          return res.download(path.join(tempDir, matchingFile));
        }

        // Send the image file
        const stat = await fs.stat(outputPath);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `attachment; filename="${outputFileName}"`);
        res.download(outputPath);

        // Cleanup after sending
        setTimeout(async () => {
          try {
            await fs.unlink(outputPath);
            await fs.unlink(inputPdf);
          } catch (e) {
            console.error('Cleanup error:', e);
          }
        }, 5000);
      } else {
        res.status(500).json({
          error: 'PDF to image conversion failed',
          details: stderr || stdout,
          format: format,
          page: pageNum
        });
      }
    } catch (err) {
      res.status(500).json({
        error: 'Conversion error',
        details: String(err),
        stdout: stdout,
        stderr: stderr
      });
    }
  });
});

/**
 * List all supported formats
 * 
 * GET /api/image-formats
 */
router.get('/api/image-formats', (req: Request, res: Response) => {
  res.json({
    native: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg'],
    modern: ['avif', 'heif', 'heic'],
    professional: ['psd', 'xcf', 'ai', 'eps', 'wmf', 'emf', 'raw', 'dng', 'ico', 'icns'],
    all: [
      'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff', 'svg',
      'avif', 'heif', 'heic',
      'psd', 'xcf', 'ai', 'eps', 'wmf', 'emf', 'raw', 'dng', 'ico', 'icns'
    ]
  });
});

export default router;
"""

EXAMPLE_FRONTEND_CODE = """
// File: frontend/src/hooks/usePdfToImage.ts

import { useState } from 'react';
import toast from 'react-hot-toast';

interface ConversionOptions {
  format: string;
  page?: number;
  quality?: number;
  dpi?: number;
}

export function usePdfToImage() {
  const [converting, setConverting] = useState(false);

  const convert = async (
    file: File,
    options: ConversionOptions
  ): Promise<Blob | null> => {
    setConverting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('format', options.format);
      if (options.page) formData.append('page', options.page.toString());
      if (options.quality) formData.append('quality', options.quality.toString());
      if (options.dpi) formData.append('dpi', options.dpi.toString());

      const response = await fetch('/api/pdf-to-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Conversion failed');
      }

      const blob = await response.blob();
      
      // Auto-download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `converted.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Converted to ${options.format.toUpperCase()}`);
      return blob;
    } catch (error) {
      toast.error(`Conversion failed: ${error}`);
      return null;
    } finally {
      setConverting(false);
    }
  };

  return { convert, converting };
}

// Usage in component:
const { convert, converting } = usePdfToImage();
await convert(pdfFile, { format: 'png', page: 1, dpi: 300 });
"""

EXAMPLE_CURL_USAGE = """
# Command line examples using curl

# Convert page 1 to PNG
curl -F "file=@document.pdf" \\
     -F "format=png" \\
     -F "page=1" \\
     http://localhost:5000/api/pdf-to-image \\
     -o converted.png

# Convert to high-quality JPG (quality 95)
curl -F "file=@document.pdf" \\
     -F "format=jpg" \\
     -F "quality=95" \\
     http://localhost:5000/api/pdf-to-image \\
     -o converted.jpg

# Convert to PSD (professional format)
curl -F "file=@document.pdf" \\
     -F "format=psd" \\
     -F "dpi=300" \\
     http://localhost:5000/api/pdf-to-image \\
     -o converted.psd

# Convert all pages to WebP at 200 DPI
curl -F "file=@document.pdf" \\
     -F "format=webp" \\
     -F "dpi=200" \\
     http://localhost:5000/api/pdf-to-image \\
     -o converted.webp
"""

if __name__ == '__main__':
    print(__doc__)
    print("\n" + "="*80)
    print("EXAMPLE: Node.js/TypeScript Backend Integration")
    print("="*80)
    print(EXAMPLE_NODE_CODE)
    print("\n" + "="*80)
    print("EXAMPLE: React Frontend Hook")
    print("="*80)
    print(EXAMPLE_FRONTEND_CODE)
    print("\n" + "="*80)
    print("EXAMPLE: cURL Command Usage")
    print("="*80)
    print(EXAMPLE_CURL_USAGE)
