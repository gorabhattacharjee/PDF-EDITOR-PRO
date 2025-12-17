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

// ✅ Render uses process.env.PORT
const PORT = Number(process.env.PORT || 5000);
app.listen(PORT, "0.0.0.0", () => { ... });

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
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  res.status(200).json({
    message: "File uploaded successfully",
    filename: req.file.originalname,
  });
});

// Main conversion endpoint
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

    // ✅ DO NOT let this filename get cut — must be full and correct
    const pythonConvertScript = path.join(__dirname, "python", "py_word_excel_html_ppt.py");
    const pythonTextScript = path.join(__dirname, "python", "pdf_to_text.py");

    const scriptToRun = format === "text" ? pythonTextScript : pythonConvertScript;

    const pythonArgs =
      format === "text"
        ? [scriptToRun, inputPath, outputPath]
        : [scriptToRun, format, inputPath, outputPath];

    const pythonProcess = spawn("python", pythonArgs);

    let stderr = "";

    pythonProcess.stderr?.on("data", (data) => {
      stderr += data.toString();
      console.error(`[Python stderr] ${data}`);
    });

    pythonProcess.on("error", (err) => {
      console.error("[Conversion] Failed to start Python:", err);
      if (!res.headersSent) res.status(500).json({ error: "Failed to start conversion", details: err.message });
    });

    pythonProcess.on("close", async (code) => {
      try {
        if (code !== 0) {
          return res.status(500).json({ error: "Conversion failed", details: stderr });
        }

        const fileData = await fs.readFile(outputPath);

        // content types
        const contentTypes: Record<string, string> = {
          word: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          ppt: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          html: "text/html",
          text: "text/plain",
        };

        res.setHeader("Content-Type", contentTypes[format]);
        res.setHeader("Content-Disposition", `attachment; filename="${path.basename(outputPath)}"`);
        res.send(fileData);

        // cleanup later
        setTimeout(async () => {
          try {
            await fs.unlink(inputPath);
            await fs.unlink(outputPath);
          } catch {}
        }, 5000);
      } catch (err) {
        console.error("[Conversion] Completion handler error:", err);
        if (!res.headersSent) res.status(500).json({ error: "Internal server error", details: String(err) });
      }
    });
  } catch (err) {
    console.error("[Conversion] Server error:", err);
    res.status(500).json({ error: "Server error during conversion", details: String(err) });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`📁 Python scripts dir: ${path.join(__dirname, "python")}`);
});
