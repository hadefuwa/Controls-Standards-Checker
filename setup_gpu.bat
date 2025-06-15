@echo off
echo Setting up AMD GPU acceleration for Ollama (RX 570)

REM Set environment variables for AMD GPU
setx HIP_VISIBLE_DEVICES "0"
setx HSA_OVERRIDE_GFX_VERSION "9.0.0"
setx ROCM_VERSION "5.7.0"

REM Kill any running Ollama processes
taskkill /f /im ollama.exe >nul 2>&1

echo GPU environment variables set. Restart your terminal or computer for changes to take effect.
echo Then restart Ollama service.

pause 