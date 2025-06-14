const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Ask a question to the backend
  askQuestion: (question, imageBase64 = null, selectedModel = 'qwen2:0.5b') => {
    return ipcRenderer.invoke('ask-question', question, imageBase64, selectedModel);
  },
  
  // Test backend connection
  testBackend: () => ipcRenderer.invoke('test-backend'),
  
  // Stop current request
  stopCurrentRequest: () => ipcRenderer.invoke('stop-current-request'),
  
  // Get documents list
  getDocuments: () => ipcRenderer.invoke('get-documents'),
  
  // Reindex documents
  reindexDocuments: () => ipcRenderer.invoke('reindex-documents'),
  
  // Open user documents folder
  openDocumentsFolder: () => ipcRenderer.invoke('open-documents-folder'),
  
  // Get document source status
  getDocumentSource: () => ipcRenderer.invoke('get-document-source'),
  
  // Refresh documents from GitHub
  refreshGitHubDocuments: () => ipcRenderer.invoke('refresh-github-documents')
}); 