// Simple script to test a single query against your knowledge base
const fs = require('fs');
const path = require('path');
const { getEmbedding } = require('./llm/ollama_client');

const EMBEDDINGS_FILE = path.join(__dirname, 'backend', 'embedding_db', 'embeddings.json');

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function singleSearch() {
    // Get query from command line or use default
    const query = process.argv[2] || "What are the safety requirements for industrial machinery?";
    
    console.log('=== Industrial Automation AI Assistant - Single Search ===\n');
    console.log(`🔍 Question: "${query}"\n`);
    
    try {
        // Load embeddings
        console.log('📊 Loading knowledge base...');
        const data = fs.readFileSync(EMBEDDINGS_FILE, 'utf8');
        const embeddings = JSON.parse(data);
        console.log(`   ✅ Loaded ${embeddings.length} chunks\n`);
        
        // Get query embedding
        console.log('🤖 Processing your question...');
        const queryEmbedding = await getEmbedding(query);
        console.log('   ✅ Question processed\n');
        
        // Find similar chunks
        console.log('🔍 Searching for relevant information...');
        const similarities = embeddings.map(chunk => ({
            ...chunk,
            similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }));
        
        // Sort by similarity
        similarities.sort((a, b) => b.similarity - a.similarity);
        console.log('   ✅ Search complete\n');
        
        // Show top 3 results
        console.log('📋 Most Relevant Information Found:\n');
        for (let i = 0; i < 3; i++) {
            const result = similarities[i];
            console.log(`${i + 1}. RELEVANCE: ${(result.similarity * 100).toFixed(1)}%`);
            console.log(`   SOURCE: ${result.metadata.source}`);
            console.log(`   CONTENT: "${result.document.trim()}"`);
            console.log(`   ${'─'.repeat(80)}`);
        }
        
        // Quality assessment
        const topSimilarity = similarities[0].similarity;
        console.log('\n📊 Search Quality Assessment:');
        if (topSimilarity > 0.7) {
            console.log('   🟢 EXCELLENT - Very relevant information found!');
        } else if (topSimilarity > 0.5) {
            console.log('   🟡 GOOD - Relevant information found.');
        } else if (topSimilarity > 0.3) {
            console.log('   🟠 FAIR - Some related information found.');
        } else {
            console.log('   🔴 POOR - Limited relevant information found.');
        }
        
        console.log('\n💡 Usage: node test_single_search.js "your question here"');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

singleSearch(); 