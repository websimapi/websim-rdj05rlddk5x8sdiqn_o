const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('privacyAgent', {
  // Main functionality
  startScan: (personalInfo) => ipcRenderer.invoke('start-scan', personalInfo),
  submitDeletionRequest: (websiteData, personalInfo) => 
    ipcRenderer.invoke('submit-deletion-request', { website: websiteData, personalInfo }),
  
  // Utility functions
  log: (level, message, meta = {}) => 
    ipcRenderer.invoke('log-message', { level, message, meta }),
  
  // App version
  getVersion: () => process.env.npm_package_version
});