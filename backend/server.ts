import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'temp');
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  res.status(200).send({
    message: 'File uploaded successfully',
    filename: req.file.originalname,
  });
});

// PDF Conversion API - Main endpoint (used by frontend)
app.post('/api/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const format = req.body.format as string;
    if (!['word', 'excel', 'ppt', 'html', 'text'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be word, excel, ppt, html, or text' });
    }

    const inputPath = req.file.path;
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;
    const extensions: { [key: string]: string } = {
      word: '.docx',
      excel: '.xlsx',
      ppt: '.pptx',
      html: '.html',
      text: '.txt',
    };

    const outputPath = path.join(uploadDir, `${baseName}_converted${extensions[format]}`);

    // Call Python conversion script
    const pythonPath = path.join(__dirname, 'python', 'py_word_excel_html_ppt.py');
    const textPythonPath = path.join(__dirname, 'python', 'pdf_to_text.py');
    
    // Use dedicated text extraction script for text format
    const scriptToRun = format === 'text' ? textPythonPath : pythonPath;
    
    console.log(`[Conversion] Starting ${format} conversion...`);
    console.log(`[Conversion] Input: ${inputPath}`);
    console.log(`[Conversion] Output: ${outputPath}`);
    console.log(`[Conversion] Python script: ${scriptToRun}`);

    const pythonArgs = format === 'text' 
      ? [scriptToRun, inputPath, outputPath]
      : [scriptToRun, format, inputPath, outputPath];

    const pythonProcess = spawn('python', pythonArgs);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Python stdout] ${data}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.log(`[Python stderr] ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error(`[Conversion] Python process exited with code ${code}`);
          console.error(`[Conversion] stderr: ${stderr}`);
          return res.status(500).json({ error: 'Conversion failed', details: stderr });
        }

        // Read and send the converted file
        const fileData = await fs.readFile(outputPath);
        
        console.log(`[Conversion] File read successfully, size: ${fileData.length} bytes`);
        
        // Set appropriate content type
        const contentTypes: { [key: string]: string } = {
          word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          html: 'text/html',
          text: 'text/plain',
        };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_converted${extensions[format]}"`);
        res.send(fileData);

        console.log(`[Conversion] Response sent successfully`);

        // Clean up temporary files (increased delay to 10 seconds to ensure download completes)
        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
            console.log(`[Conversion] Cleanup completed for ${baseName}`);
          } catch (cleanupErr) {
            console.warn(`[Conversion] Cleanup warning: ${cleanupErr}`);
          }
        }, 10000);

      } catch (err) {
        console.error(`[Conversion] Error in completion handler:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: String(err) });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Conversion] Failed to start Python process:`, err);
      res.status(500).json({
        error: 'Failed to start conversion process',
        details: err.message,
      });
    });

  } catch (err) {
    console.error('[Conversion] Server error:', err);
    res.status(500).json({
      error: 'Server error during conversion',
      details: String(err),
    });
  }
});

// PDF Conversion API - Legacy endpoint (backward compatibility)
app.post('/api/convert/pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const format = req.body.format as string;
    if (!['word', 'excel', 'ppt', 'html', 'text'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format. Must be word, excel, ppt, html, or text' });
    }

    const inputPath = req.file.path;
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;
    const extensions: { [key: string]: string } = {
      word: '.docx',
      excel: '.xlsx',
      ppt: '.pptx',
      html: '.html',
      text: '.txt',
    };

    const outputPath = path.join(uploadDir, `${baseName}_converted${extensions[format]}`);

    // Call Python conversion script
    const pythonPath = path.join(__dirname, 'python', 'py_word_excel_html_ppt.py');
    const textPythonPath = path.join(__dirname, 'python', 'pdf_to_text.py');
    
    // Use dedicated text extraction script for text format
    const scriptToRun = format === 'text' ? textPythonPath : pythonPath;
    
    console.log(`[Conversion] Starting ${format} conversion...`);
    console.log(`[Conversion] Input: ${inputPath}`);
    console.log(`[Conversion] Output: ${outputPath}`);
    console.log(`[Conversion] Python script: ${scriptToRun}`);

    const pythonArgs = format === 'text' 
      ? [scriptToRun, inputPath, outputPath]
      : [scriptToRun, format, inputPath, outputPath];

    const pythonProcess = spawn('python', pythonArgs);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Python stdout] ${data}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Python stderr] ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error(`[Conversion] Python process exited with code ${code}`);
          return res.status(500).json({
            error: `Conversion failed with code ${code}`,
            details: stderr,
          });
        }

        // Check if output file exists
        try {
          await fs.access(outputPath);
        } catch (err) {
          console.error(`[Conversion] Output file not found at ${outputPath}`);
          return res.status(500).json({
            error: 'Conversion completed but output file not found',
            details: stderr,
          });
        }

        // Read and send the converted file
        const fileData = await fs.readFile(outputPath);
        
        console.log(`[Conversion] File read successfully, size: ${fileData.length} bytes`);
        
        // Set appropriate content type
        const contentTypes: { [key: string]: string } = {
          word: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          html: 'text/html',
          text: 'text/plain',
        };

        res.setHeader('Content-Type', contentTypes[format]);
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_converted${extensions[format]}"`);
        res.send(fileData);

        console.log(`[Conversion] Response sent successfully`);

        // Clean up temporary files (increased delay to 10 seconds to ensure download completes)
        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
            console.log(`[Conversion] Cleanup completed for ${baseName}`);
          } catch (cleanupErr) {
            console.warn(`[Conversion] Cleanup warning: ${cleanupErr}`);
          }
        }, 10000);

      } catch (err) {
        console.error(`[Conversion] Error in completion handler:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: String(err) });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Conversion] Failed to start Python process:`, err);
      res.status(500).json({
        error: 'Failed to start conversion process',
        details: err.message,
      });
    });

  } catch (err) {
    console.error('[Conversion] Server error:', err);
    res.status(500).json({
      error: 'Server error during conversion',
      details: String(err),
    });
  }
});

// PDF Encryption API
app.post('/api/encrypt-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const userPassword = req.body.userPassword || '';
    const ownerPassword = req.body.ownerPassword;

    if (!ownerPassword) {
      return res.status(400).json({ error: 'Owner password is required' });
    }

    const inputPath = req.file.path;
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${baseName}_encrypted.pdf`);

    // Call Python encryption script
    const pythonPath = path.join(__dirname, 'python', 'encrypt_pdf.py');
    
    console.log(`[Encryption] Starting PDF encryption...`);
    console.log(`[Encryption] Input: ${inputPath}`);
    console.log(`[Encryption] Output: ${outputPath}`);

    const pythonProcess = spawn('python', [
      pythonPath,
      inputPath,
      outputPath,
      userPassword,
      ownerPassword
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Python stdout] ${data}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Python stderr] ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error(`[Encryption] Python process exited with code ${code}`);
          return res.status(500).json({
            error: `Encryption failed with code ${code}`,
            details: stderr,
          });
        }

        // Check if output file exists
        try {
          await fs.access(outputPath);
        } catch (err) {
          console.error(`[Encryption] Output file not found at ${outputPath}`);
          return res.status(500).json({
            error: 'Encryption completed but output file not found',
            details: stderr,
          });
        }

        // Read and send the encrypted file
        const fileData = await fs.readFile(outputPath);
        
        console.log(`[Encryption] File read successfully, size: ${fileData.length} bytes`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_encrypted.pdf"`);
        res.send(fileData);

        console.log(`[Encryption] Response sent successfully`);

        // Clean up temporary files
        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
            console.log(`[Encryption] Cleanup completed for ${baseName}`);
          } catch (cleanupErr) {
            console.warn(`[Encryption] Cleanup warning: ${cleanupErr}`);
          }
        }, 10000);

      } catch (err) {
        console.error(`[Encryption] Error in completion handler:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: String(err) });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Encryption] Failed to start Python process:`, err);
      res.status(500).json({
        error: 'Failed to start encryption process',
        details: err.message,
      });
    });

  } catch (err) {
    console.error('[Encryption] Server error:', err);
    res.status(500).json({
      error: 'Server error during encryption',
      details: String(err),
    });
  }
});

// PDF Decryption API - Remove password protection
app.post('/api/decrypt-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const password = req.body.password;

    if (!password) {
      return res.status(400).json({ error: 'Password is required for decryption' });
    }

    const inputPath = req.file.path;
    const uploadDir = path.join(__dirname, 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;
    const outputPath = path.join(uploadDir, `${baseName}_decrypted.pdf`);

    // Call Python decryption script
    const pythonPath = path.join(__dirname, 'python', 'decrypt_pdf.py');
    
    console.log(`[Decryption] Starting PDF decryption...`);
    console.log(`[Decryption] Input: ${inputPath}`);
    console.log(`[Decryption] Output: ${outputPath}`);

    const pythonProcess = spawn('python', [
      pythonPath,
      inputPath,
      outputPath,
      password
    ]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString();
      console.log(`[Python stdout] ${data}`);
    });

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString();
      console.error(`[Python stderr] ${data}`);
    });

    pythonProcess.on('close', async (code) => {
      try {
        if (code !== 0) {
          console.error(`[Decryption] Python process exited with code ${code}`);
          return res.status(500).json({
            error: `Decryption failed - password may be incorrect or PDF may be corrupted`,
            details: stderr,
          });
        }

        // Check if output file exists
        try {
          await fs.access(outputPath);
        } catch (err) {
          console.error(`[Decryption] Output file not found at ${outputPath}`);
          return res.status(500).json({
            error: 'Decryption completed but output file not found',
            details: stderr,
          });
        }

        // Read and send the decrypted file
        const fileData = await fs.readFile(outputPath);
        
        console.log(`[Decryption] File read successfully, size: ${fileData.length} bytes`);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${baseName}_decrypted.pdf"`);
        res.send(fileData);

        console.log(`[Decryption] Response sent successfully`);

        // Clean up temporary files
        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
            console.log(`[Decryption] Cleanup completed for ${baseName}`);
          } catch (cleanupErr) {
            console.warn(`[Decryption] Cleanup warning: ${cleanupErr}`);
          }
        }, 10000);

      } catch (err) {
        console.error(`[Decryption] Error in completion handler:`, err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error', details: String(err) });
        }
      }
    });

    pythonProcess.on('error', (err) => {
      console.error(`[Decryption] Failed to start Python process:`, err);
      res.status(500).json({
        error: 'Failed to start decryption process',
        details: err.message,
      });
    });

  } catch (err) {
    console.error('[Decryption] Server error:', err);
    res.status(500).json({
      error: 'Server error during decryption',
      details: String(err),
    });
  }
});

app.get('/', (req, res) => {
  res.send('Backend server is running');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
  const pythonDir = path.join(__dirname, 'python');
  console.log(`Python conversion scripts location: ${pythonDir}`);
});