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
    const dir = path.join(__dirname, "uploads", "temp");
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

    const inputPath = req.file.path;
    const uploadDir = path.join(__dirname, "uploads");
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

    const pythonConvertScript = path.join(__dirname, "python", "py_word_excel_html_ppt.py");
    const pythonTextScript = path.join(__dirname, "python", "pdf_to_text.py");

    const scriptToRun = format === "text" ? pythonTextScript : pythonConvertScript;

    const pythonArgs =
      format === "text"
        ? [scriptToRun, inputPath, outputPath]
        : [scriptToRun, format, inputPath, outputPath];

    // Use full Python path for Windows compatibility
    const pythonPath = process.platform === "win32" ? "C:\\Python314\\python.exe" : "python";
    const python = spawn(pythonPath, pythonArgs);

    let stderr = "";
    python.stderr?.on("data", (d) => (stderr += d.toString()));

    python.on("error", (err) => {
      if (!res.headersSent) res.status(500).json({ error: "Failed to start conversion", details: err.message });
    });

    python.on("close", async (code) => {
      try {
        if (code !== 0) return res.status(500).json({ error: "Conversion failed", details: stderr });

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
