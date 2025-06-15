// RAG (Retrieval Augmented Generation) module for Industrial Automation AI Assistant
// This module combines semantic search with AI response generation

const fs = require('fs');
const path = require('path');
const { getEmbedding, generateResponse } = require('../llm/lm_studio_client_cpu_fallback');
const systemMonitor = require('./system_monitor');

// Configuration
let EMBEDDINGS_FILE = path.join(__dirname, 'embedding_db', 'embeddings.json');  // Default path, can be overridden
const EMBEDDING_MODEL = 'all-minilm';  // Model used for embeddings
const TEXT_MODEL = 'qwen2:0.5b';  // Ultra-fast, smallest model (352MB)
const VISION_MODEL = 'llava:13b';  // Vision model for image analysis
const TOP_K_CHUNKS = 4;  // Balanced for performance and accuracy
const SIMILARITY_THRESHOLD = 0.35;  // Lowered for better coverage
// Maximum context length to prevent model overload
const MAX_CONTEXT_LENGTH = 2500;  // Optimized for model performance

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
 * Enhance user query with technical synonyms and related terms
 * @param {string} query - Original user query
 * @returns {string} - Enhanced query with technical terms
 */
function enhanceQuery(query) {
    // Focused technical term mappings for industrial safety
    const synonyms = {
        'emergency stop': ['e-stop', 'estop'],
        'push button': ['pushbutton', 'button'],
        'color': ['colour'],
        'ce marking': ['ce mark'],
        'risk assessment': ['hazard analysis']
    };
    
    let enhancedQuery = query.toLowerCase();
    
    // Add only the most relevant synonyms to avoid noise
    for (const [term, alternates] of Object.entries(synonyms)) {
        if (enhancedQuery.includes(term)) {
            enhancedQuery += ' ' + alternates.slice(0, 2).join(' '); // Limit to 2 synonyms
        }
    }
    
    return enhancedQuery;
}

/**
 * Get high-quality chunks with similarity filtering and smart diversity
 * @param {Array} sortedChunks - Chunks sorted by similarity (highest first)
 * @param {number} maxChunks - Maximum number of chunks to return
 * @returns {Array} - Array of high-quality, diverse chunks
 */
function getOptimizedChunks(sortedChunks, maxChunks) {
    // Simple but effective approach - mix of quality and diversity
    const selectedChunks = [];
    const sourceDocuments = new Set();
    
    // Pass 1: Get best chunk from each unique document (diversity)
    for (const chunk of sortedChunks) {
        if (selectedChunks.length >= Math.ceil(maxChunks / 2)) break;
        
        const source = chunk.metadata?.source;
        if (source && !sourceDocuments.has(source) && chunk.similarity >= SIMILARITY_THRESHOLD) {
            selectedChunks.push(chunk);
            sourceDocuments.add(source);
        }
    }
    
    // Pass 2: Fill remaining slots with best chunks (regardless of source)
    for (const chunk of sortedChunks) {
        if (selectedChunks.length >= maxChunks) break;
        
        if (!selectedChunks.find(selected => selected.id === chunk.id) && chunk.similarity >= 0.3) {
            selectedChunks.push(chunk);
        }
    }
    
    // Ensure we have at least some chunks even if quality is low
    if (selectedChunks.length === 0) {
        selectedChunks.push(...sortedChunks.slice(0, Math.min(2, sortedChunks.length)));
    }
    
    // Sort by similarity for best context ordering
    selectedChunks.sort((a, b) => b.similarity - a.similarity);
    
    console.log(`📊 Optimized selection: ${sortedChunks.length} → ${selectedChunks.length} chunks (avg similarity: ${(selectedChunks.reduce((sum, c) => sum + c.similarity, 0) / selectedChunks.length * 100).toFixed(1)}%)`);
    
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
async function answerQuestion(userQuery, imageBase64 = null, selectedModel = 'lm-studio-gpu', signal = null) {
    const startTime = Date.now();
    console.log('=== Starting RAG Process ===');
    console.log(`📝 User Query: "${userQuery}"`);
    console.log(`🤖 Selected Model: ${selectedModel}`);
    
    // Start system monitoring
    systemMonitor.startMonitoring();
    
    try {
        // Step 1: Load documents
        const allDocumentChunks = await loadDocuments();
        
        // Step 2: Enhance query with technical synonyms
        console.log('🔧 Enhancing query with technical terms...');
        const enhancedQuery = enhanceQuery(userQuery);
        console.log(`Original: "${userQuery}"`);
        if (enhancedQuery !== userQuery.toLowerCase()) {
            console.log(`Enhanced: "${enhancedQuery}"`);
        }
        
        // Step 3: Embed the enhanced query
        console.log('🔍 Embedding enhanced query...');
        const queryEmbedding = await getEmbedding(enhancedQuery);
        console.log(`Query embedded (${queryEmbedding.length} dimensions)`);
        
        // Step 4: Perform semantic search with quality filtering
        console.log('🔎 Performing intelligent semantic search...');
        const similarities = allDocumentChunks.map(chunk => ({
            ...chunk,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Sort by similarity (highest first)
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        // Get optimized chunks for better performance
        const relevantChunks = getOptimizedChunks(similarities, TOP_K_CHUNKS);
        console.log(`✅ Selected ${relevantChunks.length} optimized chunks from diverse sources`);
        
        // Log similarity scores for debugging
        relevantChunks.forEach((chunk, index) => {
            console.log(`   ${index + 1}. Similarity: ${(chunk.similarity * 100).toFixed(1)}% - ${chunk.id}`);
        });
        
        // Step 5: Construct optimized context with smart truncation
        console.log('📄 Constructing optimized context...');
        
        // Smart context construction - prioritize by similarity and diversity
        let contextParts = [];
        let totalLength = 0;
        
        for (let i = 0; i < relevantChunks.length; i++) {
            const chunk = relevantChunks[i];
            const confidence = (chunk.similarity * 100).toFixed(1);
            const header = `[Source ${i + 1}: ${chunk.metadata.source} - Relevance: ${confidence}%]`;
            const content = chunk.document.trim();
            const part = `${header}\n${content}`;
            
            // Check if adding this chunk would exceed limit
            if (totalLength + part.length + 50 > MAX_CONTEXT_LENGTH && contextParts.length > 0) {
                console.log(`⚠️ Context size limit reached, using ${contextParts.length}/${relevantChunks.length} chunks`);
                break;
            }
            
            contextParts.push(part);
            totalLength += part.length + 50; // +50 for separators
        }
        
        const context = contextParts.join('\n\n=== === ===\n\n');
        console.log(`✅ Optimized context constructed (${context.length} characters from ${contextParts.length} chunks)`);
        
        // Step 6: Use the selected model and handle images
        const modelToUse = selectedModel;
        
        // Check if image is provided and if model supports vision
        const isVisionModel = modelToUse.toLowerCase().includes('llava') || 
                             modelToUse.toLowerCase().includes('bakllava') || 
                             modelToUse.toLowerCase().includes('moondream');
        
        // Enhanced system prompt for better accuracy
        const systemPrompt = `You are an expert industrial safety consultant specializing in European regulations and standards. Your expertise covers:

• Machinery Directive (2006/42/EC)
• Low Voltage Directive (2014/35/EU)  
• EMC Directive (2014/30/EU)
• Harmonized safety standards (EN ISO 13849, EN 62061, etc.)
• Risk assessment methodologies
• CE marking requirements

INSTRUCTIONS:
1. Base your answers STRICTLY on the provided context sources
2. Quote specific sections, clauses, or requirements when possible
3. If information is incomplete, state what's missing clearly
4. Provide practical, actionable guidance
5. Reference the specific source document and section
6. If the context doesn't contain the answer, say so explicitly

ANSWER FORMAT:
- Start with a direct answer to the question
- Support with specific citations from the context
- Explain any technical requirements clearly
- Mention relevant standards or directive sections`;

        let messages;
        if (imageBase64 && isVisionModel) {
            // Vision model with image
            console.log('🖼️ Using vision model with enhanced prompting...');
            messages = [
                {
                    role: 'system',
                    content: systemPrompt + '\n\nAdditionally, analyze any provided images focusing on safety compliance, standard requirements, and regulatory aspects.'
                },
                {
                    role: 'user',
                    content: `CONTEXT SOURCES:\n${context}\n\n===================\n\nQUESTION: ${userQuery}\n\nPlease analyze the provided image and answer the question based on both the image content and the context sources above. Be specific about which source supports your answer.`,
                    images: [imageBase64]
                }
            ];
        } else if (imageBase64 && !isVisionModel) {
            // Image provided but not a vision model
            console.log('⚠️ Image provided but model does not support vision. Processing text only.');
            messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `CONTEXT SOURCES:\n${context}\n\n===================\n\nQUESTION: ${userQuery}\n\nNote: An image was provided but cannot be processed by the current model. Please answer based solely on the context sources above.`
                }
            ];
        } else {
            // Text-only query
            messages = [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: `CONTEXT SOURCES:\n${context}\n\n===================\n\nQUESTION: ${userQuery}\n\nPlease provide a detailed, accurate answer based on the context sources above. Reference specific sources and sections.`
                }
            ];
        }
        
        // Calculate confidence based on top similarity scores
        const topSimilarity = relevantChunks[0]?.similarity || 0;
        const avgTopSimilarity = relevantChunks.slice(0, 3).reduce((sum, chunk) => sum + chunk.similarity, 0) / Math.min(3, relevantChunks.length);
        const confidence = Math.round(avgTopSimilarity * 100);
        
        console.log(`📊 Calculated confidence: ${confidence}% (top similarity: ${(topSimilarity * 100).toFixed(1)}%)`);
        
        // Check if confidence is too low to provide an answer
        if (confidence < 30) {
            console.log('❌ Confidence too low - refusing to answer');
            const lowConfidenceResponse = "I'm sorry, but I'm not confident enough in my knowledge to provide a reliable answer to your question. The available information doesn't seem to closely match what you're asking about.\n\nPlease try:\n• Rephrasing your question with different keywords\n• Being more specific about the context\n• Checking if the topic is covered in the loaded documents";
            
            // Return low confidence result
            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            const systemStats = systemMonitor.stopMonitoring();
            
            return {
                answer: lowConfidenceResponse,
                query: userQuery,
                hasImage: !!imageBase64,
                modelUsed: modelToUse,
                elapsedTime: elapsedTime,
                confidence: confidence,
                confidenceLevel: 'low',
                sources: relevantChunks.slice(0, 3).map(chunk => ({
                    id: chunk.id,
                    source: chunk.metadata.source,
                    similarity: chunk.similarity,
                    content_preview: chunk.document.substring(0, 150) + '...'
                })),
                systemStats: systemStats,
                metadata: {
                    total_chunks_searched: allDocumentChunks.length,
                    relevant_chunks_used: relevantChunks.length,
                    top_similarity: topSimilarity,
                    confidence_score: confidence,
                    embedding_model: EMBEDDING_MODEL,
                    generation_model: modelToUse,
                    elapsed_time_ms: elapsedTime,
                    elapsed_time_formatted: `${(elapsedTime / 1000).toFixed(2)}s`
                }
            };
        }

        console.log(`🤖 Generating response using ${modelToUse}${imageBase64 && isVisionModel ? ' with image analysis' : ''}...`);
        const aiResponse = await generateResponse(modelToUse, messages, signal);
        console.log('✅ Text response generated successfully');
        
        // Step 6: Calculate elapsed time and prepare result object
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;
        
        // Stop monitoring and get system stats
        const systemStats = systemMonitor.stopMonitoring();
        
        // Determine confidence level for visual effects
        let confidenceLevel = 'high';
        if (confidence < 50) {
            confidenceLevel = 'medium-low';
        } else if (confidence < 70) {
            confidenceLevel = 'medium';
        }
        
        const result = {
            answer: aiResponse,
            query: userQuery,
            hasImage: !!imageBase64,
            modelUsed: modelToUse,
            elapsedTime: elapsedTime,
            confidence: confidence,
            confidenceLevel: confidenceLevel,
            sources: relevantChunks.map(chunk => ({
                id: chunk.id,
                source: chunk.metadata.source,
                similarity: chunk.similarity,
                content_preview: chunk.document.substring(0, 150) + '...'
            })),
            systemStats: systemStats,
            metadata: {
                total_chunks_searched: allDocumentChunks.length,
                relevant_chunks_used: relevantChunks.length,
                top_similarity: relevantChunks[0]?.similarity || 0,
                confidence_score: confidence,
                embedding_model: EMBEDDING_MODEL,
                generation_model: modelToUse,
                elapsed_time_ms: elapsedTime,
                elapsed_time_formatted: `${(elapsedTime / 1000).toFixed(2)}s`
            }
        };
        
        console.log(`🎉 RAG process completed successfully in ${(elapsedTime / 1000).toFixed(2)}s`);
        return result;
        
    } catch (error) {
        // Stop monitoring even in error case
        systemMonitor.stopMonitoring();
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