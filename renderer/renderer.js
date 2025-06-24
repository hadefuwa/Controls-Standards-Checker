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

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const sidebarToggleMain = document.getElementById('sidebarToggleMain');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');

// Quick questions toggle
const quickToggle = document.getElementById('quickToggle');
const quickQuestions = document.getElementById('quickQuestions');
const quickContent = document.getElementById('quickContent');

// New feature elements
const searchChatBtn = document.getElementById('searchChatBtn');
const exportChatBtn = document.getElementById('exportChatBtn');
const bookmarksBtn = document.getElementById('bookmarksBtn');
const searchContainer = document.getElementById('searchContainer');
const searchInput = document.getElementById('searchInput');
const searchClose = document.getElementById('searchClose');
const bookmarksModal = document.getElementById('bookmarksModal');
const bookmarksModalClose = document.getElementById('bookmarksModalClose');
const exportModal = document.getElementById('exportModal');
const exportModalClose = document.getElementById('exportModalClose');
const exportCancelBtn = document.getElementById('exportCancelBtn');
const exportConfirmBtn = document.getElementById('exportConfirmBtn');
const bookmarksList = document.getElementById('bookmarksList');

// System state management
let isProcessing = false;
let currentRequest = null; // Track current request to allow cancellation
let messageHistory = [];
let systemStartTime = new Date();
let currentImage = null; // Store current pasted image


// Splash screen management
let splashScreen = null;
let loadingText = null;

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    console.log('System: Engineering Interface Ready');
    
    // Initialize splash screen
    initializeSplashScreen();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize UI components
    initializeUIComponents();
    
    // Check backend system status and load documents
    initializeApplication();
    
    // Log system initialization
    logSystemEvent('Interface initialized successfully');
});

/**
 * Initialize splash screen elements
 */
function initializeSplashScreen() {
    splashScreen = document.getElementById('splashScreen');
    loadingText = document.getElementById('loadingText');
    
    // Show splash screen
    showSplashScreen();
}

/**
 * Show splash screen with loading message
 */
function showSplashScreen() {
    if (splashScreen) {
        splashScreen.style.display = 'flex';
        updateSplashMessage('Initializing system...');
    }
}

/**
 * Update splash screen loading message
 */
function updateSplashMessage(message) {
    if (loadingText) {
        loadingText.textContent = message;
    }
}

/**
 * Hide splash screen with fade animation
 */
function hideSplashScreen() {
    if (splashScreen) {
        updateSplashMessage('Ready!');
        
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
            
            // Remove splash screen after fade animation
            setTimeout(() => {
                splashScreen.style.display = 'none';
                
                // Enable inputs now that app is ready
                questionInput.disabled = false;
                sendButton.disabled = false;
                
                // Set initial focus to input after splash is hidden
                questionInput.focus();
                
                logSystemEvent('Splash screen hidden - application ready');
            }, 500);
        }, 800);
    }
}

/**
 * Initialize application systems
 */
async function initializeApplication() {
    try {
        // Update splash message
        updateSplashMessage('Connecting to backend...');
        
        // Check backend system status
        await checkBackendStatus();
        
        // Update splash message
        updateSplashMessage('Loading documents...');
        
        // Initialize document manager
        await initializeDocumentManager();
        
        // Update splash message
        updateSplashMessage('Finalizing setup...');
        
        // Small delay to show final message
        setTimeout(() => {
            hideSplashScreen();
        }, 1000);
        
    } catch (error) {
        console.error('Application initialization error:', error);
        updateSplashMessage('Error loading application');
        
        // Still hide splash screen even on error
        setTimeout(() => {
            hideSplashScreen();
        }, 2000);
    }
}

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
    
    // Sidebar toggle functionality
    sidebarToggleMain.addEventListener('click', toggleSidebar);
    sidebarClose.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    
    // Quick questions toggle
    quickToggle.addEventListener('click', toggleQuickQuestions);
    
    // New feature event listeners
    if (searchChatBtn) searchChatBtn.addEventListener('click', toggleSearch);
    if (exportChatBtn) exportChatBtn.addEventListener('click', showExportModal);
    if (bookmarksBtn) bookmarksBtn.addEventListener('click', showBookmarksModal);
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    
    // Header bookmarks button (always accessible)
    const headerBookmarksBtn = document.getElementById('headerBookmarksBtn');
    if (headerBookmarksBtn) headerBookmarksBtn.addEventListener('click', showBookmarksModal);
    if (searchInput) searchInput.addEventListener('input', performSearch);
    
    // Modal event listeners
    if (bookmarksModalClose) bookmarksModalClose.addEventListener('click', closeBookmarksModal);
    if (exportModalClose) exportModalClose.addEventListener('click', closeExportModal);
    if (exportCancelBtn) exportCancelBtn.addEventListener('click', closeExportModal);
    if (exportConfirmBtn) exportConfirmBtn.addEventListener('click', handleExportChat);
    
    // Close modals when clicking outside
    if (bookmarksModal) {
        bookmarksModal.addEventListener('click', (e) => {
            if (e.target === bookmarksModal) closeBookmarksModal();
        });
    }
    if (exportModal) {
        exportModal.addEventListener('click', (e) => {
            if (e.target === exportModal) closeExportModal();
        });
    }
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
            
            // Update model info display with actual model from LM Studio
            updateCurrentModelDisplay(testResult.modelInfo || testResult.model || 'LM Studio (GPU Accelerated)');
        } else {
            updateSystemStatus('System Error', 'error');
            logSystemEvent('Backend system failure: ' + testResult.error);
            showSystemMessage('System Warning: Backend service unavailable. Verify LM Studio installation and configuration.');
            
            // Update model info to show error
            updateCurrentModelDisplay('Connection Failed');
        }
    } catch (error) {
        updateSystemStatus('Connection Failed', 'error');
        logSystemEvent('System connection error: ' + error.message);
        showSystemMessage('System Error: Unable to establish backend connection. Check LM Studio configuration.');
        
        // Update model info to show error
        updateCurrentModelDisplay('Connection Failed');
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
    
    // Use LM Studio model (we'll get this from backend)
    const selectedModel = 'lm-studio';
    
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
        
        // Auto-close sidebar on mobile after sending a message
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            closeSidebar();
        }
        
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
    
    // Add action buttons for assistant messages
    if (sender === 'assistant') {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        // Copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'action-btn-small';
        copyBtn.innerHTML = '<div class="btn-icon copy"></div><span>Copy</span>';
        copyBtn.onclick = () => copyMessage(text);
        actionsDiv.appendChild(copyBtn);
        
        // Bookmark button
        const bookmarkBtn = document.createElement('button');
        bookmarkBtn.className = 'action-btn-small';
        bookmarkBtn.innerHTML = '<div class="btn-icon bookmark"></div><span>Bookmark</span>';
        // Use a function that gets the current text content to ensure we capture the final text
        bookmarkBtn.onclick = () => {
            const currentText = messageDiv.querySelector('.message-text').textContent || text;
            bookmarkMessage(currentText, sources, confidence, confidenceLevel, metadata, elapsedTime, systemStats);
        };
        actionsDiv.appendChild(bookmarkBtn);
        
        contentDiv.appendChild(actionsDiv);
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
    
    // Check if this is a JSON response - if so, skip typing animation to avoid JSON parsing errors
    const isJsonResponse = text.trim().startsWith('{') && text.trim().endsWith('}') && text.length > 100;
    
    if (isJsonResponse) {
        // For JSON responses, show immediately without typing animation to avoid parsing errors
        console.log('📝 JSON response detected - showing immediately without typing animation');
        textDiv.innerHTML = formatMessageText(text);
    } else {
        // Professional typing simulation for non-JSON responses
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
    }
    
    // Add technical sources after typing complete
    if (sources && sources.length > 0) {
        const contentDiv = messageDiv.querySelector('.message-content');
        const sourcesDiv = createTechnicalSources(sources, metadata, elapsedTime, systemStats, confidence);
        contentDiv.appendChild(sourcesDiv);
    }
    
    // Update bookmark button with the final text after typing is complete
    if (sender === 'assistant') {
        const bookmarkBtn = messageDiv.querySelector('.action-btn-small:nth-child(2)'); // Second button is bookmark
        if (bookmarkBtn) {
            bookmarkBtn.onclick = () => bookmarkMessage(text, sources, confidence, confidenceLevel, metadata, elapsedTime, systemStats);
        }
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
    // Check if this is a response from a thinking model
    if (hasThinkingContent(text)) {
        return formatThinkingModelResponse(text);
    }
    
    // Regular formatting for non-thinking models
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/(\d+\.\s)/g, '<br>$1'); // Format numbered lists
}

/**
 * Check if response contains thinking content
 */
function hasThinkingContent(text) {
    // Don't process as thinking content if the text is too short (likely partial)
    if (text.length < 200) {
        return false;
    }
    
    // Don't process incomplete JSON as thinking content
    if (text.trim().startsWith('{') && !text.trim().endsWith('}')) {
        return false;
    }
    
    // Check for our structured format first (highest priority)
    if (/<THINKING>[\s\S]*?<\/THINKING>[\s\S]*?<ANSWER>[\s\S]*?<\/ANSWER>/i.test(text)) {
        return true;
    }
    
    // Check for JSON format with thinking and answer fields
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
        try {
            const parsed = JSON.parse(text);
            if (parsed.thinking && parsed.answer) {
                return true;
            }
        } catch (e) {
            // If JSON parsing fails, don't treat as thinking content
            return false;
        }
    }
    
    // Check for common thinking model patterns as fallback
    const thinkingPatterns = [
        // Standard thinking tags
        /<thinking>[\s\S]*?<\/thinking>/i,
        /<thought>[\s\S]*?<\/thought>/i,
        
        // Markdown-style thinking headers
        /\*\*Thinking:\*\*[\s\S]*?(?=\*\*Answer:\*\*|\*\*Response:\*\*|$)/i,
        /\*\*Reasoning:\*\*[\s\S]*?(?=\*\*Answer:\*\*|\*\*Response:\*\*|$)/i,
        
        // DeepSeek R1 patterns - responses that start with analysis (only for complete responses)
        text.length > 1000 && /^(Okay, let's|Let me|First, I|Looking at|The user|I need to|This question|Based on)[\s\S]*?(?=\n\n[A-Z]|\n\n\d+\.)/i.test(text),
        
        // Responses that contain reasoning followed by conclusion (only for longer responses)
        text.length > 800 && /(Based on the provided|Conclusion|Therefore|In summary)[\s\S]*?(?=\n\n|\n[A-Z])/i.test(text),
        
        // Long responses with internal reasoning (over 1500 chars with analysis keywords)
        text.length > 1500 && /(First, I|Looking at|The key point|I should|The user might|Let me|I need to check)/i.test(text)
    ];
    
    return thinkingPatterns.some(pattern => {
        if (typeof pattern === 'boolean') return pattern;
        return pattern.test && pattern.test(text);
    });
}

/**
 * Format response from thinking models with collapsible thinking section
 */
function formatThinkingModelResponse(text) {
    console.log('=== PROCESSING LLM RESPONSE ===');
    console.log('Full response text (first 300 chars):', text.substring(0, 300));
    console.log('Full response length:', text.length);
    
    let thinking = '';
    let answer = '';
    
    // First, try to parse as JSON (structured output)
    // Only try JSON parsing if the text looks like complete JSON
    if (text.trim().startsWith('{') && text.trim().endsWith('}') && text.length > 100) {
        try {
            const jsonResponse = JSON.parse(text);
            console.log('✅ Successfully parsed JSON response');
            
            if (jsonResponse.thinking && jsonResponse.answer) {
                console.log('✅ Found structured thinking and answer in JSON');
                console.log('Thinking length:', jsonResponse.thinking.length);
                console.log('Answer length:', jsonResponse.answer.length);
                
                thinking = jsonResponse.thinking.trim();
                answer = jsonResponse.answer.trim();
            } else {
                console.log('⚠️ JSON response missing thinking or answer fields');
                // If JSON is valid but missing expected fields, treat as plain text
                answer = text;
                thinking = '';
            }
        } catch (e) {
            console.log('❌ JSON parsing failed (likely incomplete stream), treating as plain text');
            // Don't spam the console with parsing errors during streaming
            answer = text;
            thinking = '';
        }
    } else {
        console.log('📝 Processing as plain text response');
        
        // Fallback to natural language detection
        const answerIndicators = [
            /\n\n(Based on|According to|The answer is|In summary|To conclude|Therefore)/i,
            /\n\n(Direct answer:|Answer:|Final answer:|Conclusion:)/i,
            /\n\n(Yes,|No,|It is|You can|You cannot|The requirement)/i,
            /\n\n(EN \d+|ISO \d+|IEC \d+|NFPA \d+)/i,
            /\n\n([A-Z][^.]*:)/i,
            /\n\n(\d+\.|•|-|\*)/i
        ];
        
        let bestSplit = -1;
        for (const indicator of answerIndicators) {
            const match = text.match(indicator);
            if (match) {
                const splitIndex = text.indexOf(match[0]);
                if (splitIndex > 200 && (bestSplit === -1 || splitIndex < bestSplit)) {
                    bestSplit = splitIndex;
                }
            }
        }
        
        if (bestSplit !== -1) {
            thinking = text.substring(0, bestSplit).trim();
            answer = text.substring(bestSplit + 2).trim();
            console.log('✅ Used natural language separation');
        } else {
            const paragraphs = text.split(/\n\s*\n/);
            if (paragraphs.length >= 4 && text.length > 800) {
                const midPoint = Math.floor(paragraphs.length / 2);
                thinking = paragraphs.slice(0, midPoint).join('\n\n').trim();
                answer = paragraphs.slice(midPoint).join('\n\n').trim();
                console.log('✅ Used paragraph-based separation');
            } else {
                answer = text;
                thinking = '';
                console.log('📝 Using full text as answer (no separation needed)');
            }
        }
    }
    
    // Format the answer part
    const formattedAnswer = answer
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/(\d+\.\s)/g, '<br>$1');
    
    // If there's no thinking content, just return the formatted answer
    if (!thinking) {
        return formattedAnswer;
    }
    
    // Format the thinking part
    const formattedThinking = thinking
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/(\d+\.\s)/g, '<br>$1');
    
    // Generate unique ID for this thinking section
    const thinkingId = 'thinking-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    // Create the collapsible thinking section
    return `
        <div class="thinking-response">
            <div class="answer-section">
                ${formattedAnswer}
            </div>
            <div class="thinking-toggle-container">
                <button class="thinking-toggle" onclick="toggleThinking('${thinkingId}')" title="Click to see the model's thinking process">
                    <span class="thinking-toggle-icon">🧠</span>
                    <span class="thinking-toggle-text">Click here to see model's thinking process</span>
                    <span class="thinking-toggle-arrow">▼</span>
                </button>
                <div class="thinking-content" id="${thinkingId}" style="display: none;">
                    <div class="thinking-header">
                        <span class="thinking-label">🤔 Model's Thinking Process:</span>
                    </div>
                    <div class="thinking-text">
                        ${formattedThinking}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Toggle thinking section visibility
 */
function toggleThinking(thinkingId) {
    const thinkingContent = document.getElementById(thinkingId);
    const toggleButton = thinkingContent.previousElementSibling;
    const arrow = toggleButton.querySelector('.thinking-toggle-arrow');
    const text = toggleButton.querySelector('.thinking-toggle-text');
    
    if (thinkingContent.style.display === 'none') {
        thinkingContent.style.display = 'block';
        arrow.textContent = '▲';
        text.textContent = 'Hide model\'s thinking process';
        toggleButton.classList.add('expanded');
    } else {
        thinkingContent.style.display = 'none';
        arrow.textContent = '▼';
        text.textContent = 'Click here to see model\'s thinking process';
        toggleButton.classList.remove('expanded');
    }
}

// Make toggleThinking globally accessible
window.toggleThinking = toggleThinking;

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
 * Clear image preview and reset image state
 */
function clearImagePreview() {
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.classList.add('hidden');
    imagePreview.innerHTML = '';
    currentImage = null;
    
    // Revert to previous model if we auto-switched (only if model selector exists)
    const modelSelect = document.getElementById('modelSelect');
    if (modelSelect) {
        const previousModel = modelSelect.getAttribute('data-previous-model');
        
        if (previousModel) {
            modelSelect.value = previousModel;
            modelSelect.removeAttribute('data-previous-model');
            showSystemMessage(`🔄 Reverted to previous model: ${previousModel}`);
            logSystemEvent(`Reverted to previous model: ${previousModel}`);
        }
    }
    
    logSystemEvent('Image preview cleared');
}

/**
 * Auto-select vision model when image is detected
 */
function autoSelectVisionModel() {
    const modelSelect = document.getElementById('modelSelect');
    
    // If no model selector exists (using LM Studio), just show a message
    if (!modelSelect) {
        showSystemMessage(`🖼️ Image ready for analysis with LM Studio model`);
        logSystemEvent(`Image ready for analysis with LM Studio model`);
        return;
    }
    
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
    
    // Sidebar is now handled by the main UI setup, skip this part
    
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
    // Show loading state
    docItems.innerHTML = '<div class="loading-indicator">Loading documents...</div>';
    docCount.textContent = 'Loading...';
    chunkCount.textContent = 'Loading...';
    
    try {
        const result = await window.electronAPI.getDocuments();
        
        if (result.success) {
            displayDocumentsList(result.documents);
            
            // Update status counters
            docCount.textContent = result.documents.length;
            chunkCount.textContent = result.totalChunks || 'N/A';
            
            logSystemEvent(`Loaded ${result.documents.length} documents`);
        } else {
            throw new Error(result.error || 'Failed to load documents');
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        docItems.innerHTML = '<div class="error-indicator">Error loading documents</div>';
        docCount.textContent = 'Error';
        chunkCount.textContent = 'Error';
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
                <div class="doc-actions">
                    <button class="doc-delete" onclick="deleteDocument('${doc.name}')" title="Delete document permanently">Delete</button>
                    <button class="doc-remove" onclick="removeDocument('${doc.name}')" title="Remove from index">×</button>
                </div>
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

// Document manager initialization is now handled by initializeUIComponents

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

/**
 * Update the current model display
 */
function updateCurrentModelDisplay(modelName) {
    const currentModelElement = document.getElementById('currentModel');
    if (currentModelElement) {
        currentModelElement.textContent = modelName;
    }
}

/**
 * Initialize UI components
 */
function initializeUIComponents() {
    // Disable input initially until splash screen is hidden
    questionInput.disabled = true;
    sendButton.disabled = true;
    
    // Set up responsive behavior
    setupResponsiveBehavior();
    
    // Initialize quick questions as collapsed on mobile
    if (window.innerWidth <= 768) {
        quickQuestions.classList.add('collapsed');
    }
}

/**
 * Toggle sidebar visibility
 */
function toggleSidebar() {
    sidebar.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    
    // Add some haptic feedback for mobile
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

/**
 * Close sidebar
 */
function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

/**
 * Toggle quick questions visibility
 */
function toggleQuickQuestions() {
    quickQuestions.classList.toggle('collapsed');
    
    // Save preference to localStorage
    const isCollapsed = quickQuestions.classList.contains('collapsed');
    localStorage.setItem('quickQuestionsCollapsed', isCollapsed);
}

/**
 * Setup responsive behavior
 */
function setupResponsiveBehavior() {
    // Handle window resize
    window.addEventListener('resize', () => {
        // Close sidebar on desktop if it's open
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
            closeSidebar();
        }
        
        // Auto-collapse quick questions on mobile
        if (window.innerWidth <= 768 && !quickQuestions.classList.contains('collapsed')) {
            quickQuestions.classList.add('collapsed');
        } else if (window.innerWidth > 768) {
            // Restore quick questions preference on desktop
            const isCollapsed = localStorage.getItem('quickQuestionsCollapsed') === 'true';
            if (isCollapsed) {
                quickQuestions.classList.add('collapsed');
            } else {
                quickQuestions.classList.remove('collapsed');
            }
        }
    });
    
    // Handle escape key to close sidebar
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sidebar.classList.contains('open')) {
            closeSidebar();
        }
    });
    
    // Load quick questions preference
    const isCollapsed = localStorage.getItem('quickQuestionsCollapsed') === 'true';
    if (isCollapsed && window.innerWidth > 768) {
        quickQuestions.classList.add('collapsed');
    }
}

// ========== NEW FEATURE FUNCTIONS ==========

/**
 * Delete a document permanently
 */
async function deleteDocument(filename) {
    if (!confirm(`Are you sure you want to permanently delete "${filename}"? This action cannot be undone.`)) {
        return;
    }
    
    logSystemEvent(`Deleting document: ${filename}`);
    
    try {
        const result = await window.electronAPI.deleteDocument(filename);
        
        if (result.success) {
            await loadDocumentsList();
            showToast(`Document "${filename}" deleted successfully.`, 'success');
            logSystemEvent(`Successfully deleted: ${filename}`);
        } else {
            throw new Error(result.error || 'Failed to delete document');
        }
    } catch (error) {
        console.error('Error deleting document:', error);
        showToast('Error deleting document: ' + error.message, 'error');
    }
}

/**
 * Copy message to clipboard
 */
async function copyMessage(text) {
    try {
        const result = await window.electronAPI.copyToClipboard(text);
        if (result.success) {
            showToast('Copied to clipboard!', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        showToast('Failed to copy to clipboard', 'error');
    }
}

/**
 * Bookmark a message
 */
async function bookmarkMessage(text, sources, confidence, confidenceLevel, metadata = null, elapsedTime = null, systemStats = null) {
    // Get the current question from message history
    const lastUserMessage = messageHistory.filter(m => m.type === 'user').pop();
    const question = lastUserMessage ? lastUserMessage.content : 'Unknown question';
    
    const bookmarkData = {
        question: question,
        answer: text,
        confidence: confidence,
        confidenceLevel: confidenceLevel,
        sources: sources || [],
        metadata: metadata || {},
        elapsedTime: elapsedTime || 0,
        systemStats: systemStats || {}
    };
    
    try {
        const result = await window.electronAPI.saveBookmark(bookmarkData);
        if (result.success) {
            showToast('Answer bookmarked!', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving bookmark:', error);
        showToast('Failed to save bookmark', 'error');
    }
}

/**
 * Toggle search functionality
 */
function toggleSearch() {
    const isHidden = searchContainer.classList.contains('hidden');
    
    if (isHidden) {
        searchContainer.classList.remove('hidden');
        searchInput.focus();
    } else {
        closeSearch();
    }
}

/**
 * Close search
 */
function closeSearch() {
    searchContainer.classList.add('hidden');
    searchInput.value = '';
    clearSearchHighlights();
}

/**
 * Perform search in chat messages
 */
function performSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    clearSearchHighlights();
    
    if (!searchTerm) return;
    
    const messages = chatMessages.querySelectorAll('.message-text');
    let foundCount = 0;
    
    messages.forEach(messageElement => {
        const text = messageElement.textContent.toLowerCase();
        if (text.includes(searchTerm)) {
            highlightSearchTerm(messageElement, searchTerm);
            foundCount++;
        }
    });
    
    if (foundCount === 0) {
        showToast('No matches found', 'error');
    }
}

/**
 * Highlight search terms in text
 */
function highlightSearchTerm(element, searchTerm) {
    const originalHTML = element.innerHTML;
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    const highlightedHTML = originalHTML.replace(regex, '<span class="search-highlight">$1</span>');
    element.innerHTML = highlightedHTML;
}

/**
 * Clear search highlights
 */
function clearSearchHighlights() {
    const highlights = chatMessages.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
        parent.normalize();
    });
}

/**
 * Escape regex special characters
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Show export modal
 */
function showExportModal() {
    exportModal.classList.remove('hidden');
}

/**
 * Close export modal
 */
function closeExportModal() {
    exportModal.classList.add('hidden');
}

/**
 * Handle chat export
 */
async function handleExportChat() {
    const formatRadios = document.querySelectorAll('input[name="exportFormat"]');
    let selectedFormat = 'txt';
    
    formatRadios.forEach(radio => {
        if (radio.checked) selectedFormat = radio.value;
    });
    
    // Collect chat data
    const chatData = [];
    const messages = chatMessages.querySelectorAll('.message');
    
    messages.forEach((message, index) => {
        const isUser = message.classList.contains('user-message');
        const textElement = message.querySelector('.message-text');
        const text = textElement ? textElement.textContent : '';
        
        if (text.trim()) {
            const messageData = {
                sender: isUser ? 'user' : 'assistant',
                text: text,
                timestamp: new Date().toISOString(),
                index: index
            };
            
            // Add confidence and sources for assistant messages
            if (!isUser) {
                const sourcesElement = message.querySelector('.sources');
                if (sourcesElement) {
                    const sourceItems = sourcesElement.querySelectorAll('.source-item');
                    messageData.sources = Array.from(sourceItems).map(item => item.textContent);
                }
                
                // Extract confidence from class names
                const confidenceClasses = ['confidence-high', 'confidence-medium', 'confidence-medium-low', 'confidence-low'];
                for (const className of confidenceClasses) {
                    if (message.classList.contains(className)) {
                        messageData.confidenceLevel = className.replace('confidence-', '');
                        break;
                    }
                }
            }
            
            chatData.push(messageData);
        }
    });
    
    try {
        const result = await window.electronAPI.exportChat(chatData, selectedFormat);
        if (result.success) {
            showToast(`Chat exported successfully!`, 'success');
            closeExportModal();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error exporting chat:', error);
        showToast('Failed to export chat', 'error');
    }
}

/**
 * Show bookmarks modal
 */
async function showBookmarksModal() {
    bookmarksModal.classList.remove('hidden');
    await loadBookmarks();
}

/**
 * Close bookmarks modal
 */
function closeBookmarksModal() {
    bookmarksModal.classList.add('hidden');
}

/**
 * Load and display bookmarks
 */
async function loadBookmarks() {
    try {
        bookmarksList.innerHTML = '<div class="loading-indicator">Loading bookmarks...</div>';
        
        const result = await window.electronAPI.getBookmarks();
        if (result.success) {
            displayBookmarks(result.bookmarks);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error loading bookmarks:', error);
        bookmarksList.innerHTML = '<div class="error-indicator">Error loading bookmarks</div>';
    }
}

/**
 * Display bookmarks in the modal
 */
function displayBookmarks(bookmarks) {
    if (bookmarks.length === 0) {
        bookmarksList.innerHTML = '<div class="loading-indicator">No bookmarks saved yet</div>';
        return;
    }
    
    const bookmarksHTML = bookmarks.map(bookmark => {
        const date = new Date(bookmark.timestamp).toLocaleDateString();
        const truncatedAnswer = bookmark.answer.length > 200 ? 
            bookmark.answer.substring(0, 200) + '...' : bookmark.answer;
        
        return `
            <div class="bookmark-item" onclick="navigateToBookmark('${bookmark.id}', '${bookmark.question.replace(/'/g, "\\'")}')">
                <div class="bookmark-header">
                    <div class="bookmark-date">${date}</div>
                    <button class="bookmark-delete" onclick="event.stopPropagation(); deleteBookmark('${bookmark.id}')" title="Delete bookmark">×</button>
                </div>
                <div class="bookmark-question">${bookmark.question}</div>
                <div class="bookmark-answer">${truncatedAnswer}</div>
            </div>
        `;
    }).join('');
    
    bookmarksList.innerHTML = bookmarksHTML;
}

/**
 * Navigate to a bookmarked answer by loading the saved data
 */
async function navigateToBookmark(bookmarkId, question) {
    try {
        // Close the bookmarks modal
        closeBookmarksModal();
        
        // Load the bookmark data
        const result = await window.electronAPI.loadBookmark(bookmarkId);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        const bookmark = result.bookmark;
        
        // Add the user question to chat
        addMessage(bookmark.question, 'user');
        
        // Add the saved answer to chat with all metadata
        addMessage(
            bookmark.answer, 
            'assistant', 
            bookmark.sources, 
            bookmark.metadata, 
            bookmark.elapsedTime, 
            bookmark.systemStats, 
            bookmark.confidence, 
            bookmark.confidenceLevel
        );
        
        showToast('Loaded bookmarked conversation', 'success');
        
    } catch (error) {
        console.error('Error loading bookmark:', error);
        showToast('Failed to load bookmark', 'error');
    }
}

/**
 * Delete a bookmark
 */
async function deleteBookmark(bookmarkId) {
    try {
        const result = await window.electronAPI.deleteBookmark(bookmarkId);
        if (result.success) {
            showToast('Bookmark deleted', 'success');
            await loadBookmarks(); // Refresh the list
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error deleting bookmark:', error);
        showToast('Failed to delete bookmark', 'error');
    }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make functions globally accessible for onclick handlers
window.deleteDocument = deleteDocument;
window.deleteBookmark = deleteBookmark;
window.navigateToBookmark = navigateToBookmark;