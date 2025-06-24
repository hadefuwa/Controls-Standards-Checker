// Simple LM Studio client for getting text embeddings and generation
// This connects to your local LM Studio instance running at http://localhost:1234
// This will actually use your AMD RX 570 GPU!

// We need to use dynamic import for node-fetch v3+
let fetch;
const fs = require('fs');
const path = require('path');

/**
 * Get a simple JSON schema for thinking/answer format
 * @returns {Object} - Simple JSON schema for structured responses
 */
function getSimpleThinkingSchema() {
    return {
        "type": "object",
        "properties": {
            "thinking": {
                "type": "string",
                "description": "Step-by-step reasoning process and analysis"
            },
            "answer": {
                "type": "string", 
                "description": "Clear, complete answer to the user's question"
            }
        },
        "required": ["thinking", "answer"],
        "additionalProperties": false
    };
}

/**
 * Get embedding vector for text using global Ollama installation
 * Note: LM Studio doesn't have a direct embedding endpoint like Ollama
 * So we'll use the global Ollama installation for embeddings
 * @param {string} text - The text to get embeddings for
 * @returns {Promise<Array>} - The embedding vector as an array of numbers
 */
async function getEmbedding(text) {
    console.log('🔍 Using Ollama for embeddings (GPU driver issues don\'t affect this)');
    console.log(`Getting embedding for text (first 50 chars): ${text.substring(0, 50)}...`);
    
    // Import fetch if not already imported
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }
    
    try {
        // Use global Ollama installation via HTTP API
        const response = await fetch('http://localhost:11434/api/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'all-minilm:latest',
                prompt: text
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama embeddings request failed: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response from Ollama');
        }

        console.log(`Successfully got embedding with ${data.embedding.length} dimensions`);
        return data.embedding;
        
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            throw new Error('Ollama service not running. Please start Ollama first.');
        }
        throw new Error(`Embedding generation failed: ${error.message}`);
    }
}

/**
 * Generate text response using LM Studio API (OpenAI-compatible format)
 * This is where the speed improvement will happen with GPU acceleration!
 * @param {string} model - The model name (will be ignored, LM Studio uses loaded model)
 * @param {Array} messages - Array of message objects with role and content
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @param {string} userQuery - Optional user query for schema selection
 * @returns {Promise<string>} - The generated response text
 */
async function generateResponse(model, messages, signal = null, userQuery = null) {
    // Validate inputs
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        throw new Error('Messages parameter is required and must be a non-empty array');
    }

    // Import fetch if not already imported (for node-fetch v3+)
    if (!fetch) {
        const fetchModule = await import('node-fetch');
        fetch = fetchModule.default;
    }

    // Extract user query from messages if not provided
    if (!userQuery && messages.length > 0) {
        // Try to extract the actual question from the user message
        const userMessage = messages.find(msg => msg.role === 'user');
        if (userMessage && userMessage.content) {
            // Extract question from the formatted context
            const questionMatch = userMessage.content.match(/QUESTION:\s*(.+?)(?:\n|$)/i);
            if (questionMatch) {
                userQuery = questionMatch[1].trim();
            } else {
                userQuery = userMessage.content;
            }
        }
    }

    // Use simple thinking/answer schema for all requests
    const jsonSchema = getSimpleThinkingSchema();

    // Process messages to handle images (OpenAI Vision API format)
    const processedMessages = messages.map(message => {
        if (message.images && message.images.length > 0) {
            // Use proper OpenAI Vision API format that LM Studio should understand
            return {
                role: message.role,
                content: [
                    {
                        type: "text",
                        text: message.content
                    },
                    {
                        type: "image_url",
                        image_url: {
                            url: `data:image/jpeg;base64,${message.images[0]}`
                        }
                    }
                ]
            };
        }
        return message;
    });

    // LM Studio uses OpenAI-compatible API format
    const requestBody = {
        model: "loaded-model", // LM Studio ignores this, uses whatever model is loaded
        messages: processedMessages,
        temperature: 0.1,  // Lower temperature for more consistent, focused responses
        max_tokens: 12000,  // Increased to 32K for much larger, comprehensive responses
        stream: false  // We want the complete response, not streaming
    };

    // Add simple thinking/answer JSON schema
    requestBody.response_format = {
        type: "json_schema",
        json_schema: {
            name: "thinking_answer_response",
            schema: jsonSchema,
            strict: true
        }
    };
    console.log('📋 Using simple thinking/answer JSON schema for structured response');

    try {
        console.log(`🚀 Generating response using LM Studio (GPU accelerated!)`);
        console.log(`📝 Messages: ${messages.length} message(s)`);
        
        // Debug: Log the request body to see what we're sending
        const hasImages = processedMessages.some(msg => Array.isArray(msg.content));
        if (hasImages) {
            console.log('🖼️ Sending image request to LM Studio using OpenAI Vision API format...');
            console.log('📋 Request structure:', JSON.stringify({
                model: requestBody.model,
                messages: processedMessages.map(msg => ({
                    role: msg.role,
                    content: Array.isArray(msg.content) ? 
                        msg.content.map(item => ({
                            type: item.type,
                            text: item.type === 'text' ? item.text : undefined,
                            image_url: item.type === 'image_url' ? '[BASE64_IMAGE_DATA]' : undefined
                        })) : msg.content
                })),
                temperature: requestBody.temperature,
                max_tokens: requestBody.max_tokens
            }, null, 2));
            
            // Also log the actual image data size for debugging
            const imageMessage = processedMessages.find(msg => Array.isArray(msg.content));
            if (imageMessage) {
                const imageContent = imageMessage.content.find(item => item.type === 'image_url');
                if (imageContent && imageContent.image_url && imageContent.image_url.url) {
                    const base64Data = imageContent.image_url.url.split(',')[1];
                    console.log(`📏 Image data size: ${base64Data ? base64Data.length : 0} characters`);
                }
            }
        }
        
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
            let errorDetails = '';
            try {
                const errorData = await response.text();
                errorDetails = ` - ${errorData}`;
                console.log('🔴 LM Studio error response:', errorData);
            } catch (e) {
                // Ignore error reading response body
            }
            
            // If we have images and got a 400 error, try fallback without images
            if (response.status === 400 && hasImages) {
                console.log('⚠️ Vision request failed, attempting fallback without images...');
                
                // Create text-only version of messages
                const textOnlyMessages = messages.map(message => {
                    if (message.images && message.images.length > 0) {
                        return {
                            role: message.role,
                            content: message.content + " (Note: Image was provided but could not be processed by the current model configuration)"
                        };
                    }
                    return message;
                });
                
                // Retry with text-only request
                const fallbackRequestBody = {
                    model: "loaded-model",
                    messages: textOnlyMessages,
                    temperature: 0.1,
                    max_tokens: 12000,
                    stream: false
                };
                
                const fallbackResponse = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer no-key-needed'
                    },
                    body: JSON.stringify(fallbackRequestBody),
                    signal: signal
                });
                
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    if (fallbackData.choices && fallbackData.choices[0] && fallbackData.choices[0].message) {
                        console.log('✅ Fallback text-only request successful');
                        return fallbackData.choices[0].message.content;
                    }
                }
            }
            
            throw new Error(`LM Studio request failed with status: ${response.status}${errorDetails}`);
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