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
    },
    // Remove the menu bar for a cleaner professional look
    autoHideMenuBar: true,
    menuBarVisible: false
  });

  // Remove the menu bar completely
  mainWindow.setMenuBarVisibility(false);

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
  // Ensure user directories exist before creating window
  ensureDirectoriesExist();
  
  // Set the embeddings path for the RAG module
  const embeddingsFilePath = path.join(userEmbeddingsPath, 'embeddings.json');
  setEmbeddingsPath(embeddingsFilePath);
  
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
const { answerQuestion, loadDocuments, setEmbeddingsPath } = require('./backend/rag');

// Get writable paths for user data
const fs = require('fs');
const userDataPath = app.getPath('userData');
const userDocsPath = path.join(userDataPath, 'documents');
const userEmbeddingsPath = path.join(userDataPath, 'embeddings');

// Ensure directories exist
function ensureDirectoriesExist() {
  try {
    if (!fs.existsSync(userDocsPath)) {
      fs.mkdirSync(userDocsPath, { recursive: true });
      console.log('📁 Created user documents directory:', userDocsPath);
    }
    if (!fs.existsSync(userEmbeddingsPath)) {
      fs.mkdirSync(userEmbeddingsPath, { recursive: true });
      console.log('📁 Created user embeddings directory:', userEmbeddingsPath);
    }
    
    // Copy existing documents from app bundle if they exist and user docs is empty
    const bundleDocsPath = path.join(__dirname, 'backend', 'source_docs');
    if (fs.existsSync(bundleDocsPath)) {
      const userFiles = fs.readdirSync(userDocsPath);
      if (userFiles.length === 0) {
        const bundleFiles = fs.readdirSync(bundleDocsPath);
        for (const file of bundleFiles) {
          if (!file.startsWith('.')) {
            const sourceFile = path.join(bundleDocsPath, file);
            const destFile = path.join(userDocsPath, file);
            fs.copyFileSync(sourceFile, destFile);
            console.log('📋 Copied initial document:', file);
          }
        }
      }
    }
    
    // Copy existing embeddings file if it exists and user embeddings is empty
    const bundleEmbeddingsPath = path.join(__dirname, 'backend', 'embedding_db', 'embeddings.json');
    const userEmbeddingsFile = path.join(userEmbeddingsPath, 'embeddings.json');
    if (fs.existsSync(bundleEmbeddingsPath) && !fs.existsSync(userEmbeddingsFile)) {
      fs.copyFileSync(bundleEmbeddingsPath, userEmbeddingsFile);
      console.log('📋 Copied initial embeddings file');
    }
  } catch (error) {
    console.error('❌ Error ensuring directories exist:', error.message);
  }
}

// IPC Handlers - Connect frontend to backend
ipcMain.handle('ask-question', async (event, question, imageBase64 = null) => {
  try {
    console.log('📝 Main process received question:', question);
    if (imageBase64) {
      console.log('🖼️ Main process received image data');
    }
    const result = await answerQuestion(question, imageBase64);
    
    return {
      success: true,
      answer: result.answer,
      sources: result.sources,
      metadata: result.metadata,
      hasImage: result.hasImage,
      modelUsed: result.modelUsed
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

// ========== DOCUMENT MANAGEMENT IPC HANDLERS ==========

// IPC Handler: Get documents list
ipcMain.handle('get-documents-list', async (event) => {
  console.log('📁 Getting documents list...');
  
  try {
    const embeddingsPath = path.join(userEmbeddingsPath, 'embeddings.json');
    
    // Get all files from source_docs directory
    const files = fs.readdirSync(userDocsPath);
    const documents = [];
    
    // Get embeddings data to count chunks
    let embeddingsData = null;
    let totalChunks = 0;
    
    try {
      if (fs.existsSync(embeddingsPath)) {
        const embeddingsContent = fs.readFileSync(embeddingsPath, 'utf8');
        embeddingsData = JSON.parse(embeddingsContent);
        totalChunks = embeddingsData.length;
      }
    } catch (embeddingsError) {
      console.warn('Could not load embeddings data:', embeddingsError.message);
    }
    
    for (const file of files) {
      if (file.startsWith('.')) continue; // Skip hidden files
      
      const filePath = path.join(userDocsPath, file);
      const stats = fs.statSync(filePath);
      
      // Count chunks for this document
      let docChunks = 0;
      if (embeddingsData) {
        docChunks = embeddingsData.filter(chunk => 
          chunk.metadata && chunk.metadata.source === file
        ).length;
      }
      
      documents.push({
        name: file,
        size: stats.size,
        modified: stats.mtime,
        chunks: docChunks
      });
    }
    
    console.log(`✅ Found ${documents.length} documents with ${totalChunks} total chunks`);
    
    return {
      success: true,
      documents: documents,
      totalChunks: totalChunks
    };
    
  } catch (error) {
    console.error('❌ Error getting documents list:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Upload document
ipcMain.handle('upload-document', async (event, documentData) => {
  console.log(`📤 Uploading document: ${documentData.name}`);
  
  try {
    const filePath = path.join(userDocsPath, documentData.name);
    
    // Check if file already exists
    if (fs.existsSync(filePath)) {
      const overwrite = true; // For now, always overwrite. Could add confirmation later.
      if (!overwrite) {
        throw new Error('File already exists');
      }
    }
    
    // Write the file
    fs.writeFileSync(filePath, documentData.content, 'utf8');
    
    console.log(`✅ Successfully uploaded: ${documentData.name}`);
    
    // Note: The system will need to rebuild embeddings
    return {
      success: true,
      message: 'Document uploaded successfully'
    };
    
  } catch (error) {
    console.error('❌ Error uploading document:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Remove document
ipcMain.handle('remove-document', async (event, filename) => {
  console.log(`🗑️ Removing document: ${filename}`);
  
  try {
    const filePath = path.join(userDocsPath, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }
    
    // Remove the file
    fs.unlinkSync(filePath);
    
    console.log(`✅ Successfully removed: ${filename}`);
    
    return {
      success: true,
      message: 'Document removed successfully'
    };
    
  } catch (error) {
    console.error('❌ Error removing document:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Reindex documents
ipcMain.handle('reindex-documents', async (event) => {
  console.log('⚡ Starting document reindexing...');
  
  try {
    // This would normally call a build process
    // For now, we'll simulate by deleting the embeddings file
    // and letting the system rebuild it on next query
    
    const embeddingsPath = path.join(userEmbeddingsPath, 'embeddings.json');
    
    // Remove existing embeddings file if it exists
    if (fs.existsSync(embeddingsPath)) {
      fs.unlinkSync(embeddingsPath);
      console.log('🗑️ Removed existing embeddings file');
    }
    
    console.log('✅ Reindexing completed - system will rebuild on next query');
    
    return {
      success: true,
      message: 'Document index cleared. System will rebuild automatically on next query.'
    };
    
  } catch (error) {
    console.error('❌ Error reindexing documents:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}); 