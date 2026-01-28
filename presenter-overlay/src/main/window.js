const { BrowserWindow, screen } = require('electron');
const path = require('path');

/**
 * Create the primary overlay window (for dialogs and main UI)
 * This window appears only on the primary display
 * @returns {BrowserWindow}
 */
function createOverlayWindow() {
  // Get the primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const { x, y } = primaryDisplay.bounds;

  const win = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
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

  // Mark this as the primary window
  win.isPrimaryOverlay = true;

  // Load the overlay HTML
  win.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    win.webContents.openDevTools({ mode: 'detach' });
  }

  return win;
}

/**
 * Create secondary overlay windows for extended displays (emoji reactions only)
 * These windows are always click-through and only show floating emojis
 * @returns {BrowserWindow[]}
 */
function createSecondaryOverlayWindows() {
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();
  const secondaryWindows = [];

  // Filter out the primary display
  const secondaryDisplays = allDisplays.filter(display => display.id !== primaryDisplay.id);

  for (const display of secondaryDisplays) {
    const { width, height } = display.workAreaSize;
    const { x, y } = display.bounds;

    const win = new BrowserWindow({
      width: width,
      height: height,
      x: x,
      y: y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false, // Secondary windows should never be focusable
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

    // Set window level to stay on top
    win.setAlwaysOnTop(true, 'screen-saver');

    // Make the window visible on all workspaces (macOS)
    if (process.platform === 'darwin') {
      win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    // Always enable click-through for secondary displays
    win.setIgnoreMouseEvents(true, { forward: true });
    win.isIgnoringMouseEvents = true;

    // Mark as secondary window
    win.isPrimaryOverlay = false;
    win.displayId = display.id;

    // Load the secondary overlay HTML (emoji-only mode)
    win.loadFile(path.join(__dirname, '../renderer/secondary.html'));

    secondaryWindows.push(win);
  }

  return secondaryWindows;
}

/**
 * Get all displays info
 * @returns {Object}
 */
function getDisplaysInfo() {
  const allDisplays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  return {
    primary: primaryDisplay,
    all: allDisplays,
    secondary: allDisplays.filter(d => d.id !== primaryDisplay.id),
    count: allDisplays.length
  };
}

module.exports = { createOverlayWindow, createSecondaryOverlayWindows, getDisplaysInfo };
