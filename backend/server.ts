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
const pythonDir = process.env.PYTHON_DIR || path.resolve(__dirname, "..", "python");

// Use /app/uploads in production (Docker), otherwise use local path
const uploadsBaseDir = process.env.UPLOADS_DIR || (process.env.NODE_ENV === 'production' ? "/app/uploads" : path.resolve(__dirname, "..", "uploads"));

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
    const allowed = ["excel", "ppt", "html", "text"];
    
    // Word conversion is not available due to pdf2docx dependency issues
    if (format === "word") {
      return res.status(501).json({ 
        error: "Word conversion not available", 
        details: "Word conversion requires pdf2docx which has compatibility issues on Alpine Linux. Please use Excel or PowerPoint conversion instead." 
      });
    }
    
    if (!allowed.includes(format)) {
      return res.status(400).json({ error: "Invalid format. Must be excel, ppt, html, or text" });
    }

    const inputPath = req.file.path;
    const uploadDir = uploadsBaseDir;
    await fs.mkdir(uploadDir, { recursive: true });

    const baseName = path.parse(req.file.originalname).name;

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

    const python = spawn("python3", pythonArgs, {
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stderr = "";
    let stdout = "";
    python.stderr?.on("data", (d) => {
      stderr += d.toString();
      console.error(`[Python stderr] ${d.toString()}`);
    });
    python.stdout?.on("data", (d) => {
      stdout += d.toString();
      console.log(`[Python stdout] ${d.toString()}`);
    });

    python.on("error", (err) => {
      console.error(`[Spawn error] ${err.message}`);
      if (!res.headersSent) res.status(500).json({ error: "Failed to start conversion", details: err.message });
    });

    python.on("close", async (code) => {
      try {
        console.log(`[Python exit code] ${code}`);
        if (code !== 0) {
          const errorMsg = stderr || stdout || "Unknown error";
          console.error(`[Conversion failed] ${errorMsg}`);
          return res.status(500).json({ error: "Conversion failed", details: errorMsg });
        }

        const fileData = await fs.readFile(outputPath);

        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outputPath)}"`);
        res.send(fileData);

        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
          } catch {}
        }, 5000);
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
