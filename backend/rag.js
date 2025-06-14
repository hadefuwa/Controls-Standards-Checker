// RAG (Retrieval Augmented Generation) module for Industrial Automation AI Assistant
// This module combines semantic search with AI response generation

const fs = require('fs');
const path = require('path');
const { getEmbedding, generateResponse } = require('../llm/ollama_client');

// Configuration
let EMBEDDINGS_FILE = path.join(__dirname, 'embedding_db', 'embeddings.json');  // Default path, can be overridden
const EMBEDDING_MODEL = 'all-minilm';  // Model used for embeddings
const TEXT_MODEL = 'qwen2:0.5b';  // Ultra-fast, smallest model (352MB)
const VISION_MODEL = 'llava:13b';  // Vision model for image analysis
const TOP_K_CHUNKS = 2;  // Reduce to 2 chunks for balance

// Maximum context length to prevent model overload
const MAX_CONTEXT_LENGTH = 2500;  // Sweet spot - 2500 characters

// In-memory cache for document embeddings
let documentChunks = null;

/**
 * Set the embeddings file path (called by main process)
 * @param {string} embeddingsPath - Path to the embeddings.json file
 */
function setEmbeddingsPath(embeddingsPath) {
    EMBEDDINGS_FILE = embeddingsPath;
    // Clear cache so it reloads from new path
    documentChunks = null;
    console.log('📁 Updated embeddings path:', EMBEDDINGS_FILE);
}

/**
 * Load document chunks and embeddings from file
 * @returns {Promise<Array>} - Array of document chunks with embeddings
 */
async function loadDocuments() {
    if (documentChunks) {
        return documentChunks;  // Return cached version
    }
    
    console.log('Loading document embeddings...');
    
    try {
        if (!fs.existsSync(EMBEDDINGS_FILE)) {
            throw new Error(`Embeddings file not found: ${EMBEDDINGS_FILE}`);
        }
        
        const data = fs.readFileSync(EMBEDDINGS_FILE, 'utf8');
        documentChunks = JSON.parse(data);
        
        console.log(`✅ Loaded ${documentChunks.length} document chunks`);
        return documentChunks;
        
    } catch (error) {
        console.error('❌ Error loading documents:', error.message);
        throw error;
    }
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Array<number>} vecA - First vector
 * @param {Array<number>} vecB - Second vector
 * @returns {number} - Cosine similarity score between 0 and 1
 */
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
        throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    if (normA === 0 || normB === 0) {
        return 0;
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get diverse chunks from different documents to avoid over-relying on one source
 * @param {Array} sortedChunks - Chunks sorted by similarity (highest first)
 * @param {number} maxChunks - Maximum number of chunks to return
 * @returns {Array} - Array of diverse chunks
 */
function getDiverseChunks(sortedChunks, maxChunks) {
    const selectedChunks = [];
    const sourceDocuments = new Set();
    
    // First pass: get best chunk from each unique document
    for (const chunk of sortedChunks) {
        if (selectedChunks.length >= maxChunks) break;
        
        const source = chunk.metadata?.source;
        if (source && !sourceDocuments.has(source)) {
            selectedChunks.push(chunk);
            sourceDocuments.add(source);
        }
    }
    
    // Second pass: fill remaining slots with best remaining chunks
    for (const chunk of sortedChunks) {
        if (selectedChunks.length >= maxChunks) break;
        
        // Skip if we already selected this chunk
        if (!selectedChunks.some(selected => selected.id === chunk.id)) {
            selectedChunks.push(chunk);
        }
    }
    
    // Sort final selection by similarity for consistency
    selectedChunks.sort((a, b) => b.similarity - a.similarity);
    
    return selectedChunks;
}

/**
 * Answer a question with optional image input using retrieval and generation
 * @param {string} userQuery - The user's question
 * @param {string} imageBase64 - Optional base64 encoded image
 * @param {string} selectedModel - The model to use for generation
 * @param {AbortSignal} signal - Optional abort signal for cancellation
 * @returns {Promise<Object>} - Object containing answer, sources, and metadata
 */
async function answerQuestion(userQuery, imageBase64 = null, selectedModel = 'qwen2:0.5b', signal = null) {
    console.log('=== Starting RAG Process ===');
    console.log(`📝 User Query: "${userQuery}"`);
    console.log(`🤖 Selected Model: ${selectedModel}`);
    
    try {
        // Step 1: Load documents
        const allDocumentChunks = await loadDocuments();
        
        // Step 2: Embed the user query
        console.log('🔍 Embedding user query...');
        const queryEmbedding = await getEmbedding(userQuery);
        console.log(`Query embedded (${queryEmbedding.length} dimensions)`);
        
        // Step 3: Perform semantic search
        console.log('🔎 Performing semantic search...');
        const similarities = allDocumentChunks.map(chunk => ({
            ...chunk,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Sort by similarity (highest first)
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Get diverse chunks from different documents
        const relevantChunks = getDiverseChunks(similarities, TOP_K_CHUNKS);
        console.log(`✅ Found ${relevantChunks.length} relevant chunks from diverse sources`);
        
        // Log similarity scores for debugging
        relevantChunks.forEach((chunk, index) => {
            console.log(`   ${index + 1}. Similarity: ${(chunk.similarity * 100).toFixed(1)}% - ${chunk.id}`);
        });
        
        // Step 4: Construct context from relevant chunks - LIMIT LENGTH
        console.log('📄 Constructing context...');
        let context = relevantChunks
            .map((chunk, index) => `[Source ${index + 1}: ${chunk.metadata.source}]\n${chunk.document}`)
            .join('\n\n---\n\n');
        
        // Truncate context if too long to prevent model overload
        if (context.length > MAX_CONTEXT_LENGTH) {
            context = context.substring(0, MAX_CONTEXT_LENGTH) + '... [truncated for performance]';
            console.log(`⚠️ Context truncated to ${MAX_CONTEXT_LENGTH} characters for performance`);
        }
        
        console.log(`✅ Context constructed (${context.length} characters)`);
        
        // Step 5: Use the selected model
        const modelToUse = selectedModel;
        
        // Create simple, concise messages
        const messages = [
            {
                role: 'system',
                content: 'You are an expert in European industrial safety directives and regulations. Answer questions about the Machinery Directive, Low Voltage Directive (LVD), EMC Directive, and related safety standards. Use the provided context to give accurate, specific answers. If the context doesn\'t contain enough information, say so clearly.'
            },
            {
                role: 'user',
                content: `Context: ${context}\n\nQuestion: ${userQuery}\n\nPlease provide a detailed answer based on the context.`
            }
        ];
        
        console.log(`🤖 Generating text response using ${modelToUse}...`);
        const aiResponse = await generateResponse(modelToUse, messages, signal);
        console.log('✅ Text response generated successfully');
        
        // Step 6: Prepare result object
        const result = {
            answer: aiResponse,
            query: userQuery,
            hasImage: !!imageBase64,
            modelUsed: modelToUse,
            sources: relevantChunks.map(chunk => ({
                id: chunk.id,
                source: chunk.metadata.source,
                similarity: chunk.similarity,
                content_preview: chunk.document.substring(0, 150) + '...'
            })),
            metadata: {
                total_chunks_searched: allDocumentChunks.length,
                relevant_chunks_used: relevantChunks.length,
                top_similarity: relevantChunks[0]?.similarity || 0,
                embedding_model: EMBEDDING_MODEL,
                generation_model: modelToUse
            }
        };
        
        console.log('🎉 RAG process completed successfully');
        return result;
        
    } catch (error) {
        console.error('❌ RAG process failed:', error.message);
        throw error;
    }
}

/**
 * Get document count and statistics
 * @returns {Promise<Object>} - Document statistics
 */
async function getDocumentCount() {
    try {
        const allDocumentChunks = await loadDocuments();
        
        // Group chunks by source document
        const documentStats = {};
        allDocumentChunks.forEach(chunk => {
            const source = chunk.metadata.source;
            if (!documentStats[source]) {
                documentStats[source] = {
                    name: source,
                    chunks: 0,
                    size: 0
                };
            }
            documentStats[source].chunks++;
            documentStats[source].size += chunk.document.length;
        });
        
        const documents = Object.values(documentStats);
        
        return {
            success: true,
            documents: documents,
            totalChunks: allDocumentChunks.length,
            totalDocuments: documents.length
        };
    } catch (error) {
        console.error('❌ Error getting document count:', error.message);
        return {
            success: false,
            documents: [],
            totalChunks: 0,
            totalDocuments: 0,
            error: error.message
        };
    }
}

// Placeholder for searchOnly to prevent crash
async function searchOnly() {
    return [];
}

module.exports = {
    answerQuestion,
    searchOnly,
    loadDocuments,
    cosineSimilarity,
    setEmbeddingsPath,
    getDocumentCount
};