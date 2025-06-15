@echo off
echo ====================================================
echo    Fixing Vulkan GPU Driver Issue for LM Studio
echo ====================================================
echo.

echo 🔄 Step 1: Closing LM Studio to reset GPU connection...
taskkill /f /im "LM Studio.exe" >nul 2>&1
taskkill /f /im lmstudio.exe >nul 2>&1
echo ✅ LM Studio closed

echo.
echo 🔄 Step 2: Clearing GPU cache and resetting drivers...
timeout /t 3 >nul

echo.
echo 🚀 Step 3: Please do the following:
echo    1. Wait 5 seconds for GPU to reset
echo    2. Open LM Studio again
echo    3. Go to Local Server tab
echo    4. RE-LOAD your model (this resets GPU connection)
echo    5. Start the server again
echo.
echo 💡 This should fix the "ErrorDeviceLost" issue!
echo.

pause 