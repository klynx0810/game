const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 1000,
    webPreferences: {
      nodeIntegration: true,     // dùng Node API trong renderer
      contextIsolation: false    // cho phép window.require
    }
  });

  win.loadFile(path.join(__dirname, "frontend", "index.html"));
}

app.whenReady().then(createWindow);
