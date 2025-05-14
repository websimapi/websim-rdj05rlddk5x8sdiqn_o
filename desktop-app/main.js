const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const winston = require('winston');

// Set up logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'privacy-agent' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Store the main application window
let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Load the main HTML file
  mainWindow.loadFile('index.html');

  // Open DevTools in development mode
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main application window created');
}

// Initialize the application when Electron is ready
app.whenReady().then(() => {
  createWindow();

  // On macOS, recreate window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  logger.info('Application ready');
});

// Quit the application when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication with renderer process

// Handler for starting a privacy scan
ipcMain.handle('start-scan', async (event, personalInfo) => {
  logger.info('Starting privacy scan', { personalInfo: { ...personalInfo, email: '***@***' } });
  
  try {
    // This would call into the scanner module
    // For now, just return mock data
    return {
      success: true,
      websites: [
        { name: 'example-social.com', hasPersonalData: true, privacyUrl: 'https://example-social.com/privacy' },
        { name: 'example-shop.com', hasPersonalData: true, privacyUrl: 'https://example-shop.com/account/privacy' },
        { name: 'example-forum.com', hasPersonalData: true, privacyUrl: 'https://example-forum.com/settings/privacy' }
      ]
    };
  } catch (error) {
    logger.error('Error during privacy scan', { error: error.message });
    return { success: false, error: error.message };
  }
});

// Handler for submitting deletion requests
ipcMain.handle('submit-deletion-request', async (event, { website, personalInfo }) => {
  logger.info(`Submitting deletion request for ${website.name}`);
  
  try {
    // This would call into the deletion requester module
    // For now, just return mock success
    return {
      success: true,
      referenceNumber: `REF-${Math.floor(Math.random() * 100000)}`
    };
  } catch (error) {
    logger.error(`Error submitting deletion request for ${website.name}`, { error: error.message });
    return { success: false, error: error.message };
  }
});

// Handler for logging
ipcMain.handle('log-message', (event, { level, message, meta }) => {
  logger[level](message, meta);
  return true;
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});