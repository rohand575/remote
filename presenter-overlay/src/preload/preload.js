const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose a limited API to the renderer process
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Enable or disable click-through mode
   * @param {boolean} enabled
   */
  setClickThrough: (enabled) => ipcRenderer.invoke('set-click-through', enabled),

  /**
   * Set always-on-top state
   * @param {boolean} enabled
   */
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', enabled),

  /**
   * Close the application
   */
  closeApp: () => ipcRenderer.invoke('close-app'),

  /**
   * Listen for toggle status overlay event (Ctrl+Shift+L)
   * @param {Function} callback
   */
  onToggleStatusOverlay: (callback) => ipcRenderer.on('toggle-status-overlay', callback),

  /**
   * Get platform info
   */
  platform: process.platform
});
