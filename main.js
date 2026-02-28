const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;
let reactProcess;

function createWindow() {

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {

  // Start backend
  serverProcess = spawn('node', ['server/server.js'], {
    shell: true
  });

  // Start React
  reactProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, 'client'),
    shell: true
  });

  // Wait React to start
  setTimeout(() => {
    createWindow();
  }, 5000);
});

app.on('window-all-closed', () => {

  if (serverProcess) serverProcess.kill();
  if (reactProcess) reactProcess.kill();

  app.quit();
});