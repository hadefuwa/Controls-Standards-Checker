@echo off
echo ====================================================
echo         LM Studio Setup for AMD RX 570
echo ====================================================
echo.
echo 📋 STEP 1: Download LM Studio
echo    1. Go to: https://lmstudio.ai/
echo    2. Click "Download for Windows"
echo    3. Install the .exe file (it's free!)
echo.
echo 📋 STEP 2: After installing LM Studio:
echo    1. Open LM Studio
echo    2. Go to Settings (gear icon)
echo    3. Enable "GPU Acceleration" 
echo    4. Select "DirectML" (for AMD GPUs)
echo.
echo 📋 STEP 3: Download a model:
echo    1. Click "Search" tab in LM Studio
echo    2. Search for "phi-3-mini" (good starter model)
echo    3. Click Download
echo.
echo 📋 STEP 4: Start the server:
echo    1. Click "Local Server" tab
echo    2. Select your downloaded model
echo    3. Click "Start Server"
echo    4. Should start on port 1234
echo.
echo ✅ When done, run: node test_lm_studio.js
echo.
pause 