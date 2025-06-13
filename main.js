const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Enable node integration in the renderer process
      nodeIntegration: false,
      // Enable context isolation for security
      contextIsolation: true,
      // Path to the preload script
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the HTML file
  mainWindow.loadFile('renderer/index.html');

  // Open the DevTools (optional - you can comment this out in production)
  // mainWindow.webContents.openDevTools();

  // Handle window closed
  mainWindow.on('closed', function () {
    // Dereference the window object
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
  // On macOS, keep the app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Import the RAG backend
const { answerQuestion, loadDocuments } = require('./backend/rag');

// IPC Handlers - Connect frontend to backend
ipcMain.handle('ask-question', async (event, question) => {
  try {
    console.log('📝 Main process received question:', question);
    const result = await answerQuestion(question);
    
    return {
      success: true,
      answer: result.answer,
      sources: result.sources,
      metadata: result.metadata
    };
  } catch (error) {
    console.error('❌ Main process error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('test-backend', async (event) => {
  try {
    console.log('🔍 Testing backend connection...');
    
    // Try to load documents to test if backend is ready
    const documents = await loadDocuments();
    
    if (documents && documents.length > 0) {
      console.log(`✅ Backend ready - ${documents.length} documents loaded`);
      return {
        success: true,
        message: `Ready - ${documents.length} documents loaded`
      };
    } else {
      return {
        success: false,
        error: 'No documents found - run Phase 2 processing first'
      };
    }
  } catch (error) {
    console.error('❌ Backend test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}); 