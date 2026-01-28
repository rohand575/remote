const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { createOverlayWindow } = require('./window');

let overlayWindow = null;
let tray = null;

// Disable hardware acceleration for transparent windows on Windows
// Must be called before app is ready
if (process.platform === 'win32') {
  app.disableHardwareAcceleration();
}

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  if (overlayWindow) {
    overlayWindow.focus();
  }
});

app.whenReady().then(() => {
  // Create the overlay window
  overlayWindow = createOverlayWindow();

  // Create system tray
  createTray();

  // Handle window close
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
});

/**
 * Create the system tray icon and menu
 */
function createTray() {
  // Create a simple tray icon
  const icon = createDefaultIcon();

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Overlay',
      click: () => {
        if (overlayWindow) {
          overlayWindow.show();
        }
      }
    },
    {
      label: 'Toggle Click-Through',
      click: () => {
        if (overlayWindow) {
          const isIgnoring = overlayWindow.isIgnoringMouseEvents || false;
          overlayWindow.setIgnoreMouseEvents(!isIgnoring, { forward: true });
          overlayWindow.isIgnoringMouseEvents = !isIgnoring;
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Live Reactions Presenter');
  tray.setContextMenu(contextMenu);

  // Double-click to toggle visibility
  tray.on('double-click', () => {
    if (overlayWindow) {
      if (overlayWindow.isVisible()) {
        overlayWindow.hide();
      } else {
        overlayWindow.show();
      }
    }
  });
}

/**
 * Create a simple default icon (purple square)
 */
function createDefaultIcon() {
  // Create a 16x16 purple icon using raw RGBA data
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);

  for (let i = 0; i < size * size; i++) {
    const offset = i * 4;
    buffer[offset] = 99;      // R
    buffer[offset + 1] = 102; // G
    buffer[offset + 2] = 241; // B
    buffer[offset + 3] = 255; // A
  }

  return nativeImage.createFromBuffer(buffer, {
    width: size,
    height: size,
    scaleFactor: 1.0
  });
}

// IPC handlers
ipcMain.handle('set-click-through', (event, enabled) => {
  if (overlayWindow) {
    overlayWindow.setIgnoreMouseEvents(enabled, { forward: true });
    overlayWindow.isIgnoringMouseEvents = enabled;
  }
});

ipcMain.handle('set-always-on-top', (event, enabled) => {
  if (overlayWindow) {
    overlayWindow.setAlwaysOnTop(enabled, 'screen-saver');
  }
});

ipcMain.handle('close-app', () => {
  app.quit();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    overlayWindow = createOverlayWindow();
  }
});
