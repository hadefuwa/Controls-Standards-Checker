// Renderer process JavaScript
// This file will contain the client-side logic for the application

console.log('Industrial AI Assistant renderer loaded successfully!'); 

// Industrial Automation AI Assistant - Professional Engineering Interface
// Technical frontend for machinery compliance and safety systems

console.log('System: Professional Engineering Interface Initialized');

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const sendButtonText = document.getElementById('sendButtonText');
const sendButtonSpinner = document.getElementById('sendButtonSpinner');
const stopButton = document.getElementById('stopButton');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const status = document.getElementById('status');
const quickButtons = document.querySelectorAll('.quick-btn');

// System state management
let isProcessing = false;
let currentRequest = null; // Track current request to allow cancellation
let messageHistory = [];
let systemStartTime = new Date();
let currentImage = null; // Store current pasted image

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('System: Engineering Interface Ready');
    
    // Set up event listeners
    setupEventListeners();
    
    // Check backend system status
    checkBackendStatus();
    
    // Set initial focus to input
    setTimeout(() => questionInput.focus(), 150);
    
    // Log system initialization
    logSystemEvent('Interface initialized successfully');
});

/**
 * Configure event listeners for user interaction
 */
function setupEventListeners() {
    // Send button functionality
    sendButton.addEventListener('click', handleSendMessage);
    
    // Stop button functionality
    stopButton.addEventListener('click', handleStopMessage);
    
    // Input field shortcuts (Shift+Enter for new line, Enter to send)
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Quick action buttons
    quickButtons.forEach(button => {
        button.addEventListener('click', () => {
            const question = button.getAttribute('data-question');
            questionInput.value = question;
            handleSendMessage();
        });
    });
    
    // Dynamic textarea sizing
    questionInput.addEventListener('input', () => {
        questionInput.style.height = 'auto';
        questionInput.style.height = Math.min(questionInput.scrollHeight, 120) + 'px';
    });
    
    // Visual feedback for empty input
    questionInput.addEventListener('input', () => {
        const isEmpty = questionInput.value.trim() === '';
        sendButton.style.opacity = isEmpty ? '0.6' : '1';
    });

    // Image paste functionality
    questionInput.addEventListener('paste', handleImagePaste);
    document.addEventListener('paste', handleImagePaste);
}

/**
 * Verify backend system connectivity and readiness
 */
async function checkBackendStatus() {
    try {
        updateSystemStatus('Initializing...', 'processing');
        
        // Test backend connectivity
        const testResult = await window.electronAPI.testBackend();
        
        if (testResult.success) {
            updateSystemStatus('System Ready', 'ready');
            logSystemEvent('Backend system operational - ' + testResult.message);
        } else {
            updateSystemStatus('System Error', 'error');
            logSystemEvent('Backend system failure: ' + testResult.error);
            showSystemMessage('System Warning: Backend service unavailable. Verify Ollama installation and configuration.');
        }
    } catch (error) {
        updateSystemStatus('Connection Failed', 'error');
        logSystemEvent('System connection error: ' + error.message);
        showSystemMessage('System Error: Unable to establish backend connection. Check system configuration.');
    }
}

/**
 * Update system status indicator
 */
function updateSystemStatus(text, statusType) {
    statusText.textContent = text;
    
    // Clear existing status classes
    status.classList.remove('processing', 'error');
    
    // Apply new status class
    if (statusType === 'processing') {
        status.classList.add('processing');
    } else if (statusType === 'error') {
        status.classList.add('error');
    }
}

/**
 * Display system notifications to user
 */
function showSystemMessage(message) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'message assistant-message system-message';
    systemDiv.innerHTML = `
        <div class="message-avatar">
            <div class="system-icon"></div>
        </div>
        <div class="message-content">
            <div class="message-text system">
                ${message}
            </div>
        </div>
    `;
    
    chatMessages.appendChild(systemDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Process user query and interface with backend system
 */
async function handleSendMessage() {
    const question = questionInput.value.trim();
    
    if (!question || isProcessing) {
        return;
    }
    
    // Get selected model
    const selectedModel = document.getElementById('modelSelect').value;
    
    // Log user interaction
    messageHistory.push({ 
        type: 'user', 
        content: question, 
        timestamp: new Date(),
        sessionTime: (new Date() - systemStartTime) / 1000,
        modelUsed: selectedModel
    });
    
    // Clear input and set processing state
    questionInput.value = '';
    questionInput.style.height = 'auto';
    setProcessingState(true);
    
    // Display user message
    addMessage(question, 'user');
    
    // Update system status
    updateSystemStatus('Processing Query...', 'processing');
    
    try {
        logSystemEvent('Processing user query with ' + selectedModel + ': ' + question.substring(0, 50) + '...');
        if (currentImage) {
            updateSystemStatus('Analyzing Image...', 'processing');
        }
        
        // Create a cancellable request
        currentRequest = window.electronAPI.askQuestion(question, currentImage, selectedModel);
        const result = await currentRequest;
        
        if (result.success) {
            // Log successful response
            messageHistory.push({
                type: 'assistant',
                content: result.answer,
                sources: result.sources,
                metadata: result.metadata,
                hasImage: result.hasImage,
                modelUsed: result.modelUsed,
                elapsedTime: result.elapsedTime,
                timestamp: new Date(),
                sessionTime: (new Date() - systemStartTime) / 1000
            });
            
            // Display AI response with typing animation
            await addMessageWithTyping(result.answer, 'assistant', result.sources, result.metadata, result.elapsedTime, result.systemStats, result.confidence, result.confidenceLevel);
            updateSystemStatus('System Ready', 'ready');
            logSystemEvent('Query processed successfully using ' + result.modelUsed);
        } else {
            // Check if the request was canceled
            if (result.canceled) {
                await addMessageWithTyping('Request was canceled by user.', 'assistant');
                updateSystemStatus('Request Canceled', 'ready');
                logSystemEvent('Query was canceled by user');
            } else {
                // Handle processing errors
                const errorMessage = `System Error: Unable to process query.\n\nError Details: ${result.error}\n\nRequired System Components:\n• Ollama service running\n• ${selectedModel} model installed\n• Document embeddings configured`;
                await addMessageWithTyping(errorMessage, 'assistant');
                updateSystemStatus('Processing Error', 'error');
                logSystemEvent('Query processing failed: ' + result.error);
            }
        }
        
    } catch (error) {
        logSystemEvent('System error: ' + error.message);
        const errorMessage = `Critical System Error: Backend communication failure.\n\nTroubleshooting Steps:\n• Verify Ollama service status\n• Check ${selectedModel} model availability\n• Validate system configuration\n\nTechnical Details: ${error.message}`;
        await addMessageWithTyping(errorMessage, 'assistant');
        updateSystemStatus('System Failure', 'error');
    } finally {
        setProcessingState(false);
        currentRequest = null; // Clear current request
        clearImagePreview(); // Clear image after sending
        questionInput.focus();
    }
}

/**
 * Configure UI processing state
 */
function setProcessingState(processing) {
    isProcessing = processing;
    sendButton.disabled = processing;
    questionInput.disabled = processing;
    
    if (processing) {
        sendButtonText.classList.add('hidden');
        sendButtonSpinner.classList.remove('hidden');
        stopButton.classList.remove('hidden'); // Show stop button
        questionInput.style.opacity = '0.5';
    } else {
        sendButtonText.classList.remove('hidden');
        sendButtonSpinner.classList.add('hidden');
        stopButton.classList.add('hidden'); // Hide stop button
        questionInput.style.opacity = '1';
    }
    
    // Disable quick action buttons during processing
    quickButtons.forEach(button => {
        button.disabled = processing;
    });
}

/**
 * Add message to chat interface
 */
function addMessage(text, sender, sources = null, metadata = null, elapsedTime = null, systemStats = null, confidence = null, confidenceLevel = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    // Add confidence class for visual effects
    if (sender === 'assistant' && confidenceLevel) {
        const className = `confidence-${confidenceLevel}`;
        messageDiv.classList.add(className);
        console.log(`💡 Applied confidence class: ${className} (${confidence}%)`);
    }
    
    // Create message avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    if (sender === 'user') {
        avatar.innerHTML = '<div class="user-icon"></div>';
    } else {
        avatar.innerHTML = '<div class="avatar-ai"></div>';
    }
    
    // Create message content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Create message text
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Format message text
    const formattedText = formatMessageText(text);
    textDiv.innerHTML = formattedText;
    
    contentDiv.appendChild(textDiv);
    
    // Add technical sources if available
    if (sources && sources.length > 0) {
        const sourcesDiv = createTechnicalSources(sources, metadata, elapsedTime, systemStats, confidence);
        contentDiv.appendChild(sourcesDiv);
    }
    
    // Assemble message
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat with smooth animation
    chatMessages.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'smooth'
    });
    
    return messageDiv;
}

/**
 * Add message with professional typing effect
 */
async function addMessageWithTyping(text, sender, sources = null, metadata = null, elapsedTime = null, systemStats = null, confidence = null, confidenceLevel = null) {
    const messageDiv = addMessage('', sender, null, null, null, null, confidence, confidenceLevel);
    const textDiv = messageDiv.querySelector('.message-text');
    
    // Professional typing simulation
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        textDiv.innerHTML = formatMessageText(currentText);
        
        // Typing delay for natural effect
        if (i < words.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 15));
        }
    }
    
            // Add technical sources after typing complete
        if (sources && sources.length > 0) {
            const contentDiv = messageDiv.querySelector('.message-content');
            const sourcesDiv = createTechnicalSources(sources, metadata, elapsedTime, systemStats, confidence);
            contentDiv.appendChild(sourcesDiv);
        }
}

/**
 * Create technical reference sources display
 */
function createTechnicalSources(sources, metadata, elapsedTime = null, systemStats = null, confidence = null) {
    const sourcesDiv = document.createElement('div');
    sourcesDiv.className = 'sources';
    
    const sourcesTitle = document.createElement('h4');
    sourcesTitle.textContent = 'Technical Reference Sources';
    sourcesDiv.appendChild(sourcesTitle);
    
    sources.forEach((source, index) => {
        const sourceItem = document.createElement('div');
        sourceItem.className = 'source-item';
        sourceItem.textContent = `[${index + 1}] ${source.id} - Relevance: ${(source.similarity * 100).toFixed(1)}%`;
        sourcesDiv.appendChild(sourceItem);
    });
    
    // Add metadata information with confidence score
    if (metadata) {
        const metaItem = document.createElement('div');
        metaItem.className = 'source-item';
        
        // Use the confidence score if available, otherwise fall back to top_similarity
        const confidenceScore = confidence !== null ? confidence : (metadata.confidence_score || (metadata.top_similarity * 100));
        let metaText = `Response Confidence: ${confidenceScore}% | Knowledge Base Coverage: ${metadata.relevant_chunks_used}/${metadata.total_chunks_searched} segments`;
        
        // Add elapsed time if available
        if (elapsedTime) {
            const timeFormatted = (elapsedTime / 1000).toFixed(2);
            metaText += ` | Processing Time: ${timeFormatted}s`;
        }
        
        metaItem.textContent = metaText;
        sourcesDiv.appendChild(metaItem);
    }
    
    // Add system performance statistics
    if (systemStats) {
        const perfItem = document.createElement('div');
        perfItem.className = 'source-item performance-stats';
        
        let perfText = `Performance: CPU ${systemStats.cpu.average.toFixed(1)}% avg (${systemStats.cpu.max.toFixed(1)}% peak)`;
        perfText += ` | Memory ${systemStats.memory.average.toFixed(1)}% avg`;
        
        if (systemStats.gpu) {
            if (systemStats.gpu.source) {
                perfText += ` | GPU: ${systemStats.gpu.source} (${systemStats.gpu.average.toFixed(1)}% usage)`;
            } else {
                perfText += ` | GPU ${systemStats.gpu.average.toFixed(1)}% avg (${systemStats.gpu.max.toFixed(1)}% peak)`;
            }
        } else {
            perfText += ` | GPU: Not detected`;
        }
        
        perfItem.textContent = perfText;
        sourcesDiv.appendChild(perfItem);
    }
    
    return sourcesDiv;
}

/**
 * Format message text for technical display
 */
function formatMessageText(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/(\d+\.\s)/g, '<br>$1'); // Format numbered lists
}

/**
 * Log system events for debugging
 */
function logSystemEvent(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] System: ${message}`);
}

// Professional keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R to reset interface
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        logSystemEvent('Interface reset requested');
    }
    
    // Escape to cancel processing
    if (e.key === 'Escape' && isProcessing) {
        logSystemEvent('Processing cancellation requested');
    }
});

/**
 * Handle image paste functionality
 */
function handleImagePaste(e) {
    if (!e.clipboardData || !e.clipboardData.files) return;
    
    const files = Array.from(e.clipboardData.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
        e.preventDefault();
        logSystemEvent('Image pasted: ' + imageFile.name + ' (' + imageFile.type + ')');
        
        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Data = event.target.result.split(',')[1]; // Remove data URL prefix
            currentImage = base64Data;
            showImagePreview(event.target.result, imageFile.name);
            
            // Auto-select vision model when image is pasted
            autoSelectVisionModel();
        };
        reader.readAsDataURL(imageFile);
    }
}

/**
 * Display image preview in the input area
 */
function showImagePreview(imageSrc, filename) {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.innerHTML = `
        <div class="image-preview-header">
            <span>📷 Image: ${filename}</span>
            <button class="remove-image-btn" onclick="clearImagePreview()">Remove</button>
        </div>
        <img src="${imageSrc}" alt="Pasted image preview">
    `;
    imagePreview.classList.remove('hidden');
}

/**
 * Clear image preview and reset current image
 */
function clearImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    currentImage = null;
    
    // Revert to previous model if we auto-switched
    const modelSelect = document.getElementById('modelSelect');
    const previousModel = modelSelect.getAttribute('data-previous-model');
    
    if (previousModel) {
        modelSelect.value = previousModel;
        modelSelect.removeAttribute('data-previous-model');
        showSystemMessage(`🔄 Reverted to previous model: ${previousModel}`);
        logSystemEvent(`Reverted to previous model: ${previousModel}`);
    }
    
    logSystemEvent('Image preview cleared');
}

/**
 * Auto-select vision model when image is detected
 */
function autoSelectVisionModel() {
    const modelSelect = document.getElementById('modelSelect');
    const currentModel = modelSelect.value;
    
    // List of vision-capable models (in order of speed preference)
    const visionModels = ['moondream', 'llava:7b', 'llava:13b', 'llava:latest', 'bakllava'];
    
    // Check if current model already supports vision
    const currentSupportsVision = visionModels.some(vm => 
        currentModel.toLowerCase().includes(vm.split(':')[0])
    );
    
    if (!currentSupportsVision) {
        // Try to find a vision model in the dropdown
        const options = Array.from(modelSelect.options);
        const visionOption = options.find(option => 
            visionModels.some(vm => option.value.toLowerCase().includes(vm.split(':')[0]))
        );
        
        if (visionOption) {
            // Store the previous model for easy switching back
            modelSelect.setAttribute('data-previous-model', currentModel);
            modelSelect.value = visionOption.value;
            
            showSystemMessage(`🖼️ Auto-switched to vision model: ${visionOption.text}`);
            logSystemEvent(`Auto-selected vision model: ${visionOption.value} (was: ${currentModel})`);
        } else {
            showSystemMessage(`⚠️ Image detected but no vision model available. Install "llava" model: ollama pull llava`);
            logSystemEvent('Warning: Image pasted but no vision model available');
        }
    } else {
        showSystemMessage(`🖼️ Image ready for analysis with ${currentModel}`);
        logSystemEvent(`Image ready for analysis with current vision model: ${currentModel}`);
    }
}

// Prevent file drag and drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ========== DOCUMENT MANAGER FUNCTIONALITY ==========

let documentManagerInitialized = false;
let isUsingGitHubDocuments = false;

/**
 * Check document source and update UI accordingly
 */
async function checkDocumentSource() {
    try {
        const result = await window.electronAPI.getDocumentSource();
        
        if (result.success) {
            isUsingGitHubDocuments = result.isUsingGitHub;
            
            // Update sidebar header with source information
            const sidebarHeader = document.querySelector('.sidebar-header h3');
            if (isUsingGitHubDocuments) {
                sidebarHeader.innerHTML = 'Document Manager<br><small style="font-size: 10px; color: #00ff88;">📡 GitHub Repository</small>';
                
                // Disable document management functions
                disableDocumentManager();
                
                // Add GitHub refresh button
                addGitHubRefreshButton();
                
                logSystemEvent('Using GitHub documents - document manager disabled');
            } else {
                sidebarHeader.innerHTML = 'Document Manager<br><small style="font-size: 10px; color: #ffaa00;">💾 Local Documents</small>';
                logSystemEvent('Using local documents - document manager enabled');
            }
            
            // Update status bar
            updateDocumentSourceStatus(result.source);
        }
    } catch (error) {
        console.error('Error checking document source:', error);
    }
}

/**
 * Disable document manager controls when using GitHub
 */
function disableDocumentManager() {
    const addDocBtn = document.getElementById('addDocBtn');
    const openFolderBtn = document.getElementById('openFolderBtn');
    
    if (addDocBtn) {
        addDocBtn.disabled = true;
        addDocBtn.innerHTML = '<div class="btn-icon add"></div><span>GitHub Managed</span>';
        addDocBtn.title = 'Documents are automatically synced from GitHub repository';
    }
    
    if (openFolderBtn) {
        openFolderBtn.disabled = true;
        openFolderBtn.innerHTML = '<div class="btn-icon folder"></div><span>View on GitHub</span>';
        openFolderBtn.title = 'Documents are managed on GitHub repository';
    }
    
    // Hide remove buttons from document list
    const style = document.createElement('style');
    style.textContent = '.doc-remove { display: none !important; }';
    document.head.appendChild(style);
}

/**
 * Add GitHub refresh button
 */
function addGitHubRefreshButton() {
    const docActions = document.querySelector('.doc-actions');
    
    // Check if button already exists
    if (document.getElementById('githubRefreshBtn')) return;
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'action-btn success';
    refreshBtn.id = 'githubRefreshBtn';
    refreshBtn.innerHTML = '<div class="btn-icon refresh"></div><span>Sync GitHub</span>';
    refreshBtn.title = 'Refresh documents from GitHub repository';
    
    refreshBtn.addEventListener('click', handleGitHubRefresh);
    
    // Insert after reindex button
    const reindexBtn = document.getElementById('reindexBtn');
    reindexBtn.parentNode.insertBefore(refreshBtn, reindexBtn.nextSibling);
}

/**
 * Handle GitHub refresh
 */
async function handleGitHubRefresh() {
    const refreshBtn = document.getElementById('githubRefreshBtn');
    const originalHTML = refreshBtn.innerHTML;
    
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<div class="btn-icon refresh"></div><span>Syncing...</span>';
    
    try {
        logSystemEvent('Syncing documents from GitHub...');
        const result = await window.electronAPI.refreshGitHubDocuments();
        
        if (result.success) {
            await loadDocumentsList();
            showSystemMessage(result.message);
            logSystemEvent(`GitHub sync completed: ${result.downloadedCount} processed, ${result.conflictsResolved} conflicts resolved`);
            
            if (result.requiresReindex) {
                showSystemMessage('Document index will be rebuilt automatically.');
            }
            
            if (result.conflictsResolved > 0) {
                showSystemMessage(`Note: ${result.conflictsResolved} document conflicts were resolved. Check your documents folder for any backup files.`);
            }
        } else {
            showSystemMessage('Failed to sync from GitHub: ' + result.message);
        }
    } catch (error) {
        console.error('Error syncing GitHub documents:', error);
        showSystemMessage('Error syncing GitHub documents: ' + error.message);
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = originalHTML;
    }
}

/**
 * Update document source status in the status bar
 */
function updateDocumentSourceStatus(source) {
    const docIcon = document.querySelector('.status-item .status-icon');
    if (docIcon && docIcon.textContent === 'DOC') {
        const docSourceSpan = docIcon.nextElementSibling.nextElementSibling;
        if (docSourceSpan) {
            docSourceSpan.title = `Document Source: ${source}`;
        }
    }
}

/**
 * Initialize document manager functionality
 */
async function initializeDocumentManager() {
    if (documentManagerInitialized) return;
    
    logSystemEvent('Initializing document manager...');
    
    // First check document source
    await checkDocumentSource();
    
    // Setup sidebar toggle
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        logSystemEvent('Sidebar toggled');
    });
    
    // Setup document action buttons
    const addDocBtn = document.getElementById('addDocBtn');
    const refreshDocsBtn = document.getElementById('refreshDocsBtn');
    const reindexBtn = document.getElementById('reindexBtn');
    const fileInput = document.getElementById('fileInput');
    
    // Add documents functionality
    addDocBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileSelection);
    
    // Refresh documents list
    refreshDocsBtn.addEventListener('click', loadDocumentsList);
    
    // Open documents folder
    const openFolderBtn = document.getElementById('openFolderBtn');
    openFolderBtn.addEventListener('click', handleOpenDocumentsFolder);
    
    // Rebuild index
    reindexBtn.addEventListener('click', handleReindexDocuments);
    
    // Load initial documents list
    await loadDocumentsList();
    
    documentManagerInitialized = true;
    logSystemEvent('Document manager initialized successfully');
}

/**
 * Handle file selection for adding documents
 */
async function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    logSystemEvent(`Selected ${files.length} file(s) for upload`);
    
    // Disable add button during upload
    const addDocBtn = document.getElementById('addDocBtn');
    addDocBtn.disabled = true;
    addDocBtn.innerHTML = '<div class="btn-icon add"></div><span>Uploading...</span>';
    
    try {
        for (const file of files) {
            await uploadDocument(file);
        }
        
        // Refresh the documents list after successful uploads
        await loadDocumentsList();
        showSystemMessage('Documents uploaded successfully. The system will rebuild the index automatically.');
        
    } catch (error) {
        console.error('Error uploading documents:', error);
        showSystemMessage('Error uploading documents: ' + error.message);
    } finally {
        // Re-enable add button
        addDocBtn.disabled = false;
        addDocBtn.innerHTML = '<div class="btn-icon add"></div><span>Add Documents</span>';
        
        // Clear file input
        event.target.value = '';
    }
}

/**
 * Upload a single document to the server
 */
async function uploadDocument(file) {
    const formData = new FormData();
    formData.append('document', file);
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const result = await window.electronAPI.uploadDocument({
                    name: file.name,
                    content: e.target.result,
                    size: file.size,
                    type: file.type
                });
                
                if (result.success) {
                    logSystemEvent(`Successfully uploaded: ${file.name}`);
                    resolve(result);
                } else {
                    reject(new Error(result.error || 'Upload failed'));
                }
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Load and display the documents list
 */
async function loadDocumentsList() {
    const docItems = document.getElementById('docItems');
    const docCount = document.getElementById('docCount');
    const chunkCount = document.getElementById('chunkCount');
    const documentCount = document.getElementById('documentCount'); // Bottom status bar
    
    // Show loading state
    docItems.innerHTML = '<div class="loading-indicator">Loading documents...</div>';
    docCount.textContent = 'Loading...';
    chunkCount.textContent = 'Loading...';
    documentCount.textContent = 'Loading...';
    
    try {
        const result = await window.electronAPI.getDocuments();
        
        if (result.success) {
            displayDocumentsList(result.documents);
            
            // Update status counters
            docCount.textContent = result.documents.length;
            chunkCount.textContent = result.totalChunks || 'N/A';
            
            // Update bottom status bar
            const docText = result.documents.length === 1 ? 'document' : 'documents';
            documentCount.textContent = `${result.documents.length} ${docText}`;
            
            logSystemEvent(`Loaded ${result.documents.length} documents`);
        } else {
            throw new Error(result.error || 'Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        docItems.innerHTML = '<div class="error-indicator">Error loading documents</div>';
        docCount.textContent = 'Error';
        chunkCount.textContent = 'Error';
        documentCount.textContent = '0 documents';
    }
}

/**
 * Display the documents list in the UI
 */
function displayDocumentsList(documents) {
    const docItems = document.getElementById('docItems');
    
    if (documents.length === 0) {
        docItems.innerHTML = '<div class="loading-indicator">No documents found</div>';
        return;
    }
    
    const documentsHtml = documents.map(doc => `
        <div class="doc-item" data-filename="${doc.name}">
            <div class="doc-item-header">
                <div class="doc-name">${doc.name}</div>
                <button class="doc-remove" onclick="removeDocument('${doc.name}')" title="Remove document">×</button>
            </div>
            <div class="doc-meta">
                <span class="doc-size">${formatFileSize(doc.size)}</span>
                <span class="doc-chunks">${doc.chunks || 0} chunks</span>
            </div>
        </div>
    `).join('');
    
    docItems.innerHTML = documentsHtml;
}

/**
 * Remove a document from the system
 */
async function removeDocument(filename) {
    if (!confirm(`Are you sure you want to remove "${filename}"? This action cannot be undone.`)) {
        return;
    }
    
    logSystemEvent(`Removing document: ${filename}`);
    
    try {
        const result = await window.electronAPI.removeDocument(filename);
        
        if (result.success) {
            await loadDocumentsList(); // This will now update both sidebar and status bar
            showSystemMessage(`Document "${filename}" removed successfully.`);
            logSystemEvent(`Successfully removed: ${filename}`);
        } else {
            throw new Error(result.error || 'Failed to remove document');
        }
    } catch (error) {
        console.error('Error removing document:', error);
        showSystemMessage('Error removing document: ' + error.message);
    }
}

// Make removeDocument globally accessible for onclick handlers
window.removeDocument = removeDocument;

/**
 * Handle opening documents folder
 */
async function handleOpenDocumentsFolder() {
    try {
        logSystemEvent('Opening documents folder...');
        const result = await window.electronAPI.openDocumentsFolder();
        
        if (result.success) {
            logSystemEvent('Documents folder opened successfully');
        } else {
            throw new Error(result.error || 'Failed to open folder');
        }
    } catch (error) {
        console.error('Error opening documents folder:', error);
        showSystemMessage('Error opening documents folder: ' + error.message);
    }
}

/**
 * Handle reindexing documents
 */
async function handleReindexDocuments() {
    if (!confirm('Reindexing will rebuild the entire search index. This may take a few minutes. Continue?')) {
        return;
    }
    
    const reindexBtn = document.getElementById('reindexBtn');
    const originalText = reindexBtn.innerHTML;
    
    // Disable button and show progress
    reindexBtn.disabled = true;
    reindexBtn.innerHTML = '<div class="btn-icon reindex"></div><span>Reindexing...</span>';
    
    logSystemEvent('Starting document reindexing...');
    
    try {
        const result = await window.electronAPI.reindexDocuments();
        
        if (result.success) {
            await loadDocumentsList();
            showSystemMessage('Document index rebuilt successfully. System is ready for queries.');
            logSystemEvent('Reindexing completed successfully');
        } else {
            throw new Error(result.error || 'Reindexing failed');
        }
    } catch (error) {
        console.error('Error reindexing documents:', error);
        showSystemMessage('Error reindexing documents: ' + error.message);
    } finally {
        // Re-enable button
        reindexBtn.disabled = false;
        reindexBtn.innerHTML = originalText;
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Initialize document manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all other initialization is complete
    setTimeout(initializeDocumentManager, 500);
});

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addMessage,
        setProcessingState,
        updateSystemStatus,
        initializeDocumentManager,
        loadDocumentsList
    };
}

/**
 * Handle stopping/canceling the current AI request
 */
async function handleStopMessage() {
    if (!isProcessing || !currentRequest) {
        return;
    }
    
    try {
        logSystemEvent('User requested to stop current query');
        
        // Cancel the current request through IPC
        await window.electronAPI.stopCurrentRequest();
        
        // Show cancellation message
        await addMessageWithTyping('Request canceled by user.', 'assistant');
        
        updateSystemStatus('Request Canceled', 'ready');
        logSystemEvent('Current query successfully canceled');
        
    } catch (error) {
        logSystemEvent('Error stopping request: ' + error.message);
        await addMessageWithTyping('Error canceling request: ' + error.message, 'assistant');
        updateSystemStatus('Cancel Error', 'error');
    } finally {
        setProcessingState(false);
        currentRequest = null;
        questionInput.focus();
    }
} 