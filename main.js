const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
require("dotenv").config();

// Configuration
const CONFIG = {
  WINDOW_WIDTH: process.env.WINDOW_WIDTH || 1400,
  WINDOW_HEIGHT: process.env.WINDOW_HEIGHT || 900,
  REACT_DEV_URL: process.env.REACT_DEV_URL || "http://localhost:5173",
  STARTUP_DELAY: process.env.STARTUP_DELAY || 8000,
};

let mainWindow;
let reviewServer;
let generatorServer;
let chatServer;
let reactProcess;

/**
 * Creates the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: CONFIG.WINDOW_WIDTH,
    height: CONFIG.WINDOW_HEIGHT,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // Load React app
  mainWindow.loadURL(CONFIG.REACT_DEV_URL);
  mainWindow.setMenuBarVisibility(false);

  // Show window when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Uncomment to open DevTools for debugging
  // mainWindow.webContents.openDevTools();
}

/**
 * Spawns a child process for a server
 * @param {string} name - Server name for logging
 * @param {string} command - Command to execute
 * @param {string[]} args - Command arguments
 * @param {Object} options - Spawn options
 * @returns {Promise<ChildProcess>}
 */
function spawnServer(name, command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[${name}] Starting...`);

    const defaultOptions = {
      shell: true,
      stdio: "inherit",
    };

    const server = spawn(command, args, { ...defaultOptions, ...options });

    server.on("error", (error) => {
      console.error(`[${name}] Failed to start:`, error.message);
      reject(error);
    });

    server.on("exit", (code, signal) => {
      if (code !== null && code !== 0) {
        console.warn(
          `[${name}] Exited with code ${code}${signal ? ` (${signal})` : ""}`
        );
      }
    });

    // Small delay to catch startup errors
    setTimeout(() => {
      console.log(`[${name}] Started successfully`);
      resolve(server);
    }, 1000);
  });
}

/**
 * Starts all backend services
 */
async function startBackendServices() {
  try {
    console.log("==========================================");
    console.log("Starting Offline Code Reviewer Backend...");
    console.log("==========================================");

    // Start servers in parallel
    const [review, generator, chat] = await Promise.all([
      spawnServer("Review Server", "node", ["server/server.js"]),
      spawnServer("Generator Server", "node", ["server/generator.js"]),
      spawnServer("Chat Server", "node", ["server/chat.js"]),
    ]);

    reviewServer = review;
    generatorServer = generator;
    chatServer = chat;

    console.log("All backend services started successfully");
    return true;
  } catch (error) {
    console.error("Failed to start backend services:", error);
    return false;
  }
}

/**
 * Starts the React development server
 */
async function startReactServer() {
  try {
    console.log("[React] Starting development server...");

    reactProcess = spawn("npm", ["run", "dev"], {
      cwd: path.join(__dirname, "client"),
      shell: true,
      stdio: "inherit",
    });

    reactProcess.on("error", (error) => {
      console.error("[React] Failed to start:", error.message);
    });

    console.log("[React] Server started");
    return true;
  } catch (error) {
    console.error("[React] Failed to start:", error);
    return false;
  }
}

/**
 * Initializes and starts the application
 */
async function initializeApp() {
  try {
    // Start backend services
    const backendReady = await startBackendServices();
    if (!backendReady) {
      console.error("Backend services failed to start. Continuing...");
    }

    // Start React dev server
    const reactReady = await startReactServer();
    if (!reactReady) {
      console.error("React server failed to start");
      app.quit();
      return;
    }

    // Wait for servers to be ready
    console.log(`Waiting ${CONFIG.STARTUP_DELAY}ms for servers to initialize...`);
    await new Promise((resolve) => setTimeout(resolve, CONFIG.STARTUP_DELAY));

    // Create main window
    console.log("Opening Electron window...");
    createWindow();

    console.log("==========================================");
    console.log("Application Ready!");
    console.log("==========================================");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    app.quit();
  }
}

// App event handlers
app.whenReady().then(() => {
  initializeApp();

  // On macOS, re-create window when dock icon is clicked
  app.on("activate", () => {
    if (mainWindow === null) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  console.log("Window closed, cleaning up...");
  killAllProcesses();

  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * Kills all spawned processes gracefully
 */
function killAllProcesses() {
  const processes = [
    { name: "Review Server", proc: reviewServer },
    { name: "Generator Server", proc: generatorServer },
    { name: "Chat Server", proc: chatServer },
    { name: "React", proc: reactProcess },
  ];

  processes.forEach(({ name, proc }) => {
    if (proc) {
      try {
        console.log(`Stopping ${name}...`);
        proc.kill("SIGTERM");
      } catch (error) {
        console.error(`Failed to stop ${name}:`, error.message);
      }
    }
  });

  console.log("All processes stopped");
}

// Handle app termination
process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down...");
  killAllProcesses();
  app.quit();
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down...");
  killAllProcesses();
  app.quit();
});
