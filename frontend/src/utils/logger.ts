// src/utils/logger.ts

export type LogLevel = "INFO" | "SUCCESS" | "ERROR" | "WARN";

export interface LogEntry {
  time: string;
  level: LogLevel;
  message: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private isLogging = false;

  constructor() {
    this.captureConsoleLogs();
  }

  // Safe JSON stringification that handles circular references
  private safeStringify(obj: any): string {
    try {
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    } catch (err) {
      return '[Unable to stringify object]';
    }
  }

  // Intercept console methods to capture all logs
  private captureConsoleLogs() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      if (!this.isLogging) {
        this.isLogging = true;
        this.push("INFO", args.map(arg => typeof arg === "string" ? arg : this.safeStringify(arg)).join(" "));
        this.isLogging = false;
      }
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      if (!this.isLogging) {
        this.isLogging = true;
        this.push("ERROR", args.map(arg => typeof arg === "string" ? arg : this.safeStringify(arg)).join(" "));
        this.isLogging = false;
      }
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      if (!this.isLogging) {
        this.isLogging = true;
        this.push("WARN", args.map(arg => typeof arg === "string" ? arg : this.safeStringify(arg)).join(" "));
        this.isLogging = false;
      }
    };

    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      if (!this.isLogging) {
        this.isLogging = true;
        this.push("INFO", args.map(arg => typeof arg === "string" ? arg : this.safeStringify(arg)).join(" "));
        this.isLogging = false;
      }
    };
  }

  // Create ISO timestamp
  private timestamp() {
    return new Date().toISOString();
  }

  // Push log entry to internal memory + console
  private push(level: LogLevel, message: string) {
    const entry = {
      time: this.timestamp(),
      level,
      message,
    };

    this.logs.push(entry);

    // Colored console message
    let color =
      level === "ERROR"
        ? "color:red;font-weight:bold"
        : level === "SUCCESS"
        ? "color:green;font-weight:bold"
        : level === "WARN"
        ? "color:orange"
        : "color:blue";

    console.log(`%c[${entry.level}] ${entry.time} → ${entry.message}`, color);
  }

  // Public logging methods
  info(msg: string) {
    this.push("INFO", msg);
  }

  success(msg: string) {
    this.push("SUCCESS", msg);
  }

  warn(msg: string) {
    this.push("WARN", msg);
  }

  error(msg: string) {
    this.push("ERROR", msg);
  }

  // Get raw log array
  getAllLogs() {
    return [...this.logs];
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.clear();
    this.info("Log cleared");
  }

  // Download as .txt file
  download(filename: string = "pdf-editor-log.txt") {
    const sessionStart = new Date().toISOString();
    const totalLogs = this.logs.length;
    
    // Create header with session info
    const header = `================================================================================
PDF EDITOR PRO - APPLICATION LOG FILE
================================================================================
Session Started: ${sessionStart}
Total Log Entries: ${totalLogs}
Log Levels: INFO, SUCCESS, ERROR, WARN
================================================================================\n\n`;

    const content = this.logs
      .map((l) => `[${l.time}] [${l.level}] ${l.message}`)
      .join("\n");

    const fullContent = header + content;
    const blob = new Blob([fullContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }
}

const logger = new Logger();
export default logger;
