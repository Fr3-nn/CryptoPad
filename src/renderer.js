// Import CryptoJS
const CryptoJS = require('crypto-js');
const { ipcRenderer } = require('electron');

// DOM Elements
const elements = {
  // Window Controls
  windowClose: document.getElementById('window-close'),
  windowMinimize: document.getElementById('window-minimize'),
  windowMaximize: document.getElementById('window-maximize'),
  
  // Theme Toggle
  themeToggle: document.getElementById('theme-toggle'),
  themeIcon: document.querySelector('#theme-toggle i'),
  
  // Mode Tabs
  modeTabs: document.querySelectorAll('.mode-tab'),
  
  // Panels
  keyPanel: document.getElementById('key-panel'),
  
  // Input & Output
  inputText: document.getElementById('input-text'),
  outputText: document.getElementById('output-text'),
  encryptionKey: document.getElementById('encryption-key'),
  showKey: document.getElementById('show-key'),
  
  // Buttons
  clearInput: document.getElementById('clear-input'),
  pasteInput: document.getElementById('paste-input'),
  openFile: document.getElementById('open-file'),
  copyOutput: document.getElementById('copy-output'),
  saveOutput: document.getElementById('save-output'),
  
  // Settings
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  closeSettings: document.getElementById('close-settings'),
  saveSettings: document.getElementById('save-settings'),
  cancelSettings: document.getElementById('cancel-settings'),
  resetSettings: document.getElementById('reset-settings'),
  themeSetting: document.getElementById('theme-setting'),
  fontSizeSetting: document.getElementById('font-size-setting'),
  defaultModeSetting: document.getElementById('default-mode-setting'),
  confirmCloseSetting: document.getElementById('confirm-close-setting'),
  autoSaveSetting: document.getElementById('auto-save-setting'),
  
  // Status & Notifications
  statusMessage: document.getElementById('status-message'),
  notification: document.getElementById('notification'),
  notificationMessage: document.getElementById('notification-message')
};

// State
const state = {
  currentMode: 'base64-encode', // Default mode
  isDarkMode: true, // Default theme
  isMaximized: false, // Window state
  settings: {}, // Will hold our settings
  tempSettings: {} // Temporary settings for the modal
};

// Load settings from main process
function loadSettings() {
  state.settings = ipcRenderer.sendSync('get-settings');
  applySettings();
}

// Apply loaded settings to the UI
function applySettings() {
  // Apply theme
  const theme = state.settings.theme;
  if (theme === 'dark') {
    setDarkMode(true);
  } else if (theme === 'light') {
    setDarkMode(false);
  } else if (theme === 'system') {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }
  
  // Apply font size
  setFontSize(state.settings.fontSize);
  
  // Apply default mode
  switchMode(state.settings.defaultMode);
  
  // Initialize settings form values
  populateSettingsForm();
}

// Set font size
function setFontSize(size) {
  document.body.classList.remove('font-small', 'font-medium', 'font-large');
  document.body.classList.add(`font-${size}`);
}

// Populate settings form with current values
function populateSettingsForm() {
  // Set the values of the settings form elements
  elements.themeSetting.value = state.settings.theme;
  elements.fontSizeSetting.value = state.settings.fontSize;
  elements.defaultModeSetting.value = state.settings.defaultMode;
  elements.confirmCloseSetting.checked = state.settings.confirmBeforeClose;
  elements.autoSaveSetting.checked = state.settings.autoSave;
}

// Save settings to main process
function saveSettings() {
  // Get values from form
  const newSettings = {
    theme: elements.themeSetting.value,
    fontSize: elements.fontSizeSetting.value,
    defaultMode: elements.defaultModeSetting.value,
    confirmBeforeClose: elements.confirmCloseSetting.checked,
    autoSave: elements.autoSaveSetting.checked
  };
  
  // Update each setting
  Object.keys(newSettings).forEach(key => {
    ipcRenderer.sendSync('set-setting', key, newSettings[key]);
  });
  
  // Reload settings and apply
  loadSettings();
  
  // Show notification
  showNotification('Settings saved successfully');
  
  // Close modal
  toggleSettingsModal(false);
}

// Reset settings to defaults
function resetSettings() {
  // Confirm reset
  if (confirm('Are you sure you want to reset all settings to default values?')) {
    state.settings = ipcRenderer.sendSync('reset-settings');
    applySettings();
    showNotification('Settings reset to defaults');
    toggleSettingsModal(false);
  }
}

// Toggle settings modal visibility
function toggleSettingsModal(show) {
  if (show) {
    // Store current settings in temporary state (for cancel operation)
    state.tempSettings = { ...state.settings };
    
    // Populate form with current settings
    populateSettingsForm();
    
    // Show modal
    elements.settingsModal.classList.remove('hidden');
    
    // Focus on first input
    elements.themeSetting.focus();
  } else {
    elements.settingsModal.classList.add('hidden');
  }
}

// Apply settings from form without saving
function previewSettings() {
  const theme = elements.themeSetting.value;
  const fontSize = elements.fontSizeSetting.value;
  
  // Preview theme
  if (theme === 'dark') {
    setDarkMode(true, false); // Don't save preference
  } else if (theme === 'light') {
    setDarkMode(false, false); // Don't save preference
  }
  
  // Preview font size
  setFontSize(fontSize);
}

// Cancel settings changes
function cancelSettings() {
  // Restore settings from temp state
  state.settings = { ...state.tempSettings };
  
  // Reapply original settings
  applySettings();
  
  // Close modal
  toggleSettingsModal(false);
}

// Window control functions
function closeWindow() {
  // If confirm before close is enabled, prompt user
  if (state.settings.confirmBeforeClose && elements.inputText.value.trim() !== '') {
    if (!confirm('You have unsaved changes. Are you sure you want to close the application?')) {
      return;
    }
  }
  
  ipcRenderer.send('window-close');
}

function minimizeWindow() {
  ipcRenderer.send('window-minimize');
}

function maximizeWindow() {
  ipcRenderer.send('window-maximize');
  toggleMaximizeIcon();
}

function toggleMaximizeIcon() {
  state.isMaximized = !state.isMaximized;
  if (state.isMaximized) {
    elements.windowMaximize.querySelector('i').classList.remove('fa-square');
    elements.windowMaximize.querySelector('i').classList.add('fa-clone');
  } else {
    elements.windowMaximize.querySelector('i').classList.remove('fa-clone');
    elements.windowMaximize.querySelector('i').classList.add('fa-square');
  }
}

// Functions
// Set dark/light mode
function setDarkMode(isDark, savePreference = true) {
  const body = document.body;
  state.isDarkMode = isDark;
  
  if (isDark) {
    body.classList.remove('light-mode');
    body.classList.add('dark-mode');
    elements.themeIcon.classList.remove('fa-sun');
    elements.themeIcon.classList.add('fa-moon');
  } else {
    body.classList.remove('dark-mode');
    body.classList.add('light-mode');
    elements.themeIcon.classList.remove('fa-moon');
    elements.themeIcon.classList.add('fa-sun');
  }
  
  // Save preference if requested
  if (savePreference) {
    ipcRenderer.sendSync('set-setting', 'theme', isDark ? 'dark' : 'light');
  }
}

// Toggle theme function
function toggleTheme() {
  setDarkMode(!state.isDarkMode);
}

// Switch between modes
function switchMode(mode) {
  state.currentMode = mode;
  
  // Update UI
  elements.modeTabs.forEach(tab => {
    if (tab.dataset.mode === mode) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // Show/hide key panel based on mode
  if (mode === 'encrypt' || mode === 'decrypt') {
    elements.keyPanel.classList.remove('hidden');
  } else {
    elements.keyPanel.classList.add('hidden');
  }
  
  // Update status message
  updateStatus(`Mode: ${formatMode(mode)}`);
  
  // If there's input, process it immediately
  processInput();
}

// Format mode name for display
function formatMode(mode) {
  return mode
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Process input based on current mode
function processInput() {
  const input = elements.inputText.value;
  const key = elements.encryptionKey.value;
  let output = '';
  let error = false;
  
  try {
    switch (state.currentMode) {
      case 'base64-encode':
        output = btoa(input);
        break;
      case 'base64-decode':
        output = atob(input);
        break;
      case 'encrypt':
        if (!key) {
          showNotification('Please enter an encryption key', 'error');
          error = true;
          break;
        }
        output = CryptoJS.AES.encrypt(input, key).toString();
        break;
      case 'decrypt':
        if (!key) {
          showNotification('Please enter a decryption key', 'error');
          error = true;
          break;
        }
        const bytes = CryptoJS.AES.decrypt(input, key);
        output = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!output) {
          showNotification('Unable to decrypt. Invalid key or ciphertext.', 'error');
          error = true;
        }
        break;
    }
    
    if (!error) {
      elements.outputText.value = output;
      
      // Auto-save if enabled
      if (state.settings.autoSave && output) {
        autoSaveOutput(output);
      }
    }
  } catch (err) {
    elements.outputText.value = '';
    showNotification(`Error: ${err.message}`, 'error');
  }
}

// Auto-save output
function autoSaveOutput(output) {
  // Only auto-save on substantial content changes
  if (output && output.length > 10) {
    // We'll save to a temporary file in the user's save location
    ipcRenderer.send('auto-save', output);
  }
}

// Show notification
function showNotification(message, type = 'success') {
  const notification = elements.notification;
  const notificationMessage = elements.notificationMessage;
  const icon = notification.querySelector('i');
  
  // Set message
  notificationMessage.textContent = message;
  
  // Set icon based on type
  if (type === 'error') {
    icon.className = 'fas fa-exclamation-circle';
    icon.style.color = 'var(--dark-accent)';
  } else {
    icon.className = 'fas fa-check-circle';
    icon.style.color = '';
  }
  
  // Show notification
  notification.classList.add('show');
  
  // Hide after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Update status message
function updateStatus(message) {
  elements.statusMessage.textContent = message;
}

// Event Listeners
// Window controls
elements.windowClose.addEventListener('click', closeWindow);
elements.windowMinimize.addEventListener('click', minimizeWindow);
elements.windowMaximize.addEventListener('click', maximizeWindow);

// Theme toggle
elements.themeToggle.addEventListener('click', toggleTheme);

// Settings button
elements.settingsBtn.addEventListener('click', () => toggleSettingsModal(true));
elements.closeSettings.addEventListener('click', () => toggleSettingsModal(false));
elements.saveSettings.addEventListener('click', saveSettings);
elements.cancelSettings.addEventListener('click', cancelSettings);
elements.resetSettings.addEventListener('click', resetSettings);

// Live preview of settings
elements.themeSetting.addEventListener('change', previewSettings);
elements.fontSizeSetting.addEventListener('change', previewSettings);

// Mode tabs
elements.modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchMode(tab.dataset.mode);
  });
});

// Input text changes
elements.inputText.addEventListener('input', processInput);

// Key changes
elements.encryptionKey.addEventListener('input', processInput);

// Show/hide password
elements.showKey.addEventListener('change', (e) => {
  elements.encryptionKey.type = e.target.checked ? 'text' : 'password';
});

// Clear input
elements.clearInput.addEventListener('click', () => {
  elements.inputText.value = '';
  elements.outputText.value = '';
  updateStatus('Input cleared');
});

// Paste input
elements.pasteInput.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    elements.inputText.value = text;
    processInput();
    updateStatus('Text pasted from clipboard');
  } catch (err) {
    showNotification('Failed to read from clipboard', 'error');
  }
});

// Copy output
elements.copyOutput.addEventListener('click', async () => {
  const output = elements.outputText.value;
  
  if (!output) {
    showNotification('Nothing to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(output);
    showNotification('Copied to clipboard');
  } catch (err) {
    showNotification('Failed to copy to clipboard', 'error');
  }
});

// Save output to file
elements.saveOutput.addEventListener('click', () => {
  const output = elements.outputText.value;
  
  if (!output) {
    showNotification('Nothing to save', 'error');
    return;
  }
  
  ipcRenderer.send('save-file', output);
});

// Open file
elements.openFile.addEventListener('click', () => {
  ipcRenderer.send('open-file');
});

// IPC handlers for file operations
ipcRenderer.on('save-file-reply', (event, result) => {
  if (result.success) {
    showNotification('File saved successfully');
  } else {
    showNotification(`Error saving file: ${result.message}`, 'error');
  }
});

ipcRenderer.on('open-file-reply', (event, result) => {
  if (result.success) {
    elements.inputText.value = result.data;
    processInput();
    showNotification('File opened successfully');
  } else {
    showNotification(`Error opening file: ${result.message}`, 'error');
  }
});

// Listen for window state changes
ipcRenderer.on('window-maximized', () => {
  if (!state.isMaximized) {
    toggleMaximizeIcon();
  }
});

ipcRenderer.on('window-unmaximized', () => {
  if (state.isMaximized) {
    toggleMaximizeIcon();
  }
});

// System theme change detection (for system theme setting)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (state.settings.theme === 'system') {
    setDarkMode(e.matches, false);
  }
});

// Support for drag and drop
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.stopPropagation();
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  for (const file of e.dataTransfer.files) {
    // Only accept text files
    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        elements.inputText.value = event.target.result;
        processInput();
        showNotification(`File loaded: ${file.name}`);
      };
      reader.readAsText(file);
      break; // Only process the first file
    } else {
      showNotification('Only text files are supported', 'error');
    }
  }
});

// Initialize app
function init() {
  // Load settings first
  loadSettings();
}

// Start the app
init(); 