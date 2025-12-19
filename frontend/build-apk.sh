#!/bin/bash

# Capacitor Android Build Script for PDF Editor Pro
# This script builds the APK for Android

set -e

echo "===== PDF Editor Pro - Android APK Build ====="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    exit 1
fi

# Build the Next.js app for production
echo "📦 Building Next.js application..."
npm run build

# Copy build output to Capacitor webDir
echo "📂 Copying build output to Capacitor..."
rm -rf out
cp -r .next out || mkdir -p out

# Sync Capacitor with Android
echo "🔄 Syncing with Capacitor..."
npx cap sync android

# Build Android APK
echo "🔨 Building Android APK..."
npx cap build android

echo ""
echo "✅ APK build complete!"
echo "📱 APK location: android/app/build/outputs/apk/release/"
echo ""
echo "Next steps:"
echo "1. Connect your Android device via USB"
echo "2. Run: npx cap run android"
echo "3. Or install APK manually using adb"
