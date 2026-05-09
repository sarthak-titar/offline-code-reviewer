const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Bundled Runtimes Path ───────────────────────────────────────────────
const RUNTIMES_DIR = path.join(__dirname, "..", "runtimes");
const TEMP_DIR = path.join(os.tmpdir(), "offline-compiler-temp");

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

console.log(`📁 Runtimes directory: ${RUNTIMES_DIR}`);

// ─── Load Runtime Manifest ───────────────────────────────────────────────
let RUNTIME_MANIFEST = {};
try {
  const manifestPath = path.join(RUNTIMES_DIR, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    RUNTIME_MANIFEST = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    console.log("✅ Runtime manifest loaded");
  } else {
    console.error("❌ manifest.json not found at:", manifestPath);
  }
} catch (err) {
  console.error("⚠️  Failed to load runtime manifest:", err.message);
}

// ─── Build Supported Languages from Manifest ─────────────────────────────
const SUPPORTED_LANGUAGES = {};

Object.entries(RUNTIME_MANIFEST).forEach(([langKey, langConfig]) => {
  const executable = path.join(RUNTIMES_DIR, langConfig.executable);

  // ✅ JavaScript always uses Electron's built-in Node.js (process.execPath)
  // so we mark it as always installed — no separate node.exe needed
  const isInstalled = langKey === "javascript"
    ? true
    : fs.existsSync(executable);

  // ✅ For Java: auto-correct if compiler accidentally points to java.exe instead of javac.exe
  let compilerPath = null;
  if (langConfig.compiler) {
    let compilerExe = langConfig.compiler;
    if (langKey === "java" && compilerExe.endsWith("java.exe")) {
      compilerExe = compilerExe.replace(/java\.exe$/, "javac.exe");
      console.warn(`⚠️  Auto-corrected Java compiler to javac.exe`);
    }
    compilerPath = path.join(RUNTIMES_DIR, compilerExe);
  }

  SUPPORTED_LANGUAGES[langKey] = {
    name: langConfig.name,
    version: langConfig.version,
    executable: executable,
    compiler: compilerPath,
    enabled: langConfig.enabled,
    installed: isInstalled,
    extension: getExtension(langKey)
  };

  if (langKey === "javascript") {
    console.log(`✅ ${langConfig.name} (${langConfig.version}) → Electron built-in Node.js (${process.execPath})`);
  } else {
    const status = isInstalled ? "✅" : "❌";
    console.log(`${status} ${langConfig.name} (${langConfig.version}) → ${executable}`);
  }

  if (langKey === "java") {
    if (compilerPath && fs.existsSync(compilerPath)) {
      console.log(`✅ javac found → ${compilerPath}`);
    } else {
      console.error(`❌ javac NOT found → ${compilerPath}`);
    }
  }
});

// ─── Get File Extension ──────────────────────────────────────────────────
function getExtension(language) {
  const extensions = {
    python: ".py",
    java: ".java",
    javascript: ".js",
    cpp: ".cpp",
    c: ".c"
  };
  return extensions[language] || ".txt";
}

// ─── Extract Java Public Class Name ─────────────────────────────────────
function extractJavaClassName(code) {
  const match = code.match(/public\s+class\s+(\w+)/);
  return match ? match[1] : "Main";
}

// ─── API: Get Available Runtimes ─────────────────────────────────────────
app.get("/api/compiler/runtimes", (req, res) => {
  const response = Object.entries(SUPPORTED_LANGUAGES).map(([key, lang]) => ({
    id: key,
    name: lang.name,
    version: lang.version,
    installed: lang.installed,
    enabled: lang.enabled
  }));
  res.json(response);
});

// ─── API: Execute Code ──────────────────────────────────────────────────
app.post("/api/compiler/execute", async (req, res) => {
  const { code, language, input = "" } = req.body;

  if (!code || !language) {
    return res.status(400).json({ success: false, error: "Code and language are required" });
  }

  if (!SUPPORTED_LANGUAGES[language]) {
    return res.status(400).json({ success: false, error: `Language '${language}' not supported` });
  }

  const runtime = SUPPORTED_LANGUAGES[language];

  if (!runtime.enabled) {
    return res.status(400).json({ success: false, error: `${runtime.name} is not enabled` });
  }

  if (!runtime.installed) {
    return res.status(400).json({
      success: false,
      error: `${runtime.name} runtime not found at: ${runtime.executable}`
    });
  }

  try {
    const result = await executeCode(language, code, input);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Execute error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── Execute Code ────────────────────────────────────────────────────────
function executeCode(language, code, input = "", timeout = 10000) {
  return new Promise((resolve, reject) => {
    let tempFile;

    try {
      const runtime = SUPPORTED_LANGUAGES[language];
      const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);

      if (language === "java") {
        const className = extractJavaClassName(code);
        tempFile = path.join(TEMP_DIR, `${className}.java`);
      } else {
        tempFile = path.join(TEMP_DIR, `code_${uniqueId}${runtime.extension}`);
      }

      fs.writeFileSync(tempFile, code, "utf-8");
      console.log(`📄 Temp file: ${tempFile}`);

      // ─── Java: compile then run ──────────────────────────────────────
      if (language === "java") {
        const startTime = Date.now();

        if (!runtime.compiler) {
          cleanup(tempFile);
          return reject(new Error(
            'No compiler defined in manifest.json for Java. Add: "compiler": "java21/bin/javac.exe"'
          ));
        }

        if (!fs.existsSync(runtime.compiler)) {
          cleanup(tempFile);
          return reject(new Error(
            `javac not found at: ${runtime.compiler}\nCheck your runtimes/java21/bin/ folder.`
          ));
        }

        console.log(`🔨 Compiling with javac: ${runtime.compiler}`);

        const compileProc = spawn(runtime.compiler, [tempFile], {
          stdio: ["pipe", "pipe", "pipe"],
          shell: process.platform === "win32"
        });

        let compileError = "";

        compileProc.stderr.on("data", (data) => {
          compileError += data.toString();
        });

        compileProc.on("close", (exitCode) => {
          if (exitCode !== 0) {
            cleanup(tempFile);
            return reject(new Error(`Compilation error:\n${compileError}`));
          }

          const classPath = path.dirname(tempFile);
          const className = path.basename(tempFile, ".java");

          console.log(`▶ Running: java -cp ${classPath} ${className}`);

          executeJava(runtime.executable, classPath, className, timeout, startTime, input)
            .then(resolve)
            .catch(reject)
            .finally(() => cleanup(tempFile));
        });

        compileProc.on("error", (err) => {
          cleanup(tempFile);
          reject(new Error(`Failed to start javac: ${err.message}\nPath: ${runtime.compiler}`));
        });

        return; // Java fully handled above
      }

      // ─── Python / JavaScript ─────────────────────────────────────────
      const { command, args } = buildCommand(language, tempFile);
      const startTime = Date.now();

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      console.log(`▶ Running: ${command} ${args.join(" ")}`);

      const proc = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        shell: process.platform === "win32"
      });

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
        if (stdout.length > 10000) {
          proc.kill();
          stdout = stdout.substring(0, 10000) + "\n... (output truncated)";
        }
      });

      proc.stderr.on("data", (data) => {
        stderr += data.toString();
        if (stderr.length > 10000) {
          stderr = stderr.substring(0, 10000) + "\n... (error truncated)";
        }
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill();
      }, timeout);

      proc.on("close", (exitCode) => {
        clearTimeout(timer);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        cleanup(tempFile);

        resolve({
          stdout: stdout || "(no output)",
          stderr: stderr,
          exitCode: exitCode,
          duration: parseFloat(duration),
          language,
          success: exitCode === 0 && !timedOut,
          timedOut: timedOut,
          message: timedOut ? "Execution timeout (10 seconds)" : "Success"
        });
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        cleanup(tempFile);
        reject(new Error(`Failed to execute: ${err.message}`));
      });

    } catch (err) {
      cleanup(tempFile);
      reject(err);
    }
  });
}

// ─── Execute Java Helper ─────────────────────────────────────────────────
function executeJava(javaExe, classPath, className, timeout, startTime, input = "") {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const proc = spawn(javaExe, ["-cp", classPath, className], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32"
    });

    // ✅ MUST be after spawn
    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
      if (stdout.length > 10000) {
        proc.kill();
        stdout = stdout.substring(0, 10000) + "\n... (output truncated)";
      }
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
      if (stderr.length > 10000) {
        stderr = stderr.substring(0, 10000) + "\n... (error truncated)";
      }
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeout);

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      resolve({
        stdout: stdout || "(no output)",
        stderr: stderr,
        exitCode: exitCode,
        duration: parseFloat(duration),
        language: "java",
        success: exitCode === 0 && !timedOut,
        timedOut: timedOut,
        message: timedOut ? "Execution timeout (10 seconds)" : "Success"
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`Failed to start java.exe: ${err.message}\nPath: ${javaExe}`));
    });
  });
}

// ─── Build Command ───────────────────────────────────────────────────────
function buildCommand(language, filePath) {
  switch (language) {
    case "python":
      return { command: SUPPORTED_LANGUAGES[language].executable, args: [filePath] };

    //case "javascript":
      // ✅ Always use Electron's built-in Node.js — no separate node.exe needed
     // return { command: process.execPath, args: [filePath] };

      case "javascript":
  // ✅ Use bundled node.exe from runtimes folder
  return { command: SUPPORTED_LANGUAGES[language].executable, args: [filePath] };

    case "java":
      return { command: "", args: [] }; // handled separately

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────────────
function cleanup(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    const classFile = filePath.replace(".java", ".class");
    if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
  } catch (err) {
    // ignore
  }
}

// ─── Start Server ────────────────────────────────────────────────────────
const PORT = process.env.COMPILER_PORT || 3003;
app.listen(PORT, () => {
  console.log(`\n✅ Compiler server running on http://localhost:${PORT}\n`);
});

module.exports = app;