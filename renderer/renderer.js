// Renderer process JavaScript
// This file will contain the client-side logic for the application

console.log('Industrial AI Assistant renderer loaded successfully!'); 

// Industrial Automation AI Assistant - Frontend JavaScript
// This handles the user interface and connects to the RAG backend

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const questionInput = document.getElementById('questionInput');
const sendButton = document.getElementById('sendButton');
const sendButtonText = document.getElementById('sendButtonText');
const sendButtonSpinner = document.getElementById('sendButtonSpinner');
const statusText = document.getElementById('statusText');
const statusIndicator = document.getElementById('statusIndicator');
const quickButtons = document.querySelectorAll('.quick-btn');

// State management
let isProcessing = false;

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Industrial AI Assistant UI loaded');
    
    // Set up event listeners
    setupEventListeners();
    
    // Check if the backend is ready
    checkBackendStatus();
});

/**
 * Set up all event listeners for the UI
 */
function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', handleSendMessage);
    
    // Enter key to send message (Ctrl+Enter for new line)
    questionInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
    
    // Quick question buttons
    quickButtons.forEach(button => {
        button.addEventListener('click', () => {
            const question = button.getAttribute('data-question');
            questionInput.value = question;
            handleSendMessage();
        });
    });
    
    // Auto-resize textarea
    questionInput.addEventListener('input', () => {
        questionInput.style.height = 'auto';
        questionInput.style.height = Math.min(questionInput.scrollHeight, 150) + 'px';
    });
}

/**
 * Check if the backend RAG system is ready
 */
async function checkBackendStatus() {
    try {
        // Try to call the backend to see if it's working
        const testResult = await window.electronAPI.testBackend();
        
        if (testResult.success) {
            updateStatus('Ready', 'ready');
            console.log('✅ Backend RAG system is ready');
        } else {
            updateStatus('Backend Error', 'error');
            console.error('❌ Backend not ready:', testResult.error);
        }
    } catch (error) {
        updateStatus('Connection Error', 'error');
        console.error('❌ Failed to check backend status:', error);
    }
}

/**
 * Update the status indicator
 */
function updateStatus(text, status) {
    statusText.textContent = text;
    statusIndicator.className = 'status-indicator';
    
    if (status === 'ready') {
        statusIndicator.style.background = '#2ecc71';
    } else if (status === 'processing') {
        statusIndicator.style.background = '#f39c12';
    } else if (status === 'error') {
        statusIndicator.style.background = '#e74c3c';
    }
}

/**
 * Handle sending a message
 */
async function handleSendMessage() {
    const question = questionInput.value.trim();
    
    if (!question || isProcessing) {
        return;
    }
    
    // Clear input and disable UI
    questionInput.value = '';
    setProcessingState(true);
    
    // Add user message to chat
    addMessage(question, 'user');
    
    // Update status
    updateStatus('Processing...', 'processing');
    
    try {
        // Call the RAG backend through Electron's main process
        console.log('🔍 Sending question to RAG backend:', question);
        const result = await window.electronAPI.askQuestion(question);
        
        if (result.success) {
            // Add AI response to chat
            addMessage(result.answer, 'assistant', result.sources, result.metadata);
            updateStatus('Ready', 'ready');
            console.log('✅ Got answer from RAG backend');
        } else {
            // Handle error
            addMessage(
                `❌ Sorry, I encountered an error: ${result.error}\n\nPlease make sure Ollama is running and try again.`,
                'assistant'
            );
            updateStatus('Error', 'error');
            console.error('❌ RAG backend error:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Frontend error:', error);
        addMessage(
            `❌ Sorry, I couldn't process your question. Please check that:\n\n` +
            `• Ollama is running (ollama serve)\n` +
            `• The phi3:mini model is available (ollama pull phi3:mini)\n` +
            `• Your embeddings are processed from Phase 2\n\n` +
            `Error: ${error.message}`,
            'assistant'
        );
        updateStatus('Error', 'error');
    } finally {
        setProcessingState(false);
    }
}

/**
 * Set the processing state of the UI
 */
function setProcessingState(processing) {
    isProcessing = processing;
    sendButton.disabled = processing;
    questionInput.disabled = processing;
    
    if (processing) {
        sendButtonText.classList.add('hidden');
        sendButtonSpinner.classList.remove('hidden');
    } else {
        sendButtonText.classList.remove('hidden');
        sendButtonSpinner.classList.add('hidden');
    }
    
    // Disable quick buttons during processing
    quickButtons.forEach(button => {
        button.disabled = processing;
    });
}

/**
 * Add a message to the chat
 */
function addMessage(text, sender, sources = null, metadata = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    // Create avatar
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    // Create content container
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Create message text
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Format text (preserve line breaks)
    const formattedText = text.replace(/\n/g, '<br>');
    textDiv.innerHTML = formattedText;
    
    contentDiv.appendChild(textDiv);
    
    // Add sources if provided (for AI responses)
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        
        const sourcesTitle = document.createElement('h4');
        sourcesTitle.textContent = 'Sources Used:';
        sourcesDiv.appendChild(sourcesTitle);
        
        sources.forEach((source, index) => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = `${index + 1}. ${source.id} (${(source.similarity * 100).toFixed(1)}% relevance)`;
            sourcesDiv.appendChild(sourceItem);
        });
        
        // Add metadata if available
        if (metadata) {
            const metaItem = document.createElement('div');
            metaItem.className = 'source-item';
            metaItem.textContent = `Quality: ${(metadata.top_similarity * 100).toFixed(1)}% • Chunks: ${metadata.relevant_chunks_used}/${metadata.total_chunks_searched}`;
            sourcesDiv.appendChild(metaItem);
        }
        
        contentDiv.appendChild(sourcesDiv);
    }
    
    // Assemble message
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    // Add to chat
    chatMessages.appendChild(messageDiv);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

/**
 * Format text for display (helper function)
 */
function formatText(text) {
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        addMessage,
        setProcessingState,
        updateStatus
    };
} 