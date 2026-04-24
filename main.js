const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;

let reviewServer;
let generatorServer;
let chatServer;
let reactProcess;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  //// Load React app
  mainWindow.loadURL("http://localhost:5173");
  mainWindow.setMenuBarVisibility(false);
// Show only when ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Optional DevTools
   //mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
// Start backend server
  console.log("Starting Review Server...");
  reviewServer = spawn("node", ["server/server.js"], {
    shell: true,
    stdio: "inherit"
  });

  console.log("Starting Generator Server...");
  generatorServer = spawn("node", ["server/generator.js"], {
    shell: true,
    stdio: "inherit"
  });

  console.log("Starting Chat Server...");
  chatServer = spawn("node", ["server/chat.js"], {
    shell: true,
    stdio: "inherit"
  });

  console.log("Starting React...");
 // Start React dev server
  reactProcess = spawn("npm", ["run", "dev"], {
    cwd: path.join(__dirname, "client"),
    shell: true,
    stdio: "inherit"
  });
  // Wait properly (important fix)
  setTimeout(() => {
    console.log("Opening Electron Window...");
    createWindow();
  }, 8000);

});

app.on("window-all-closed", () => {

  console.log("Closing processes...");

  if (reviewServer) reviewServer.kill();
  if (generatorServer) generatorServer.kill();
  if (chatServer) chatServer.kill();
  if (reactProcess) reactProcess.kill();

  app.quit();
});