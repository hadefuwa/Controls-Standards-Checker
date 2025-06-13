const { contextBridge, ipcRenderer } = require('electron');

// Expose secure API methods to the renderer process
// This connects the frontend to the RAG backend
contextBridge.exposeInMainWorld('electronAPI', {
  // Ask a question using the RAG backend (with optional image)
  askQuestion: (question, imageBase64 = null) => ipcRenderer.invoke('ask-question', question, imageBase64),
  
  // Test if the backend is working
  testBackend: () => ipcRenderer.invoke('test-backend')
}); 