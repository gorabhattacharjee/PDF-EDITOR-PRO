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

    const baseName = req.file.originalname.endsWith('.pdf') 
      ? req.file.originalname.slice(0, -4)
      : path.parse(req.file.originalname).name;
    
    console.log(`[File upload] Original filename: ${req.file.originalname}`);
    console.log(`[File upload] Actual saved path: ${inputPath}`);
    console.log(`[File upload] Upload directory: ${uploadDir}`);
    console.log(`[File upload] Base name: ${baseName}`);
    console.log(`[File upload] Node ENV: ${process.env.NODE_ENV}`);
    console.log(`[File upload] Temp dir: ${os.tmpdir()}`);
    
    // Verify the file actually exists
    try {
      await fs.stat(inputPath);
      console.log(`[File upload] ✓ File exists and is readable`);
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

    const outputPath = path.join(uploadDir, `${baseName}_converted${extensions[format]}`);

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
    
    // Don't set timeout for Word conversions - they can take as long as needed
    let timeout: NodeJS.Timeout | undefined = undefined;
    if (format !== 'word') {
      timeout = setTimeout(() => {
        timedOut = true;
        console.error(`[Conversion timeout] ${format} conversion exceeded 120 seconds`);
        python.kill();
        if (!res.headersSent) {
          res.status(500).json({ error: "Conversion timeout", details: `${format} conversion took too long (>120s)` });
        }
      }, 120000);
    } else {
      console.log(`[Conversion] Word conversion started - no timeout limit`);
    }
    
    python.stderr?.on("data", (d) => {
      stderr += d.toString();
      console.error(`[Python stderr] ${d.toString()}`);
    });
    python.stdout?.on("data", (d) => {
      stdout += d.toString();
      console.log(`[Python stdout] ${d.toString()}`);
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
        console.log(`[Conversion debug] Looking for file: ${outputPath}`);
        
        if (code !== 0) {
          const errorMsg = stderr || stdout || "Unknown error";
          console.error(`[Conversion failed] ${errorMsg}`);
          return res.status(500).json({ error: "Conversion failed", details: errorMsg });
        }

        // Check if output file was created
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
          
          // Try to list files in upload directory to debug
          try {
            const filesInDir = await fs.readdir(uploadDir);
            console.error(`[Debug] Files in ${uploadDir}: ${filesInDir.join(', ')}`);
            console.error(`[Debug] Expected filename: ${path.basename(outputPath)}`);
            console.error(`[Debug] Upload dir exists: ${await fs.stat(uploadDir).then(() => 'yes').catch(() => 'no')}`);
            const similarFiles = filesInDir.filter(f => f.includes(baseName));
            if (similarFiles.length > 0) console.error(`[Debug] Similar files found: ${similarFiles.join(', ')}`);
          } catch (e) {
            console.error(`[Debug] Could not list directory: ${String(e)}`);
          }
          
          return res.status(500).json({ error: "Conversion completed but output file not found", details: `Expected file: ${outputPath}` });
        }
      } catch (err) {
        if (!res.headersSent) res.status(500).json({ error: "Internal server error", details: String(err) });
      }
    });
  } catch (err) {
    return res.status(500).json({ error: "Server error during conversion", details: String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});
