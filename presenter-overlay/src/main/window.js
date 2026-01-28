const { BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * Create the transparent overlay window
 * @returns {BrowserWindow}
 */
function createOverlayWindow() {
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const win = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true, // Start focusable for room input
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Set window level to stay on top of everything (including fullscreen apps on macOS)
  win.setAlwaysOnTop(true, 'screen-saver');

  // Make the window visible on all workspaces (macOS)
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  // Track click-through state
  win.isIgnoringMouseEvents = false;

  // Load the overlay HTML
  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

module.exports = { createOverlayWindow };
