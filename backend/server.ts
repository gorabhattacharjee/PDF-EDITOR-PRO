import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python scripts
// In production Docker: Python scripts copied to /app/python/ by Dockerfile
// In local dev: __dirname is /backend/dist, resolve to /backend/python
const pythonDir = process.env.PYTHON_DIR || 
  (process.env.NODE_ENV === 'production'
    ? path.join("/app", "python")
    : path.resolve(__dirname, "..", "..", "backend", "python"));

// Use system temp directory for file operations (works on all platforms)
// This ensures files can be written and read reliably on Render and other containers
const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(os.tmpdir(), 'pdf-conversions');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    // Create uploads directory in temp location
    await fs.mkdir(uploadsBaseDir, { recursive: true });
    cb(null, uploadsBaseDir);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

app.get("/", (_req, res) => {
  res.send("Backend server is running");
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  return res.json({ message: "File uploaded successfully", filename: req.file.originalname });
});

app.post("/api/convert", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No PDF file uploaded" });

    const format = String(req.body.format || "").toLowerCase();
    const allowed = ["word", "excel", "ppt", "html", "text"];
    
    if (!allowed.includes(format)) {
      return res.status(400).json({ error: "Invalid format. Must be word, excel, ppt, html, or text" });
    }

    // IMPORTANT: req.file.path is the actual uploaded file path
    const inputPath = req.file.path;  // e.g., /tmp/pdf-conversions/filename.pdf
    const uploadDir = uploadsBaseDir;  // Output directory for converted files
    
    // Ensure output directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Sanitize filename - remove 'undefined' and clean up
    let cleanFilename = req.file.originalname.replace(/undefined/g, '').replace(/\.{2,}/g, '.');
    if (cleanFilename.startsWith('.')) cleanFilename = cleanFilename.substring(1);
    if (cleanFilename.endsWith('.')) cleanFilename = cleanFilename.substring(0, cleanFilename.length - 1);
    if (!cleanFilename || cleanFilename === 'pdf') cleanFilename = 'document.pdf';
    
    const baseName = cleanFilename.endsWith('.pdf') 
      ? cleanFilename.slice(0, -4)
      : path.parse(cleanFilename).name;
    
    console.log(`[File upload] Original filename: ${req.file.originalname}`);
    console.log(`[File upload] Actual saved path: ${inputPath}`);
    console.log(`[File upload] Upload directory: ${uploadDir}`);
    console.log(`[File upload] Base name: ${baseName}`);
    console.log(`[File upload] Node ENV: ${process.env.NODE_ENV}`);
    console.log(`[File upload] Temp dir: ${os.tmpdir()}`);
    
    // Verify the file actually exists
    try {
      const stats = await fs.stat(inputPath);
      console.log(`[File upload] ✓ File exists and is readable, size: ${stats.size} bytes`);
    } catch (err) {
      console.error(`[File upload] ✗ File not found or not readable: ${inputPath}`);
      return res.status(500).json({ error: "Uploaded file cannot be accessed", details: `File path: ${inputPath}` });
    }

    const extensions: Record<string, string> = {
      word: ".docx",
      excel: ".xlsx",
      ppt: ".pptx",
      html: ".html",
      text: ".txt",
    };

    // Use unique output filename with timestamp to avoid conflicts
    const timestamp = Date.now();
    const uniqueBaseName = `${baseName}_${timestamp}`;
    const outputPath = path.join(uploadDir, `${uniqueBaseName}_converted${extensions[format]}`);

    const pythonConvertScript = path.join(pythonDir, "py_word_excel_html_ppt.py");
    const pythonTextScript = path.join(pythonDir, "pdf_to_text.py");

    const scriptToRun = format === "text" ? pythonTextScript : pythonConvertScript;

    const pythonArgs =
      format === "text"
        ? [scriptToRun, inputPath, outputPath]
        : [scriptToRun, format, inputPath, outputPath];
    
    // Log Word conversion when requested
    if (format === "word") {
      console.log(`[Conversion] ENABLED: Word (.docx) conversion requested`);
    }

    // Use full path to Python on Windows to ensure correct environment
    // On Render (production), use 'python3'. On Windows dev, use full path
    const pythonCmd = process.platform === 'win32' ? 'C:\\Python314\\python.exe' : 'python3';
    
    console.log(`[Conversion] Starting ${format} conversion`);
    console.log(`[Conversion] Python command: ${pythonCmd}`);
    console.log(`[Conversion] Script: ${scriptToRun}`);
    console.log(`[Conversion] Input: ${inputPath}`);
    console.log(`[Conversion] Output: ${outputPath}`);
    
    // Create environment for Python subprocess
    // Ensure Python can access required libraries
    const pythonEnv = {
      ...process.env,
      // Ensure temp directory is accessible
      TMPDIR: os.tmpdir(),
      TEMP: os.tmpdir(),
    };
    
    const python = spawn(pythonCmd, pythonArgs, {
      env: pythonEnv,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stderr = "";
    let stdout = "";
    let timedOut = false;
    
    // No timeout limits - conversions can take as long as needed
    // This allows complex PDFs and large files to convert properly
    let timeout: NodeJS.Timeout | undefined = undefined;
    
    // Collect stderr for error messages (text only)
    python.stderr?.on("data", (d) => {
      stderr += d.toString();
      console.error(`[Python stderr] ${d.toString()}`);
    });
    
    // Collect stdout as buffer (could be binary file data)
    const stdoutBuffers: Buffer[] = [];
    python.stdout?.on("data", (d: Buffer) => {
      stdoutBuffers.push(d);
      // Don't log binary data - just log that we received it
      if (d.length < 200) {
        stdout += d.toString('utf8', 0, Math.min(100, d.length));
      }
    });

    python.on("error", (err) => {
      clearTimeout(timeout);
      console.error(`[Spawn error] ${err.message}`);
      if (!res.headersSent) res.status(500).json({ error: "Failed to start conversion", details: err.message });
    });

    python.on("close", async (code) => {
      clearTimeout(timeout);
      if (timedOut) return;
      
      try {
        console.log(`[Python exit code] ${code}`);
        console.log(`[Conversion] Received ${stdoutBuffers.length} chunks from Python stdout`);
        console.log(`[Conversion] Total stdout size: ${stdoutBuffers.reduce((sum, b) => sum + b.length, 0)} bytes`);
        
        if (code !== 0) {
          const errorMsg = stderr || stdout || "Unknown error";
          console.error(`[Conversion failed] Exit code ${code}: ${errorMsg}`);
          return res.status(500).json({ error: "Conversion failed", details: errorMsg });
        }
        
        // If Python succeeded and wrote to stdout, use stdout data directly
        if (stdoutBuffers.length > 0) {
          const combinedBuffer = Buffer.concat(stdoutBuffers);
          console.log(`[Conversion success] Sending ${combinedBuffer.length} bytes from stdout`);
          
          res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outputPath)}"`);
          res.setHeader("Content-Type", "application/octet-stream");
          res.setHeader("Content-Length", combinedBuffer.length);
          res.send(combinedBuffer);
          
          // Clean up input file
          setTimeout(async () => {
            try {
              await fs.unlink(inputPath);
              console.log(`[Cleanup] Deleted input file`);
            } catch (e) {
              console.error(`[Cleanup error] ${String(e)}`);
            }
          }, 5000);
          
          return;
        }
        
        // Fallback: try to read from file system (old method)
        console.log(`[Conversion debug] No stdout data, trying file system: ${outputPath}`);
        try {
          const fileData = await fs.readFile(outputPath);
          console.log(`[Conversion success] File size: ${fileData.length} bytes`);
          
          res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outputPath)}"`);
          res.send(fileData);

          // Clean up temp files after response sent
          setTimeout(async () => {
            try {
              await fs.unlink(inputPath);
              await fs.unlink(outputPath);
              console.log(`[Cleanup] Deleted temp files: input and output`);
            } catch (e) {
              console.error(`[Cleanup error] ${String(e)}`);
            }
          }, 5000);
        } catch (readErr) {
          console.error(`[File read error] Could not read output file: ${outputPath}`);
          console.error(`[File read error] ${String(readErr)}`);
          
          return res.status(500).json({ error: "Conversion completed but no output received", details: `Expected file: ${outputPath}` });
        }
      } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Internal server error", details: String(err) });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error during conversion", details: String(err) });
  }
});

/**
 * PDF to Image Conversion Endpoint
 * Converts PDF pages to various image formats
 * 
 * POST /api/pdf-to-image
 * FormData:
 *   - file: PDF file (required)
 *   - format: Image format - png, jpg, webp, gif, bmp, tiff, svg, psd, avif, heif, etc (required)
 *   - page: Page number (optional, default: 1)
 *   - quality: Quality 1-100 (optional, default: 95)
 *   - dpi: DPI resolution (optional, default: 300)
 */
app.post("/api/pdf-to-image", upload.single("file"), async (req, res) => {
  const inputPdf = req.file?.path;
  const format = (req.body.format || "").toLowerCase();
  const pageNum = req.body.page || "1";
  const quality = req.body.quality || "95";
  const dpi = req.body.dpi || "300";

  if (!inputPdf || !format) {
    return res.status(400).json({ error: "Missing file or format parameter" });
  }

  try {
    console.log(`[PDF to Image] Converting page ${pageNum} to ${format.toUpperCase()}`);
    console.log(`[PDF to Image] Input: ${inputPdf}`);
    console.log(`[PDF to Image] Format: ${format}, Quality: ${quality}, DPI: ${dpi}`);

    // Ensure output directory exists
    await fs.mkdir(uploadsBaseDir, { recursive: true });

    const python = spawn("python", [
      path.join(pythonDir, "pdf_to_images.py"),
      inputPdf,
      format,
      uploadsBaseDir,
      pageNum,
      quality,
      dpi,
    ]);

    let stdout = "";
    let stderr = "";

    python.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
      console.log(`[PDF to Image stdout] ${data.toString().trim()}`);
    });

    python.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
      console.error(`[PDF to Image stderr] ${data.toString().trim()}`);
    });

    python.on("close", async (code: number) => {
      try {
        if (code === 0) {
          // Find the output file
          const baseName = path.basename(inputPdf, path.extname(inputPdf));
          const outputFileName = `${baseName}_page${pageNum}.${format}`;
          const outputPath = path.join(uploadsBaseDir, outputFileName);

          console.log(`[PDF to Image] Looking for output: ${outputPath}`);

          try {
            const stat = await fs.stat(outputPath);
            console.log(`[PDF to Image] Output file found: ${stat.size} bytes`);

            // Set headers and send file
            res.setHeader("Content-Disposition", `attachment; filename="${outputFileName}"`);
            res.setHeader("Content-Type", "application/octet-stream");
            res.setHeader("Content-Length", stat.size);

            const fileData = await fs.readFile(outputPath);
            res.send(fileData);

            console.log(`[PDF to Image] Successfully sent ${outputFileName}`);

            // Cleanup after sending
            setTimeout(async () => {
              try {
                await fs.unlink(outputPath);
                await fs.unlink(inputPdf);
                console.log(`[PDF to Image cleanup] Deleted temporary files`);
              } catch (e) {
                console.error(`[PDF to Image cleanup error] ${String(e)}`);
              }
            }, 5000);
          } catch (statErr) {
            console.error(`[PDF to Image] Output file not found: ${outputPath}`);
            console.error(`[PDF to Image] Stat error: ${String(statErr)}`);
            console.error(`[PDF to Image] Python stdout: ${stdout}`);
            console.error(`[PDF to Image] Python stderr: ${stderr}`);

            // List directory contents for debugging
            try {
              const files = await fs.readdir(uploadsBaseDir);
              console.error(`[PDF to Image] Files in output dir: ${files.join(", ")}`);
            } catch (e) {
              console.error(`[PDF to Image] Could not list directory: ${String(e)}`);
            }

            if (!res.headersSent) {
              res.status(500).json({
                error: "Conversion completed but output file not found",
                details: `Expected: ${outputFileName}`,
                pythonStdout: stdout,
                pythonStderr: stderr,
              });
            }
          }
        } else {
          console.error(`[PDF to Image] Python exited with code ${code}`);
          console.error(`[PDF to Image] stderr: ${stderr}`);
          console.error(`[PDF to Image] stdout: ${stdout}`);

          if (!res.headersSent) {
            res.status(500).json({
              error: "Conversion failed",
              details: stderr || stdout,
              format: format,
              page: pageNum,
            });
          }
        }
      } catch (err) {
        console.error(`[PDF to Image] Error handling result: ${String(err)}`);
        if (!res.headersSent) {
          res.status(500).json({
            error: "Error processing conversion result",
            details: String(err),
          });
        }
      }
    });
  } catch (err) {
    console.error(`[PDF to Image] Server error: ${String(err)}`);
    return res.status(500).json({ error: "Server error", details: String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
