#!/bin/bash

# 🔥 WhatsAppLocker macOS Build Script
# ✅ Builds a macOS .dmg installer
# ✅ Compresses the final .app using UPX

echo "🚀 Starting macOS build process..."

# Step 1: Clean previous builds
echo "🧹 Cleaning old builds..."
rm -rf dist/mac
rm -rf dist/WhatsAppLocker.dmg

# Step 2: Compile TypeScript (if applicable)
echo "🔨 Compiling TypeScript..."
tsc || { echo "❌ TypeScript compilation failed!"; exit 1; }

# Step 3: Run Electron Builder for macOS
echo "📦 Building macOS .dmg package..."
npx electron-builder --mac || { echo "❌ Build failed!"; exit 1; }

# Step 4: Find the generated .app file
APP_FILE=$(find dist/mac -name "*.app" | head -n 1)

if [ -z "$APP_FILE" ]; then
    echo "❌ No .app file found! Build might have failed."
    exit 1
fi

echo "✅ macOS app generated: $APP_FILE"

# Step 5: Compress the .app using UPX
echo "📦 Compressing .app with UPX..."
upx --best --lzma "$APP_FILE/Contents/MacOS/WhatsAppLocker" || { echo "⚠️ UPX compression failed! Skipping..."; }

echo "🎉 Build complete! Optimized .app located at: $APP_FILE"