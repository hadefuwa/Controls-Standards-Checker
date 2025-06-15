const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

// Get writable paths for user data
const userDataPath = app.getPath('userData');
const userDocsPath = path.join(userDataPath, 'documents');
const userEmbeddingsPath = path.join(userDataPath, 'embeddings');

// Import the RAG backend
const { answerQuestion, loadDocuments, setEmbeddingsPath } = require('./backend/rag');

// Keep a global reference of the window object
let mainWindow;

// Global variable to track current requests
let currentRequestController = null;

// GitHub configuration
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_REPO = 'hadefuwa/Controls-Standards-Checker';
const GITHUB_DOCS_PATH = 'backend/source_docs';

// Track document source
let isUsingGitHubDocuments = false;

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
  
  // Try to update documents from GitHub first
  const githubResult = await updateDocumentsFromGitHub();
  if (githubResult.success && githubResult.conflictsResolved > 0) {
    console.log(`🔄 ${githubResult.conflictsResolved} document conflicts were resolved during startup`);
  }
  
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

// ========== GITHUB DOCUMENT MANAGEMENT ==========

/**
 * Check if internet connection is available
 */
async function checkInternetConnection() {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'api.github.com',
      port: 443,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => resolve(false));
    req.on('timeout', () => resolve(false));
    req.end();
  });
}

/**
 * Fetch file list from GitHub repository
 */
async function fetchGitHubFileList() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${GITHUB_REPO}/contents/${GITHUB_DOCS_PATH}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Industrial-AI-Assistant'
      },
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const files = JSON.parse(data);
            // Filter for text files only
            const textFiles = files.filter(file => 
              file.type === 'file' && 
              (file.name.endsWith('.txt') || file.name.endsWith('.md'))
            );
            resolve(textFiles);
          } else {
            reject(new Error(`GitHub API returned status ${res.statusCode}`));
          }
        } catch (error) {
          reject(new Error('Failed to parse GitHub API response'));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`GitHub API request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      reject(new Error('GitHub API request timed out'));
    });
    
    req.end();
  });
}

/**
 * Download a single file from GitHub
 */
async function downloadGitHubFile(file) {
  return new Promise((resolve, reject) => {
    const req = https.request(file.download_url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({
            name: file.name,
            content: data,
            size: file.size
          });
        } else {
          reject(new Error(`Failed to download ${file.name}: Status ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Download failed for ${file.name}: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Show conflict resolution dialog to user
 */
async function showConflictDialog(filename, localContent, githubContent) {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Document Conflict Detected',
    message: `The document "${filename}" exists both locally and on GitHub with different content.`,
    detail: `Local version: ${localContent.length} characters\nGitHub version: ${githubContent.length} characters\n\nWhat would you like to do?`,
    buttons: [
      'Keep Local Version',
      'Use GitHub Version', 
      'Backup Both Versions'
    ],
    defaultId: 2, // Default to "Backup Both"
    cancelId: 0,  // Cancel means keep local
    noLink: true
  });
  
  return result.response;
}

/**
 * Handle conflict resolution choice
 */
async function resolveDocumentConflict(choice, filename, localPath, githubContent) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  switch (choice) {
    case 0: // Keep Local Version
      console.log(`📋 Keeping local version of: ${filename}`);
      return 'kept_local';
      
    case 1: // Use GitHub Version
      fs.writeFileSync(localPath, githubContent, 'utf8');
      console.log(`📥 Replaced with GitHub version: ${filename}`);
      return 'used_github';
      
    case 2: // Backup Both Versions
      // Backup local version
      const backupPath = localPath.replace(/(\.[^.]+)$/, `_local_${timestamp}$1`);
      fs.copyFileSync(localPath, backupPath);
      
      // Write GitHub version
      fs.writeFileSync(localPath, githubContent, 'utf8');
      
      console.log(`📋 Backed up local version to: ${path.basename(backupPath)}`);
      console.log(`📥 Updated to GitHub version: ${filename}`);
      return 'backed_up_both';
      
    default:
      return 'kept_local';
  }
}

/**
 * Update documents from GitHub
 */
async function updateDocumentsFromGitHub() {
  console.log('🌐 Checking for GitHub document updates...');
  
  try {
    // Check internet connection
    const hasInternet = await checkInternetConnection();
    if (!hasInternet) {
      console.log('📴 No internet connection - using local documents');
      return false;
    }
    
    // Fetch file list from GitHub
    const githubFiles = await fetchGitHubFileList();
    console.log(`📋 Found ${githubFiles.length} documents on GitHub`);
    
    if (githubFiles.length === 0) {
      console.log('⚠️ No documents found on GitHub - using local documents');
      return false;
    }
    
    // Create GitHub documents directory
    const githubDocsPath = path.join(userDataPath, 'github_documents');
    if (!fs.existsSync(githubDocsPath)) {
      fs.mkdirSync(githubDocsPath, { recursive: true });
    }
    
    // Download each file with conflict detection
    console.log('⬇️ Downloading documents from GitHub...');
    let downloadedCount = 0;
    let conflictsResolved = 0;
    
    for (const file of githubFiles) {
      try {
        const downloadedFile = await downloadGitHubFile(file);
        const githubTempPath = path.join(githubDocsPath, downloadedFile.name);
        const localFilePath = path.join(userDocsPath, downloadedFile.name);
        
        // Write to GitHub temp directory first
        fs.writeFileSync(githubTempPath, downloadedFile.content, 'utf8');
        
        // Check for conflicts with existing local files
        if (fs.existsSync(localFilePath)) {
          const localContent = fs.readFileSync(localFilePath, 'utf8');
          const githubContent = downloadedFile.content;
          
          if (localContent !== githubContent) {
            console.log(`⚠️ Conflict detected: ${downloadedFile.name}`);
            
            // Show conflict dialog and handle user choice
            const choice = await showConflictDialog(downloadedFile.name, localContent, githubContent);
            const result = await resolveDocumentConflict(choice, downloadedFile.name, localFilePath, githubContent);
            
            if (result === 'kept_local') {
              console.log(`📋 User chose to keep local version of ${downloadedFile.name}`);
            } else {
              conflictsResolved++;
            }
          } else {
            // Files are identical, no conflict
            console.log(`✅ No changes needed: ${downloadedFile.name}`);
          }
        } else {
          // New file, copy from GitHub temp to local
          fs.copyFileSync(githubTempPath, localFilePath);
          console.log(`📥 New document added: ${downloadedFile.name}`);
        }
        
        downloadedCount++;
      } catch (error) {
        console.error(`❌ Failed to download ${file.name}:`, error.message);
      }
    }
    
    if (downloadedCount > 0) {
      // Report results
      let message = `🎉 Successfully processed ${downloadedCount} documents from GitHub`;
      if (conflictsResolved > 0) {
        message += ` (${conflictsResolved} conflicts resolved)`;
      }
      console.log(message);
      
      console.log('📁 GitHub document sync completed');
      isUsingGitHubDocuments = true;
      return {
        success: true,
        downloadedCount,
        conflictsResolved,
        message
      };
    } else {
      console.log('❌ No documents successfully downloaded - using local documents');
      return {
        success: false,
        downloadedCount: 0,
        conflictsResolved: 0,
        message: 'No documents downloaded'
      };
    }
    
  } catch (error) {
    console.error('❌ Error updating documents from GitHub:', error.message);
    return {
      success: false,
      downloadedCount: 0,
      conflictsResolved: 0,
      message: error.message
    };
  }
}

// IPC Handlers - Connect frontend to backend
ipcMain.handle('ask-question', async (event, question, imageBase64 = null, selectedModel = 'lm-studio-gpu') => {
  try {
    console.log('📝 Main process received question:', question);
    console.log('🤖 Using model:', selectedModel);
    if (imageBase64) {
      console.log('🖼️ Main process received image data');
    }
    
    // Create an AbortController for this request
    currentRequestController = new AbortController();
    
    const result = await answerQuestion(question, imageBase64, selectedModel, currentRequestController.signal);
    
    return {
      success: true,
      answer: result.answer,
      sources: result.sources,
      metadata: result.metadata,
      systemStats: result.systemStats,
      hasImage: result.hasImage,
      modelUsed: result.modelUsed,
      elapsedTime: result.elapsedTime
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
    isUsingGitHub: isUsingGitHubDocuments,
    source: isUsingGitHubDocuments ? 'GitHub Repository' : 'Local Documents'
  };
});

// IPC Handler: Force refresh from GitHub
ipcMain.handle('refresh-github-documents', async (event) => {
  try {
    console.log('🔄 Manual GitHub document refresh requested');
    const result = await updateDocumentsFromGitHub();
    
    if (result.success) {
      let message = `Documents synchronized from GitHub: ${result.downloadedCount} processed`;
      if (result.conflictsResolved > 0) {
        message += `, ${result.conflictsResolved} conflicts resolved`;
      }
      
      return {
        success: true,
        message: message,
        requiresReindex: result.downloadedCount > 0,
        downloadedCount: result.downloadedCount,
        conflictsResolved: result.conflictsResolved
      };
    } else {
      return {
        success: false,
        message: result.message || 'Failed to update from GitHub - using local documents'
      };
    }
  } catch (error) {
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