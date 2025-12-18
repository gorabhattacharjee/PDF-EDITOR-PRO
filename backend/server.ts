import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to Python scripts - in Docker, compiled JS is in /app/dist/
// In local dev: __dirname is /backend/dist, so go up 2 levels to project root
const pythonDir = process.env.PYTHON_DIR || path.resolve(__dirname, "..", "..", "backend", "python");

// Use /app/uploads in production (Docker), otherwise use local path
// In local dev: go up 2 levels from /backend/dist to project root, then into uploads
const uploadsBaseDir = process.env.UPLOADS_DIR || (process.env.NODE_ENV === 'production' ? "/app/uploads" : path.resolve(__dirname, "..", "..", "uploads"));

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
    const dir = path.join(uploadsBaseDir, "temp");
    await fs.mkdir(dir, { recursive: true });
    cb(null, dir);
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

    // IMPORTANT: req.file.path is the actual uploaded file path (includes temp/ subdirectory)
    const inputPath = req.file.path;  // e.g., c:\pdf-editor-pro\uploads\temp\filename.pdf
    const uploadDir = uploadsBaseDir;
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;
    
    console.log(`[File upload] Original filename: ${req.file.originalname}`);
    console.log(`[File upload] Actual saved path: ${inputPath}`);
    console.log(`[File upload] Base name: ${baseName}`);
    
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
    const pythonCmd = process.platform === 'win32' ? 'C:\\Python314\\python.exe' : 'python3';
    
    console.log(`[Conversion] Starting ${format} conversion`);
    console.log(`[Conversion] Python command: ${pythonCmd}`);
    console.log(`[Conversion] Script: ${scriptToRun}`);
    console.log(`[Conversion] Input: ${inputPath}`);
    console.log(`[Conversion] Output: ${outputPath}`);
    
    // Create environment with Python paths
    const pythonEnv = {
      ...process.env,
      PYTHONPATH: 'C:\\Users\\GoraBhattacharjee\\AppData\\Roaming\\Python\\Python314\\site-packages;' + (process.env.PYTHONPATH || ''),
    };
    
    const python = spawn(pythonCmd, pythonArgs, {
      env: pythonEnv,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stderr = "";
    let stdout = "";
    let timedOut = false;
    
    // Set a 120 second timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      console.error(`[Conversion timeout] ${format} conversion exceeded 120 seconds`);
      python.kill();
      if (!res.headersSent) {
        res.status(500).json({ error: "Conversion timeout", details: `${format} conversion took too long (>120s)` });
      }
    }, 120000);
    
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

          setTimeout(async () => {
            try {
              await fs.unlink(inputPath);
              await fs.unlink(outputPath);
            } catch {}
          }, 5000);
        } catch (readErr) {
          console.error(`[File read error] Could not read output file: ${outputPath}`);
          console.error(`[File read error] ${String(readErr)}`);
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
