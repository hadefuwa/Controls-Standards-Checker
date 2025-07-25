const { app, BrowserWindow, ipcMain, dialog, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Get writable paths for user data
const userDataPath = app.getPath('userData');
const userDocsPath = path.join(userDataPath, 'documents');
const userEmbeddingsPath = path.join(userDataPath, 'embeddings');
const userChatLogsPath = path.join(userDataPath, 'chat_logs');

// Import the RAG backend
const { answerQuestion, loadDocuments, setEmbeddingsPath } = require('./backend/rag');

// Keep a global reference of the window object
let mainWindow;

// Global variable to track current requests
let currentRequestController = null;

// Track document source - REMOVED
// let isUsingGitHubDocuments = false;

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
app.whenReady().then(async () => {
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

// (Variables moved to top of file)

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
    if (!fs.existsSync(userChatLogsPath)) {
      fs.mkdirSync(userChatLogsPath, { recursive: true });
      console.log('📁 Created user chat logs directory:', userChatLogsPath);
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

// ========== GITHUB DOCUMENT MANAGEMENT - REMOVED ==========

// All GitHub functions removed for cleaner local-only operation

// IPC Handlers - Connect frontend to backend
ipcMain.handle('ask-question', async (event, question, imageBase64 = null, selectedModel = 'lm-studio-gpu') => {
  const startTime = Date.now(); // Track response time
  
  try {
    console.log('📝 Main process received question:', question);
    console.log('🤖 Using model:', selectedModel);
    if (imageBase64) {
      console.log('🖼️ Main process received image data');
    }
    
    // Create an AbortController for this request
    currentRequestController = new AbortController();
    
    const result = await answerQuestion(question, imageBase64, selectedModel, currentRequestController.signal);
    
    // Calculate total response time
    const totalResponseTime = (Date.now() - startTime) / 1000;
    
    // Save chat log
    try {
      saveChatLog(question, result.answer, {
        confidence: result.confidence,
        confidenceLevel: result.confidenceLevel,
        modelUsed: result.modelUsed,
        sources: result.sources,
        elapsedTime: totalResponseTime
      });
    } catch (logError) {
      console.warn('⚠️ Failed to save chat log:', logError.message);
    }
    
    return {
      success: true,
      answer: result.answer,
      sources: result.sources,
      metadata: result.metadata,
      systemStats: result.systemStats,
      hasImage: result.hasImage,
      modelUsed: result.modelUsed,
      elapsedTime: result.elapsedTime,
      confidence: result.confidence,
      confidenceLevel: result.confidenceLevel
    };
  } catch (error) {
    console.error('❌ Main process error:', error.message);
    
    // Check if error is due to abort
    if (error.message.includes('canceled by user')) {
      return {
        success: false,
        error: 'Request was canceled by user',
        canceled: true
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  } finally {
    currentRequestController = null;
  }
});

// IPC Handler: Stop current request
ipcMain.handle('stop-current-request', async (event) => {
  try {
    console.log('🛑 Stop request received');
    
    if (currentRequestController) {
      currentRequestController.abort();
      console.log('✅ Current request stopped');
      return {
        success: true,
        message: 'Request stopped successfully'
      };
    } else {
      console.log('⚠️ No active request to stop');
      return {
        success: false,
        message: 'No active request to stop'
      };
    }
  } catch (error) {
    console.error('❌ Error stopping request:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Get document source status
ipcMain.handle('get-document-source', async (event) => {
  return {
    success: true,
    isUsingGitHub: false,
    source: 'Local Documents'
  };
});

// IPC Handler: Delete local document
ipcMain.handle('delete-document', async (event, filename) => {
  try {
    console.log('🗑️ Deleting document:', filename);
    
    const filePath = path.join(userDocsPath, filename);
    
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        error: 'Document not found'
      };
    }
    
    // Delete the file
    fs.unlinkSync(filePath);
    
    console.log('✅ Document deleted successfully:', filename);
    
    return {
      success: true,
      message: `Document "${filename}" deleted successfully`
    };
    
  } catch (error) {
    console.error('❌ Error deleting document:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Force refresh from GitHub
// GitHub refresh handler removed - no longer needed for local-only operation

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
    // Process documents from the user's directory
    const result = await processUserDocuments();
    
    if (result.success) {
      console.log(`✅ Reindexing completed - processed ${result.totalChunks} chunks from ${result.documentsProcessed} documents`);
      
      return {
        success: true,
        message: `Reindexing completed! Processed ${result.totalChunks} chunks from ${result.documentsProcessed} documents.`
      };
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('❌ Error reindexing documents:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// Function to process documents from user directory
async function processUserDocuments() {
  console.log('🔄 Processing documents from user directory...');
  
  try {
    // Import required modules for processing
    const { getEmbedding } = require('./llm/lm_studio_client');
    
    // Configuration
    const CHUNK_SIZE = 200; // Approximate words per chunk (reduced for faster processing)
    const embeddingsPath = path.join(userEmbeddingsPath, 'embeddings.json');
    
    // Get all files from user documents directory
    const files = fs.readdirSync(userDocsPath);
    const txtFiles = files.filter(file => file.endsWith('.txt') && !file.startsWith('.'));
    
    if (txtFiles.length === 0) {
      return {
        success: false,
        error: 'No .txt files found in documents directory'
      };
    }
    
    console.log(`Found ${txtFiles.length} text files to process`);
    
    const allEmbeddings = [];
    let totalChunks = 0;
    let documentsProcessed = 0;
    
    // Process each document
    for (const filename of txtFiles) {
      const filePath = path.join(userDocsPath, filename);
      console.log(`Processing: ${filename}`);
      
      try {
        // Read the file content
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.trim().length === 0) {
          console.log(`Warning: ${filename} is empty, skipping...`);
          continue;
        }
        
        // Split text into chunks
        const words = content.split(/\s+/).filter(word => word.length > 0);
        const chunks = [];
        
        // Create chunks of approximately CHUNK_SIZE words
        for (let i = 0; i < words.length; i += CHUNK_SIZE) {
          const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
          if (chunk.trim().length > 0) {
            chunks.push(chunk);
          }
        }
        
        console.log(`Created ${chunks.length} chunks from ${filename}`);
        
        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const chunkId = `${filename}-chunk-${i + 1}`;
          
          console.log(`Processing chunk ${i + 1}/${chunks.length} from ${filename}...`);
          
          try {
            // Get embedding for this chunk
            const embedding = await getEmbedding(chunk);
            
            // Store embedding data
            const embeddingData = {
              id: chunkId,
              document: chunk,
              embedding: embedding,
              metadata: {
                source: filename,
                chunk_index: i + 1,
                total_chunks: chunks.length,
                processed_at: new Date().toISOString()
              }
            };
            
            allEmbeddings.push(embeddingData);
            totalChunks++;
            
          } catch (error) {
            console.error(`Error processing chunk ${chunkId}:`, error.message);
            throw error;
          }
        }
        
        documentsProcessed++;
        console.log(`Completed processing ${filename} - processed ${chunks.length} chunks`);
        
      } catch (error) {
        console.error(`Error processing ${filename}:`, error.message);
        throw error;
      }
    }
    
    // Save all embeddings to file
    console.log(`Saving ${allEmbeddings.length} embeddings to file...`);
    
    // Ensure embeddings directory exists
    if (!fs.existsSync(userEmbeddingsPath)) {
      fs.mkdirSync(userEmbeddingsPath, { recursive: true });
    }
    
    fs.writeFileSync(embeddingsPath, JSON.stringify(allEmbeddings, null, 2));
    
    console.log(`Successfully saved embeddings to: ${embeddingsPath}`);
    
    return {
      success: true,
      documentsProcessed: documentsProcessed,
      totalChunks: totalChunks
    };
    
  } catch (error) {
    console.error('Error in processUserDocuments:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// IPC Handler: Open documents folder
ipcMain.handle('open-documents-folder', async (event) => {
  console.log('📁 Opening documents folder...');
  
  try {
    // Import shell module for opening folders
    const { shell } = require('electron');
    
    // Open the documents folder in the file manager
    await shell.openPath(userDocsPath);
    
    console.log(`✅ Opened documents folder: ${userDocsPath}`);
    
    return {
      success: true,
      message: 'Documents folder opened successfully'
    };
    
  } catch (error) {
    console.error('❌ Error opening documents folder:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

ipcMain.handle('get-documents', async (event) => {
  try {
    // For now, return the processed documents info
    // This should be expanded to show actual document files
    const { getDocumentCount } = require('./backend/rag');
    
    // Get document statistics
    const stats = await getDocumentCount();
    
    return {
      success: true,
      documents: stats.documents || [],
      totalChunks: stats.totalChunks || 0
    };
  } catch (error) {
    console.error('❌ Error getting documents:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// ========== CHAT LOGGING FUNCTIONS ==========

/**
 * Save a chat conversation to the logs
 */
function saveChatLog(question, answer, metadata) {
  try {
    const timestamp = new Date();
    const filename = `chat_${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}_${String(timestamp.getHours()).padStart(2, '0')}-${String(timestamp.getMinutes()).padStart(2, '0')}-${String(timestamp.getSeconds()).padStart(2, '0')}.json`;
    
    const chatLog = {
      timestamp: timestamp.toISOString(),
      question: question,
      answer: answer,
      metadata: {
        confidence: metadata.confidence || 0,
        confidenceLevel: metadata.confidenceLevel || 'unknown',
        model: metadata.modelUsed || 'unknown',
        chunks_used: metadata.sources ? metadata.sources.length : 0,
        response_time: metadata.elapsedTime || 0,
        sources: metadata.sources || []
      }
    };
    
    const logPath = path.join(userChatLogsPath, filename);
    fs.writeFileSync(logPath, JSON.stringify(chatLog, null, 2));
    
    console.log('💾 Chat log saved:', filename);
    
    // Clean up old logs (keep only last 100 conversations)
    cleanupOldChatLogs();
    
  } catch (error) {
    console.error('❌ Error saving chat log:', error.message);
  }
}

/**
 * Clean up old chat logs, keeping only the last 100 conversations
 */
function cleanupOldChatLogs() {
  try {
    const files = fs.readdirSync(userChatLogsPath)
      .filter(file => file.startsWith('chat_') && file.endsWith('.json'))
      .map(file => ({
        name: file,
        path: path.join(userChatLogsPath, file),
        mtime: fs.statSync(path.join(userChatLogsPath, file)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime); // Sort by modification time, newest first
    
    // Keep only the 100 most recent files
    const filesToDelete = files.slice(100);
    
    for (const file of filesToDelete) {
      fs.unlinkSync(file.path);
      console.log('🗑️ Deleted old chat log:', file.name);
    }
    
    if (filesToDelete.length > 0) {
      console.log(`🧹 Cleaned up ${filesToDelete.length} old chat logs`);
    }
    
  } catch (error) {
    console.error('❌ Error cleaning up chat logs:', error.message);
  }
}

// ========== NEW FEATURE IPC HANDLERS ==========

// IPC Handler: Save bookmark
ipcMain.handle('save-bookmark', async (event, bookmarkData) => {
  try {
    const bookmarksPath = path.join(userDataPath, 'bookmarks.json');
    let bookmarks = [];
    
    // Load existing bookmarks
    if (fs.existsSync(bookmarksPath)) {
      const bookmarksContent = fs.readFileSync(bookmarksPath, 'utf8');
      bookmarks = JSON.parse(bookmarksContent);
    }
    
    // Add new bookmark with timestamp and full metadata
    const bookmark = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      question: bookmarkData.question,
      answer: bookmarkData.answer,
      confidence: bookmarkData.confidence,
      confidenceLevel: bookmarkData.confidenceLevel,
      sources: bookmarkData.sources || [],
      metadata: bookmarkData.metadata || {},
      elapsedTime: bookmarkData.elapsedTime || 0,
      systemStats: bookmarkData.systemStats || {}
    };
    
    bookmarks.unshift(bookmark); // Add to beginning
    
    // Keep only last 100 bookmarks
    if (bookmarks.length > 100) {
      bookmarks = bookmarks.slice(0, 100);
    }
    
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
    
    console.log('🔖 Bookmark saved successfully');
    
    return {
      success: true,
      message: 'Answer bookmarked successfully!'
    };
    
  } catch (error) {
    console.error('❌ Error saving bookmark:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Get bookmarks
ipcMain.handle('get-bookmarks', async (event) => {
  try {
    const bookmarksPath = path.join(userDataPath, 'bookmarks.json');
    
    if (!fs.existsSync(bookmarksPath)) {
      return {
        success: true,
        bookmarks: []
      };
    }
    
    const bookmarksContent = fs.readFileSync(bookmarksPath, 'utf8');
    const bookmarks = JSON.parse(bookmarksContent);
    
    return {
      success: true,
      bookmarks: bookmarks
    };
    
  } catch (error) {
    console.error('❌ Error loading bookmarks:', error.message);
    return {
      success: false,
      error: error.message,
      bookmarks: []
    };
  }
});

// IPC Handler: Load bookmark data
ipcMain.handle('load-bookmark', async (event, bookmarkId) => {
  try {
    const bookmarksPath = path.join(userDataPath, 'bookmarks.json');
    
    if (!fs.existsSync(bookmarksPath)) {
      return {
        success: false,
        error: 'No bookmarks found'
      };
    }
    
    const bookmarksContent = fs.readFileSync(bookmarksPath, 'utf8');
    const bookmarks = JSON.parse(bookmarksContent);
    
    // Find bookmark with matching ID
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    
    if (!bookmark) {
      return {
        success: false,
        error: 'Bookmark not found'
      };
    }
    
    console.log('🔖 Bookmark loaded successfully');
    
    return {
      success: true,
      bookmark: bookmark
    };
    
  } catch (error) {
    console.error('❌ Error loading bookmark:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Delete bookmark
ipcMain.handle('delete-bookmark', async (event, bookmarkId) => {
  try {
    const bookmarksPath = path.join(userDataPath, 'bookmarks.json');
    
    if (!fs.existsSync(bookmarksPath)) {
      return {
        success: false,
        error: 'No bookmarks found'
      };
    }
    
    const bookmarksContent = fs.readFileSync(bookmarksPath, 'utf8');
    let bookmarks = JSON.parse(bookmarksContent);
    
    // Remove bookmark with matching ID
    bookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
    
    fs.writeFileSync(bookmarksPath, JSON.stringify(bookmarks, null, 2));
    
    console.log('🗑️ Bookmark deleted successfully');
    
    return {
      success: true,
      message: 'Bookmark deleted successfully'
    };
    
  } catch (error) {
    console.error('❌ Error deleting bookmark:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Export current chat
ipcMain.handle('export-chat', async (event, chatData, format = 'txt') => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `chat_export_${timestamp}.${format}`;
    
    let content = '';
    
    if (format === 'txt') {
      content = `Industrial Automation Compliance Assistant - Chat Export\n`;
      content += `Export Date: ${new Date().toLocaleString()}\n`;
      content += `Total Messages: ${chatData.length}\n`;
      content += `${'='.repeat(60)}\n\n`;
      
      chatData.forEach((message, index) => {
        content += `[${index + 1}] ${message.sender.toUpperCase()}\n`;
        content += `Time: ${message.timestamp || 'Unknown'}\n`;
        if (message.confidence) {
          content += `Confidence: ${message.confidence}% (${message.confidenceLevel})\n`;
        }
        content += `Message:\n${message.text}\n`;
        if (message.sources && message.sources.length > 0) {
          content += `Sources: ${message.sources.join(', ')}\n`;
        }
        content += `${'-'.repeat(40)}\n\n`;
      });
    } else if (format === 'json') {
      content = JSON.stringify({
        exportDate: new Date().toISOString(),
        totalMessages: chatData.length,
        messages: chatData
      }, null, 2);
    }
    
    // Save to user data directory
    const exportPath = path.join(userDataPath, 'exports');
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }
    
    const filePath = path.join(exportPath, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    
    console.log('📤 Chat exported successfully:', filename);
    
    return {
      success: true,
      message: `Chat exported successfully as ${filename}`,
      filePath: filePath
    };
    
  } catch (error) {
    console.error('❌ Error exporting chat:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
});

// IPC Handler: Copy to clipboard
ipcMain.handle('copy-to-clipboard', async (event, text) => {
  try {
    clipboard.writeText(text);
    console.log('📋 Text copied to clipboard');
    
    return {
      success: true,
      message: 'Copied to clipboard!'
    };
    
  } catch (error) {
    console.error('❌ Error copying to clipboard:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}); 