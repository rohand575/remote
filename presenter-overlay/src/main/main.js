const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, globalShortcut, screen } = require('electron');
const path = require('path');
const { createOverlayWindow, createSecondaryOverlayWindows, getDisplaysInfo } = require('./window');

let overlayWindow = null;
let secondaryWindows = [];
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
  // Create the primary overlay window (on primary display)
  overlayWindow = createOverlayWindow();

  // Create secondary overlay windows (on extended displays)
  secondaryWindows = createSecondaryOverlayWindows();
  console.log(`Created ${secondaryWindows.length} secondary display windows`);

  // Create system tray
  createTray();

  // Register global shortcut Ctrl+Shift+L to toggle status overlay
  globalShortcut.register('Ctrl+Shift+L', () => {
    if (overlayWindow) {
      overlayWindow.webContents.send('toggle-status-overlay');
      overlayWindow.show();
      // Disable click-through when showing status overlay
      overlayWindow.setIgnoreMouseEvents(false);
      overlayWindow.isIgnoringMouseEvents = false;
    }
  });

  // Handle window close
  overlayWindow.on('closed', () => {
    overlayWindow = null;
    // Also close secondary windows
    secondaryWindows.forEach(win => {
      if (win && !win.isDestroyed()) {
        win.close();
      }
    });
    secondaryWindows = [];
  });

  // Listen for display changes (monitor connected/disconnected)
  screen.on('display-added', () => {
    console.log('Display added, recreating secondary windows');
    recreateSecondaryWindows();
  });

  screen.on('display-removed', () => {
    console.log('Display removed, recreating secondary windows');
    recreateSecondaryWindows();
  });
});

/**
 * Recreate secondary windows when display configuration changes
 */
function recreateSecondaryWindows() {
  // Close existing secondary windows
  secondaryWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  // Create new secondary windows
  secondaryWindows = createSecondaryOverlayWindows();
  console.log(`Recreated ${secondaryWindows.length} secondary display windows`);
}

/**
 * Create the system tray icon and menu
 */
function createTray() {
  // Load tray icon from file
  let icon;
  const iconPath = path.join(__dirname, '../../assets/icon.ico');
  const pngPath = path.join(__dirname, '../../assets/icon-32.png');

  try {
    // Try ICO first (Windows), then PNG (macOS/Linux)
    if (process.platform === 'win32') {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      icon = nativeImage.createFromPath(pngPath);
    }

    // Fallback to default if file doesn't exist or is empty
    if (icon.isEmpty()) {
      console.log('Icon file not found or empty, using default');
      icon = createDefaultIcon();
    }
  } catch (e) {
    console.log('Failed to load icon, using default:', e);
    icon = createDefaultIcon();
  }

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

// Broadcast emoji to all secondary displays
ipcMain.handle('broadcast-emoji', (event, emoji) => {
  secondaryWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('spawn-emoji', emoji);
    }
  });
});

// Unregister shortcuts when quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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
