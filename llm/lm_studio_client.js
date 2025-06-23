// Simple LM Studio client for getting text embeddings and generation
// This connects to your local LM Studio instance running at http://localhost:1234
// This will actually use your AMD RX 570 GPU!

// We need to use dynamic import for node-fetch v3+
let fetch;

/**
 * Get embedding vector for text using LM Studio
 * Note: LM Studio doesn't have a direct embedding endpoint like Ollama
 * So we'll use a simple text-to-embedding approach or keep using Ollama for embeddings
 * @param {string} text - The text to get embeddings for
 * @returns {Promise<Array>} - The embedding vector as an array of numbers
 */
async function getEmbedding(text) {
    // For now, we'll still use Ollama for embeddings since it's fast
    // and LM Studio doesn't have a direct embedding API
    console.log('⚠️  Still using Ollama for embeddings (it\'s fast enough)');
    
    // Import the old Ollama client for embeddings only
    const ollamaClient = require('./ollama_client.js');
    return await ollamaClient.getEmbedding(text);
}

/**
 * Generate text response using LM Studio API (OpenAI-compatible format)
 * This is where the speed improvement will happen with GPU acceleration!
 * @param {string} model - The model name (will be ignored, LM Studio uses loaded model)
 * @param {Array} messages - Array of message objects with role and content
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<string>} - The generated response text
 */
async function generateResponse(model, messages, signal = null) {
    // Validate inputs
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages parameter is required and must be a non-empty array');
    }

    // Import fetch if not already imported (for node-fetch v3+)
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }

    // LM Studio uses OpenAI-compatible API format
    const requestBody = {
        model: "loaded-model", // LM Studio ignores this, uses whatever model is loaded
        messages: messages,
        temperature: 0.1,  // Lower temperature for more consistent, focused responses
        max_tokens: 8000,  // Significantly increased for complete responses
        stream: false,  // We want the complete response, not streaming
        response_format: { 
            type: "json_object",
            schema: {
                type: "object",
                properties: {
                    thinking: {
                        type: "string",
                        description: "Your step-by-step reasoning process and analysis"
                    },
                    answer: {
                        type: "string", 
                        description: "Your final, complete answer to the user's question"
                    }
                },
                required: ["thinking", "answer"]
            }
        }
    };

    try {
        console.log(`🚀 Generating response using LM Studio (GPU accelerated!)`);
        console.log(`📝 Messages: ${messages.length} message(s)`);
        
        // Send request to LM Studio OpenAI-compatible API
        const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer no-key-needed'  // LM Studio doesn't need real API key
            },
            body: JSON.stringify(requestBody),
            signal: signal  // Pass the abort signal to fetch
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`LM Studio request failed with status: ${response.status}`);
        }

        // Parse the response (OpenAI format)
        const data = await response.json();
        
        // Check if we got a valid response
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('Invalid response from LM Studio - no message content found');
        }

        console.log('✅ Successfully generated response with GPU acceleration!');
        return data.choices[0].message.content;

    } catch (error) {
        // Handle abort error specifically
        if (error.name === 'AbortError') {
            throw new Error('Request was canceled by user');
        }
        
        // Handle different types of errors
        if (error.code === 'ECONNREFUSED') {
            console.error('🔴 LM Studio is not running or not accessible on port 1234');
            console.error('💡 Please make sure:');
            console.error('   1. LM Studio is open');
            console.error('   2. A model is loaded');
            console.error('   3. Local Server is started');
            console.error('   4. Server is running on port 1234');
            throw new Error('🔴 LM Studio not available. Please start LM Studio with Local Server on port 1234');
        } else {
            console.error('🔴 LM Studio error:', error.message);
            throw new Error(`🔴 LM Studio error: ${error.message}`);
        }
    }
}

// Export both functions so other files can use them
module.exports = {
    getEmbedding,
    generateResponse
}; 