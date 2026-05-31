# Package Issues & Fix Plan
> Written for the next agent picking this up. Read this before touching any dependencies.

---

## Root Cause: Two Conflicting Worklet Runtimes

This is the primary source of instability. Two packages are fighting over the same JSI thread:

| Package | Worklet Runtime It Uses |
|---|---|
| `react-native-vision-camera` v4 | `react-native-worklets-core` (Margelo) |
| `react-native-reanimated` v4.3.1 | `react-native-worklets` (Software Mansion) |

These are **two different packages** with similar names. Both register a JSI runtime. Having both installed causes native-level conflicts and unpredictable crashes. The frame processor babel plugin for one can also clobber the other.

### Fix
**Remove `react-native-reanimated` entirely.** The coaching feature (`src/coaching/usePoseCoach.ts`) only needs frame processors, which only require `react-native-worklets-core`. Reanimated adds nothing to the current codebase and 100% of the conflict. Add it back only when animated UI is actually needed (skeleton overlays, progress bars), and at that point audit version compatibility against worklets-core before installing.

---

## Secondary Issue: Expo Core Packages Are Outdated

`npx expo install --check` flags these:

| Package | Installed | Expected |
|---|---|---|
| `expo` | `56.0.4` | `~56.0.8` |
| `expo-dev-client` | `56.0.15` | `~56.0.18` |

### Fix
Run `npx expo install --fix` — Expo's resolver auto-corrects both to the versions it tested together. **Always run this after any package change.** Never manually pick version numbers for Expo-ecosystem packages; let the resolver drive them.

---

## Secondary Issue: Missing Model Asset

`src/coaching/usePoseCoach.ts` has a hard `require('../../assets/models/movenet-lightning.tflite')`. The file is not committed (binary). If missing, the app crashes on launch with an error that looks like a package problem but is actually a missing asset.

### Fix
Download the MoveNet SinglePose Lightning `.tflite` model and place it at:
```
assets/models/movenet-lightning.tflite
```
See `assets/models/README.md` for the exact download source and model spec.

---

## Correct Fix Order

1. **Remove `react-native-reanimated`** from `package.json` and `babel.config.js`.
2. **Run `npx expo install --fix`** to reconcile expo + expo-dev-client versions.
3. **Run `npm install --legacy-peer-deps`** to sync `node_modules`.
4. **Place the `.tflite` model** in `assets/models/` before any on-device test.
5. **Run `eas build --profile development --platform android`** — C++ compiles on EAS Linux workers, not locally. Do not use `expo run:android` (hits Windows MAX_PATH/Ninja errors).

---

## Do Not Touch

- Babel plugin order in `babel.config.js` — `react-native-worklets-core/plugin` must stay **first**, before any other plugin.
- `metro.config.js` — the `tflite` entry in `assetExts` is required for the model to bundle.
- `app.json` plugins — `react-native-vision-camera` with `enableFrameProcessors: true` and `react-native-fast-tflite` must both remain.

---

## Current Healthy Packages (leave these alone)

| Package | Installed Version | Status |
|---|---|---|
| `react-native-vision-camera` | `4.7.3` | ✅ Good |
| `react-native-worklets-core` | `1.6.3` | ✅ Good |
| `react-native-fast-tflite` | `1.6.1` | ✅ Good |
| `vision-camera-resize-plugin` | `3.2.0` | ✅ Good |
| `react-native-reanimated` | `4.3.1` | ❌ Remove |
