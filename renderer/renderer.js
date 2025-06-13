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
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const status = document.getElementById('status');
const quickButtons = document.querySelectorAll('.quick-btn');

// System state management
let isProcessing = false;
let messageHistory = [];
let systemStartTime = new Date();

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
    
    // Log user interaction
    messageHistory.push({ 
        type: 'user', 
        content: question, 
        timestamp: new Date(),
        sessionTime: (new Date() - systemStartTime) / 1000
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
        logSystemEvent('Processing user query: ' + question.substring(0, 50) + '...');
        const result = await window.electronAPI.askQuestion(question);
        
        if (result.success) {
            // Log successful response
            messageHistory.push({
                type: 'assistant',
                content: result.answer,
                sources: result.sources,
                metadata: result.metadata,
                timestamp: new Date(),
                sessionTime: (new Date() - systemStartTime) / 1000
            });
            
            // Display AI response with typing animation
            await addMessageWithTyping(result.answer, 'assistant', result.sources, result.metadata);
            updateSystemStatus('System Ready', 'ready');
            logSystemEvent('Query processed successfully');
        } else {
            // Handle processing errors
            const errorMessage = `System Error: Unable to process query.\n\nError Details: ${result.error}\n\nRequired System Components:\n• Ollama service running\n• Phi3:mini model installed\n• Document embeddings configured`;
            await addMessageWithTyping(errorMessage, 'assistant');
            updateSystemStatus('Processing Error', 'error');
            logSystemEvent('Query processing failed: ' + result.error);
        }
        
    } catch (error) {
        logSystemEvent('System error: ' + error.message);
        const errorMessage = `Critical System Error: Backend communication failure.\n\nTroubleshooting Steps:\n• Verify Ollama service status\n• Check model availability\n• Validate system configuration\n\nTechnical Details: ${error.message}`;
        await addMessageWithTyping(errorMessage, 'assistant');
        updateSystemStatus('System Failure', 'error');
    } finally {
        setProcessingState(false);
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
        questionInput.style.opacity = '0.5';
    } else {
        sendButtonText.classList.remove('hidden');
        sendButtonSpinner.classList.add('hidden');
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
function addMessage(text, sender, sources = null, metadata = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
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
        const sourcesDiv = createTechnicalSources(sources, metadata);
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
async function addMessageWithTyping(text, sender, sources = null, metadata = null) {
    const messageDiv = addMessage('', sender);
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
        const sourcesDiv = createTechnicalSources(sources, metadata);
        contentDiv.appendChild(sourcesDiv);
    }
}

/**
 * Create technical reference sources display
 */
function createTechnicalSources(sources, metadata) {
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
    
    // Add metadata information
    if (metadata) {
        const metaItem = document.createElement('div');
        metaItem.className = 'source-item';
        metaItem.textContent = `System Confidence: ${(metadata.top_similarity * 100).toFixed(1)}% | Knowledge Base Coverage: ${metadata.relevant_chunks_used}/${metadata.total_chunks_searched} segments`;
        sourcesDiv.appendChild(metaItem);
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

// Prevent file drag and drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addMessage,
        setProcessingState,
        updateSystemStatus
    };
} 