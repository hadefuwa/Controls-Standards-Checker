// LM Studio client with automatic CPU fallback when GPU fails
// This handles Vulkan driver issues gracefully

let fetch;
let lastGPUUsed = false; // Track if GPU was used successfully

/**
 * Get embedding vector for text - uses Ollama (still fast for embeddings)
 */
async function getEmbedding(text) {
    console.log('⚠️  Using Ollama for embeddings (GPU driver issues don\'t affect this)');
    const ollamaClient = require('./ollama_client.js');
    return await ollamaClient.getEmbedding(text);
}

/**
 * Check if GPU was used in the last request
 */
function isGPUActive() {
    return lastGPUUsed;
}

/**
 * Generate text response with GPU error handling
 */
async function generateResponse(model, messages, signal = null) {
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages parameter is required and must be a non-empty array');
    }

    // Import fetch if needed
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }

    // Try LM Studio first (GPU accelerated)
    try {
        console.log(`🚀 Attempting LM Studio (GPU accelerated)...`);
        
        const requestBody = {
            model: "loaded-model",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
            stream: false
        };

        const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer no-key-needed'
            },
            body: JSON.stringify(requestBody),
            signal: signal
        });

        if (response.ok) {
            const data = await response.json();
            if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                lastGPUUsed = true; // Mark GPU as successfully used
                console.log('✅ LM Studio (GPU) worked successfully!');
                return data.choices[0].message.content;
            }
        }

        // Check for specific GPU driver errors
        const responseText = await response.text();
        const isGPUError = responseText.includes('ErrorDeviceLost') || 
                          responseText.includes('vk::Queue') ||
                          responseText.includes('Vulkan');

        if (isGPUError) {
            console.log('⚠️  GPU driver error detected, falling back to CPU...');  
            throw new Error('GPU_DRIVER_ERROR');
        } else {
            throw new Error(`LM Studio error: ${response.status} - ${responseText}`);
        }

    } catch (error) {
        lastGPUUsed = false; // Mark GPU as not used

        // Handle specific GPU driver errors with fallback
        if (error.message === 'GPU_DRIVER_ERROR' || 
            error.message.includes('ErrorDeviceLost') ||
            error.message.includes('Vulkan')) {
            
            console.log('🔄 GPU driver issue detected - using CPU fallback...');
            console.log('💡 To fix GPU: Run fix_vulkan_gpu.bat and restart LM Studio');
            
            // Fallback to Ollama for text generation
            try {
                const ollamaClient = require('./ollama_client.js');
                console.log('🔄 Falling back to Ollama (CPU-only)...');
                return await ollamaClient.generateResponse(model, messages, signal);
            } catch (ollamaError) {
                throw new Error(`🔴 Both GPU (driver error) and CPU fallback failed: ${ollamaError.message}`);
            }
        }

        // Handle connection errors
        if (error.code === 'ECONNREFUSED') {
            console.log('🔄 LM Studio not available - using Ollama fallback...');
            try {
                const ollamaClient = require('./ollama_client.js');
                return await ollamaClient.generateResponse(model, messages, signal);
            } catch (ollamaError) {
                throw new Error(`🔴 Both LM Studio and Ollama unavailable: ${ollamaError.message}`);
            }
        }

        // Re-throw other errors
        throw error;
    }
}

module.exports = {
    getEmbedding,
    generateResponse,
    isGPUActive
}; 