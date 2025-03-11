#!/bin/bash

# 🔥 WhatsAppLocker Windows Build Script
# ✅ Builds a Windows installer from macOS
# ✅ Compresses the final `.exe` using UPX

echo "🚀 Starting Windows build process..."

# Step 1: Clean previous builds
echo "🧹 Cleaning old builds..."
rm -rf dist/

# Step 2: Compile TypeScript (if applicable)
echo "🔨 Compiling TypeScript..."
tsc || { echo "❌ TypeScript compilation failed!"; exit 1; }

# Step 3: Run Electron Builder for Windows
echo "📦 Building Windows .exe package..."
npx electron-builder --win --x64 || { echo "❌ Build failed!"; exit 1; }

# Step 4: Find the generated .exe file
EXE_FILE=$(find dist -name "*.exe" | head -n 1)

if [ -z "$EXE_FILE" ]; then
    echo "❌ No .exe file found! Build might have failed."
    exit 1
fi

echo "✅ Windows installer generated: $EXE_FILE"

# Step 5: Compress the .exe using UPX
echo "📦 Compressing .exe with UPX..."
upx --best --lzma "$EXE_FILE" || { echo "⚠️ UPX compression failed! Skipping..."; }

echo "🎉 Build complete! Optimized .exe located at: $EXE_FILE"