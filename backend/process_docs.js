// Document processing script for Industrial Automation AI Assistant
// This script reads text files, chunks them, and stores them with embeddings in JSON files

const fs = require('fs');
const path = require('path');
const { getEmbedding } = require('../llm/ollama_client');

// Configuration
const SOURCE_DOCS_DIR = path.join(__dirname, 'source_docs');
const EMBEDDING_DB_PATH = path.join(__dirname, 'embedding_db');
const CHUNK_SIZE = 300; // Approximate words per chunk
const EMBEDDINGS_FILE = path.join(EMBEDDING_DB_PATH, 'embeddings.json');

/**
 * Split text into chunks of approximately 300 words
 * @param {string} text - The text to chunk
 * @param {string} filename - The filename for logging
 * @returns {Array<string>} - Array of text chunks
 */
function chunkText(text, filename) {
    console.log(`Chunking text from ${filename}...`);
    
    // Split text into words
    const words = text.split(/\s+/).filter(word => word.length > 0);
    console.log(`Total words in ${filename}: ${words.length}`);
    
    const chunks = [];
    
    // Create chunks of approximately CHUNK_SIZE words
    for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
        if (chunk.trim().length > 0) {
            chunks.push(chunk);
        }
    }
    
    console.log(`Created ${chunks.length} chunks from ${filename}`);
    return chunks;
}

/**
 * Read all .txt files from the source documents directory
 * @returns {Array<Object>} - Array of {filename, content} objects
 */
function readSourceDocuments() {
    console.log('Reading source documents from:', SOURCE_DOCS_DIR);
    
    // Check if the source docs directory exists
    if (!fs.existsSync(SOURCE_DOCS_DIR)) {
        throw new Error(`Source documents directory not found: ${SOURCE_DOCS_DIR}`);
    }
    
    // Get all files in the directory
    const files = fs.readdirSync(SOURCE_DOCS_DIR);
    console.log('Files found:', files);
    
    // Filter for .txt files only
    const txtFiles = files.filter(file => file.endsWith('.txt'));
    console.log('Text files found:', txtFiles);
    
    if (txtFiles.length === 0) {
        throw new Error('No .txt files found in source documents directory');
    }
    
    const documents = [];
    
    // Read each text file
    for (const filename of txtFiles) {
        const filePath = path.join(SOURCE_DOCS_DIR, filename);
        console.log(`Reading file: ${filename}`);
        
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.trim().length === 0) {
                console.log(`Warning: ${filename} is empty, skipping...`);
                continue;
            }
            
            documents.push({
                filename: filename,
                content: content
            });
            
            console.log(`Successfully read ${filename} (${content.length} characters)`);
        } catch (error) {
            console.error(`Error reading ${filename}:`, error.message);
            throw error;
        }
    }
    
    return documents;
}

/**
 * Initialize local storage for embeddings
 */
function initializeStorage() {
    console.log('Initializing local storage...');
    
    // Create embedding directory if it doesn't exist
    if (!fs.existsSync(EMBEDDING_DB_PATH)) {
        fs.mkdirSync(EMBEDDING_DB_PATH, { recursive: true });
        console.log(`Created directory: ${EMBEDDING_DB_PATH}`);
    }
    
    // Clear existing embeddings file (to avoid duplicates on re-runs)
    if (fs.existsSync(EMBEDDINGS_FILE)) {
        fs.unlinkSync(EMBEDDINGS_FILE);
        console.log('Cleared existing embeddings file');
    }
    
    console.log('Storage initialized successfully');
}

/**
 * Save embeddings to JSON file
 * @param {Array} embeddings - Array of embedding objects
 */
function saveEmbeddings(embeddings) {
    console.log(`Saving ${embeddings.length} embeddings to file...`);
    
    try {
        fs.writeFileSync(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2));
        console.log(`Successfully saved embeddings to: ${EMBEDDINGS_FILE}`);
    } catch (error) {
        console.error('Error saving embeddings:', error.message);
        throw error;
    }
}

/**
 * Process all documents and store them with embeddings
 */
async function processDocuments() {
    console.log('=== Starting Document Processing ===');
    
    try {
        // Step 1: Read all source documents
        const documents = readSourceDocuments();
        console.log(`Found ${documents.length} documents to process`);
        
        // Step 2: Initialize local storage
        initializeStorage();
        
        // Step 3: Process each document
        const allEmbeddings = [];
        let totalChunks = 0;
        
        for (const document of documents) {
            console.log(`\n--- Processing file: ${document.filename} ---`);
            
            // Chunk the document
            const chunks = chunkText(document.content, document.filename);
            
            // Process each chunk
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const chunkId = `${document.filename}-chunk-${i + 1}`;
                
                console.log(`Processing chunk ${i + 1}/${chunks.length} from ${document.filename}...`);
                
                try {
                    // Get embedding for this chunk
                    const embedding = await getEmbedding(chunk);
                    
                    // Store embedding data
                    const embeddingData = {
                        id: chunkId,
                        document: chunk,
                        embedding: embedding,
                        metadata: {
                            source: document.filename,
                            chunk_index: i + 1,
                            total_chunks: chunks.length,
                            processed_at: new Date().toISOString()
                        }
                    };
                    
                    allEmbeddings.push(embeddingData);
                    console.log(`Successfully processed chunk: ${chunkId}`);
                    totalChunks++;
                    
                } catch (error) {
                    console.error(`Error processing chunk ${chunkId}:`, error.message);
                    throw error;
                }
            }
            
            console.log(`Completed processing ${document.filename} - processed ${chunks.length} chunks`);
        }
        
        // Step 4: Save all embeddings to file
        saveEmbeddings(allEmbeddings);
        
        console.log(`\n=== Processing Complete ===`);
        console.log(`Total documents processed: ${documents.length}`);
        console.log(`Total chunks stored: ${totalChunks}`);
        console.log(`Embeddings saved to: ${EMBEDDINGS_FILE}`);
        console.log('All documents processed and stored successfully.');
        
    } catch (error) {
        console.error('\n=== Processing Failed ===');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Run the processing when this script is executed directly
if (require.main === module) {
    processDocuments();
} 