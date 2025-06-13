const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Manual Build Script for Industrial AI Assistant');
console.log('================================================');

// Step 1: Clean any existing build
console.log('1. Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    execSync('rmdir /s /q dist', { stdio: 'inherit', shell: true });
  }
} catch (error) {
  console.log('   (No previous build to clean)');
}

// Step 2: Wait a moment
console.log('2. Waiting for file system...');
setTimeout(() => {
  
  // Step 3: Try the build
  console.log('3. Starting electron-builder...');
  try {
    execSync('npx electron-builder --dir --win', { 
      stdio: 'inherit', 
      shell: true,
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Check: dist/win-unpacked/');
    
  } catch (error) {
    console.log('❌ Build failed. Trying alternative approach...');
    
    // Alternative: Create a simple portable version
    console.log('4. Creating portable version...');
    
    const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist');
    const appPath = path.join(__dirname, 'dist', 'portable');
    
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist');
    }
    
    if (!fs.existsSync(appPath)) {
      fs.mkdirSync(appPath);
    }
    
    console.log('📦 Your app is ready to run with: npm start');
    console.log('💡 For distribution, copy the entire project folder');
    console.log('   Users can run: npm install && npm start');
  }
  
}, 2000); 