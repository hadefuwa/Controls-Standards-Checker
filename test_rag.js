// Test script for the RAG (Retrieval Augmented Generation) pipeline
// This tests the complete Industrial Automation AI Assistant functionality

const { answerQuestion, searchOnly } = require('./backend/rag');

async function testRAG() {
    console.log('🤖 Testing Industrial Automation AI Assistant - RAG Pipeline\n');
    
    // Test questions for industrial automation
    const testQuestions = [
        "What are the essential health and safety requirements for machinery?",
        "How should CE marking be applied to industrial equipment?",
        "What documentation is required for machinery compliance?",
        "What are the emergency stop requirements?",
        "How should risk assessment be conducted for machinery?"
    ];
    
    for (let i = 0; i < testQuestions.length; i++) {
        const question = testQuestions[i];
        
        console.log(`${'='.repeat(80)}`);
        console.log(`RAG TEST ${i + 1}/${testQuestions.length}`);
        console.log(`${'='.repeat(80)}`);
        console.log(`❓ QUESTION: ${question}\n`);
        
        try {
            // Test the complete RAG pipeline
            const result = await answerQuestion(question);
            
            // Display results
            console.log('📋 SOURCES USED:');
            result.sources.forEach((source, index) => {
                console.log(`   ${index + 1}. ${source.id} (${(source.similarity * 100).toFixed(1)}% relevance)`);
                console.log(`      Preview: "${source.content_preview}"`);
            });
            
            console.log('\n🤖 AI ASSISTANT ANSWER:');
            console.log('─'.repeat(60));
            console.log(result.answer);
            console.log('─'.repeat(60));
            
            console.log('\n📊 METADATA:');
            console.log(`   • Chunks searched: ${result.metadata.total_chunks_searched}`);
            console.log(`   • Chunks used: ${result.metadata.relevant_chunks_used}`);
            console.log(`   • Top similarity: ${(result.metadata.top_similarity * 100).toFixed(1)}%`);
            console.log(`   • Embedding model: ${result.metadata.embedding_model}`);
            console.log(`   • Generation model: ${result.metadata.generation_model}`);
            
            // Quality assessment
            const topSimilarity = result.metadata.top_similarity;
            console.log('\n🎯 QUALITY ASSESSMENT:');
            if (topSimilarity > 0.7) {
                console.log('   🟢 EXCELLENT - High relevance, should provide accurate answers');
            } else if (topSimilarity > 0.5) {
                console.log('   🟡 GOOD - Relevant information found, answers should be helpful');
            } else if (topSimilarity > 0.3) {
                console.log('   🟠 FAIR - Some related information, answers may be general');
            } else {
                console.log('   🔴 POOR - Limited relevant information found');
            }
            
        } catch (error) {
            console.error('❌ RAG Test Failed:', error.message);
            console.error('   Make sure:');
            console.error('   1. Ollama is running (ollama serve)');
            console.error('   2. phi3:mini model is available (ollama pull phi3:mini)');
            console.error('   3. Embeddings file exists from Phase 2');
            break;
        }
        
        if (i < testQuestions.length - 1) {
            console.log('\n⏳ Waiting 3 seconds before next test...\n');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    }
    
    console.log('\n🎉 RAG Pipeline Testing Complete!');
    console.log('\n💡 To test your own questions, use:');
    console.log('   const { answerQuestion } = require("./backend/rag");');
    console.log('   const result = await answerQuestion("your question");');
}

// Test with a single question if provided via command line
async function testSingleQuestion() {
    const question = process.argv[2];
    
    if (!question) {
        console.log('❓ No question provided. Running full test suite...\n');
        return testRAG();
    }
    
    console.log('🤖 Industrial Automation AI Assistant - Single Question Test\n');
    console.log(`❓ QUESTION: ${question}\n`);
    
    try {
        const result = await answerQuestion(question);
        
        console.log('🤖 AI ASSISTANT ANSWER:');
        console.log('─'.repeat(60));
        console.log(result.answer);
        console.log('─'.repeat(60));
        
        console.log('\n📋 SOURCES:');
        result.sources.forEach((source, index) => {
            console.log(`   ${index + 1}. ${source.id} (${(source.similarity * 100).toFixed(1)}% relevance)`);
        });
        
        console.log(`\n📊 Quality: ${(result.metadata.top_similarity * 100).toFixed(1)}% relevance`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the test
if (require.main === module) {
    testSingleQuestion();
} 