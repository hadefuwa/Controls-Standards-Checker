// RAG (Retrieval Augmented Generation) module for Industrial Automation AI Assistant
// This module combines semantic search with AI response generation

const fs = require('fs');
const path = require('path');
const { getEmbedding, generateResponse } = require('../llm/ollama_client');

// Configuration
const EMBEDDINGS_FILE = path.join(__dirname, 'embedding_db', 'embeddings.json');
const EMBEDDING_MODEL = 'all-minilm';  // Model used for embeddings
const GENERATION_MODEL = 'llama3.2-vision';  // Model used for text generation and image understanding
const TOP_K_CHUNKS = 3;  // Number of relevant chunks to use for context

// In-memory cache for document embeddings
let documentChunks = null;

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
 * Answer a question with optional image input using retrieval and generation
 * @param {string} userQuery - The user's question
 * @param {string} imageBase64 - Optional base64 encoded image
 * @returns {Promise<Object>} - Object containing answer, sources, and metadata
 */
async function answerQuestion(userQuery, imageBase64 = null) {
    console.log('=== Starting RAG Process ===');
    console.log(`📝 User Query: "${userQuery}"`);
    
    try {
        // Step 1: Load documents
        const allDocumentChunks = await loadDocuments();
        
        // Step 2: Embed the user query
        console.log('🔍 Embedding user query...');
        const queryEmbedding = await getEmbedding(userQuery);
        console.log(`✅ Query embedded (${queryEmbedding.length} dimensions)`);
        
        // Step 3: Perform semantic search
        console.log('🔎 Performing semantic search...');
        const similarities = allDocumentChunks.map(chunk => ({
            ...chunk,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Sort by similarity (highest first)
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Get top K most relevant chunks
        const relevantChunks = similarities.slice(0, TOP_K_CHUNKS);
        console.log(`✅ Found ${relevantChunks.length} relevant chunks`);
        
        // Log similarity scores for debugging
        relevantChunks.forEach((chunk, index) => {
            console.log(`   ${index + 1}. Similarity: ${(chunk.similarity * 100).toFixed(1)}% - ${chunk.id}`);
        });
        
        // Step 4: Construct context from relevant chunks
        console.log('📄 Constructing context...');
        const context = relevantChunks
            .map((chunk, index) => `[Source ${index + 1}: ${chunk.metadata.source}]\n${chunk.document}`)
            .join('\n\n---\n\n');
        
        console.log(`✅ Context constructed (${context.length} characters)`);
        
        // Step 5: Prepare messages for AI generation
        const messages = [
            {
                role: 'system',
                content: 'You are an industrial automation expert. Answer questions based ONLY on the provided context from official documentation. If an image is provided, analyze it in the context of industrial machinery safety and compliance. If the answer is not clearly stated in the context, say "I cannot find a direct answer in the provided documentation." Be precise and cite which source sections support your answer.'
            }
        ];

        // Add user message with optional image
        if (imageBase64) {
            console.log('🖼️ Image provided with query');
            messages.push({
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${userQuery}\n\nPlease analyze the provided image in the context of industrial automation safety and compliance.`,
                images: [imageBase64]
            });
        } else {
            messages.push({
                role: 'user',
                content: `Context:\n${context}\n\nQuestion: ${userQuery}`
            });
        }
        
        // Step 6: Generate AI response
        console.log('🤖 Generating AI response...');
        const aiResponse = await generateResponse(GENERATION_MODEL, messages);
        console.log('✅ Response generated successfully');
        
        // Step 7: Prepare result object
        const result = {
            answer: aiResponse,
            query: userQuery,
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
                generation_model: GENERATION_MODEL
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
 * Get similarity scores for a query without generating a response
 * Useful for debugging and testing search quality
 * @param {string} userQuery - The user's question
 * @param {number} topK - Number of top results to return
 * @returns {Promise<Array>} - Array of chunks with similarity scores
 */
async function searchOnly(userQuery, topK = TOP_K_CHUNKS) {
    console.log(`🔍 Search-only mode for: "${userQuery}"`);
    
    try {
        const allDocumentChunks = await loadDocuments();
        const queryEmbedding = await getEmbedding(userQuery);
        
        const similarities = allDocumentChunks.map(chunk => ({
            id: chunk.id,
            source: chunk.metadata.source,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
            content_preview: chunk.document.substring(0, 200) + '...'
        }));
        
        similarities.sort((a, b) => b.similarity - a.similarity);
        return similarities.slice(0, topK);
        
    } catch (error) {
        console.error('❌ Search failed:', error.message);
        throw error;
    }
}

// Export the main functions
module.exports = {
    answerQuestion,
    searchOnly,
    loadDocuments,
    cosineSimilarity
}; 