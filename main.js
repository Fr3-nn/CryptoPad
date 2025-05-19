const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let autoSaveTimer = null;
let autoSaveContent = '';
let store = null;

// Default settings
const defaultSettings = {
  theme: 'dark',
  fontSize: 'medium',
  defaultMode: 'base64-encode',
  autoSave: false,
  saveLocation: app.getPath('documents'),
  confirmBeforeClose: true
};

// Initialize the app and store
async function initApp() {
  try {
    // Dynamically import electron-store (ESM module)
    const { default: Store } = await import('electron-store');
    
    // Initialize settings store
    store = new Store({
      defaults: defaultSettings
    });
    
    // Create the window after store is initialized
    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    icon: path.join(__dirname, 'build/icon.ico'),
    show: false, // Don't show until ready-to-show
    frame: true, // Keep frame for better OS integration
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1e2e', // Dark background color
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window maximize/unmaximize events
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.whenReady().then(initApp);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create window when dock icon is clicked and no other windows open
  if (mainWindow === null) {
    createWindow();
  }
});

// Window control handlers
ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

// Settings handlers
ipcMain.on('get-settings', (event) => {
  if (store) {
    event.returnValue = store.store;
  } else {
    event.returnValue = defaultSettings;
  }
});

ipcMain.on('set-setting', (event, key, value) => {
  if (store) {
    store.set(key, value);
  }
  event.returnValue = true;
});

ipcMain.on('get-setting', (event, key) => {
  if (store) {
    event.returnValue = store.get(key);
  } else {
    event.returnValue = defaultSettings[key];
  }
});

ipcMain.on('reset-settings', (event) => {
  if (store) {
    store.clear();
  }
  event.returnValue = defaultSettings;
});

// Auto-save handler
ipcMain.on('auto-save', (event, content) => {
  autoSaveContent = content;
  
  // Debounce auto-save to prevent excessive writes
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  autoSaveTimer = setTimeout(() => {
    performAutoSave();
  }, 2000); // Wait 2 seconds of inactivity before saving
});

// Perform auto-save operation
function performAutoSave() {
  if (!store || !store.get('autoSave') || !autoSaveContent) return;
  
  const saveLocation = store.get('saveLocation', app.getPath('documents'));
  const autoSavePath = path.join(saveLocation, 'cryptopad-autosave.txt');
  
  fs.writeFile(autoSavePath, autoSaveContent, (err) => {
    if (err) {
      console.error('Auto-save failed:', err);
    }
  });
}

// Handle saving file
ipcMain.on('save-file', (event, text) => {
  const saveLocation = store ? store.get('saveLocation', app.getPath('documents')) : app.getPath('documents');
  
  dialog.showSaveDialog(mainWindow, {
    title: 'Save Output',
    defaultPath: path.join(saveLocation, 'output.txt'),
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      // Update last save location
      if (store) {
        store.set('saveLocation', path.dirname(result.filePath));
      }
      
      fs.writeFile(result.filePath, text, (err) => {
        if (err) {
          event.reply('save-file-reply', { success: false, message: err.message });
        } else {
          event.reply('save-file-reply', { success: true, message: 'File saved successfully' });
        }
      });
    }
  }).catch(err => {
    event.reply('save-file-reply', { success: false, message: err.message });
  });
});

// Handle opening a file
ipcMain.on('open-file', (event) => {
  const saveLocation = store ? store.get('saveLocation', app.getPath('documents')) : app.getPath('documents');
  
  dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    defaultPath: saveLocation,
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      // Update last save location
      if (store) {
        store.set('saveLocation', path.dirname(result.filePaths[0]));
      }
      
      fs.readFile(result.filePaths[0], 'utf8', (err, data) => {
        if (err) {
          event.reply('open-file-reply', { success: false, message: err.message });
        } else {
          event.reply('open-file-reply', { success: true, data });
        }
      });
    }
  }).catch(err => {
    event.reply('open-file-reply', { success: false, message: err.message });
  });
}); 