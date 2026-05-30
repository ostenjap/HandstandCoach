# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Core Project Strategy: Zero C++ (Pure Kotlin/Java Camera) on Windows

To avoid persistent Windows compiler errors, this project uses a C++-free build path.

### 1. The Core Windows C++ Conflict
React Native C++ libraries (such as `react-native-vision-camera`, `react-native-reanimated`, and C++ Nitro modules) compile via CMake using Ninja. On Windows, this setup regularly fails with:
- **Ninja Dirty Manifest Loop**: `ninja: error: manifest 'build.ninja' still dirty after 100 tries`. Triggered by the legacy Windows 260-character path limit (MAX_PATH) truncating deep files under `.cxx`.
- **Active File Locks**: Attempting to clean native artifacts while Android Studio is running throws a process conflict because the IDE locks compiling objects.

### 2. The Solution: Zero C++ / Pure Kotlin/Java Camera
We completely uninstalled native C++ libraries and use **`expo-camera`** (`CameraView`).
- **No C++ or CMake**: `expo-camera` is written in 100% Kotlin/Java (Android) and Swift (iOS).
- **Fast Iteration**: Gradle builds bypass CMake/Ninja entirely. Build sync times dropped to **20 seconds**!

### 3. Essential Troubleshoot Guide for Future Agents

#### A. Wiping Autolink Caches After Uninstalls
When uninstalling native libraries, the old autolink files (`Android-autolinking.cmake`) are cached inside Gradle build folders. This causes CMake configure errors on subsequent syncs. 
*   **Fix**: Force-delete the generated build cache directories before syncing:
    ```powershell
    Remove-Item -Recurse -Force android/app/build
    Remove-Item -Recurse -Force android/build
    ```

#### B. Expo Core Windows PCH Path Bug
In `node_modules/expo-modules-core/android/build.gradle`, Groovy's `.replaceAll()` strips Windows backslashes during `generateStubPCH`. 
*   **Fix**: Ensure `escapedPath` uses `java.util.regex.Matcher.quoteReplacement(stubHeader.absolutePath)`.
*   **Ninja Prevention**: Ensure `"-DCMAKE_NINJA_REGENERATE_ON_CHANGE=OFF"` is appended inside the `cppArguments` list under the `cmake` config.

