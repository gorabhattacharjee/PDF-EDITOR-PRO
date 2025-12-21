# Try to find adb in the default Windows location if it's not in PATH
ADB_PATH="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"

if command -v adb &> /dev/null
then
    adb install -r C:\pdf-editor-pro\frontend\android\app\build\outputs\apk\debug\app-debug.apk
elif [ -f "$ADB_PATH" ]; then
    "$ADB_PATH" install -r C:\pdf-editor-pro\frontend\android\app\build\outputs\apk\debug\app-debug.apk
else
    echo "Error: adb not found. Please connect your phone and ensure USB debugging is on."
fi
