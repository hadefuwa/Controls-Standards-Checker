// Simple Ollama client for getting text embeddings
// This connects to your local Ollama instance running at http://localhost:11434

// We need to use dynamic import for node-fetch v3+
let fetch;

/**
 * Get embedding vector for text using Ollama
 * @param {string} text - The text to get embeddings for
 * @returns {Promise<Array>} - The embedding vector as an array of numbers
 */
async function getEmbedding(text) {
    // Check if text is provided
    if (!text || typeof text !== 'string') {
        throw new Error('Text input is required and must be a string');
    }

    // Import fetch if not already imported (for node-fetch v3+)
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }

    // Prepare the request to send to Ollama
    const requestBody = {
        model: 'all-minilm',  // Using a proper embedding model
        input: text           // The text we want to embed
    };

    try {
        console.log('Getting embedding for text (first 50 chars):', text.substring(0, 50) + '...');
        
        // Send request to Ollama (use 127.0.0.1 instead of localhost to avoid IPv6 issues)
        const response = await fetch('http://127.0.0.1:11434/api/embed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`Ollama request failed with status: ${response.status}`);
        }

        // Parse the response
        const data = await response.json();
        
        // Check if we got embeddings back (the response format for /api/embed is different)
        if (!data.embeddings || !Array.isArray(data.embeddings) || data.embeddings.length === 0) {
            throw new Error('Invalid response from Ollama - no embeddings found');
        }

        // Return the first embedding (since we sent only one input)
        const embedding = data.embeddings[0];
        console.log('Successfully got embedding with', embedding.length, 'dimensions');
        return embedding;

    } catch (error) {
        // Handle different types of errors
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Cannot connect to Ollama. Make sure Ollama is running on 127.0.0.1:11434');
        } else if (error.message.includes('all-minilm')) {
            throw new Error('Model all-minilm not found. Please run: ollama pull all-minilm');
        } else {
            throw new Error(`Error getting embedding: ${error.message}`);
        }
    }
}

/**
 * Generate text response using Ollama chat API
 * @param {string} model - The model to use for generation (e.g., 'phi3:mini')
 * @param {Array} messages - Array of message objects with role and content
 * @returns {Promise<string>} - The generated response text
 */
async function generateResponse(model, messages) {
    // Validate inputs
    if (!model || typeof model !== 'string') {
        throw new Error('Model parameter is required and must be a string');
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages parameter is required and must be a non-empty array');
    }

    // Import fetch if not already imported (for node-fetch v3+)
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }

    // Prepare the request to send to Ollama
    const requestBody = {
        model: model,
        messages: messages,
        stream: false  // We want the complete response, not streaming
    };

    try {
        console.log(`Generating response using model: ${model}`);
        console.log(`Messages: ${messages.length} message(s)`);
        
        // Send request to Ollama chat API
        const response = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`Ollama chat request failed with status: ${response.status}`);
        }

        // Parse the response
        const data = await response.json();
        
        // Check if we got a valid response
        if (!data.message || !data.message.content) {
            throw new Error('Invalid response from Ollama - no message content found');
        }

        console.log('Successfully generated response');
        return data.message.content;

    } catch (error) {
        // Handle different types of errors
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Cannot connect to Ollama. Make sure Ollama is running on 127.0.0.1:11434');
        } else if (error.message.includes(model)) {
            throw new Error(`Model ${model} not found. Please run: ollama pull ${model}`);
        } else {
            throw new Error(`Error generating response: ${error.message}`);
        }
    }
}

// Export both functions so other files can use them
module.exports = {
    getEmbedding,
    generateResponse
}; 