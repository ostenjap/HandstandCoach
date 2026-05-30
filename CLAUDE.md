# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# Core Project Strategy: Cloud builds (EAS), C++ pose pipeline kept

The product is a real-time handstand *coach*: the camera analyzes form frame by
frame. That requires C++ native libraries (`react-native-vision-camera` frame
processors + `react-native-fast-tflite` + worklets). Rather than fight the
Windows C++ toolchain locally, **builds run in the cloud via EAS Build**, so the
Windows 260-char MAX_PATH / Ninja problems never apply.

### Build & run workflow (do NOT rely on local `expo run:android`)
- Native dev client: `eas build --profile development --platform android`
  (compiles C++/CMake on EAS Linux workers, returns an installable APK).
- Install the dev client on a device, then `npx expo start --dev-client` to load JS.
- The C++ never compiles on this Windows machine — local CMake/Ninja/MAX_PATH
  failures are irrelevant under this workflow.
- `expo run:android` *will* still hit the old Windows C++ errors. Use EAS instead.

### Architecture
- `src/coaching/` is the camera-agnostic coaching engine:
  - `analyzePose.ts` — pure, testable handstand logic (worklet-safe).
  - `usePoseCoach.ts` — vision-camera frame processor + TFLite inference.
  - `poseTypes.ts` — keypoint contract.
- `src/screens/CoachScreen.tsx` — UI only; depends on the engine via the hook.
- Keep model/camera concerns out of UI so the engine can move on-device ↔ server.

### Model asset
- `assets/models/movenet-lightning.tflite` is required and not committed.
  See `assets/models/README.md` to fetch it. Metro bundles `.tflite`
  (see `metro.config.js`).

### Required native config (already wired)
- `babel.config.js`: `react-native-worklets-core/plugin` + `react-native-reanimated/plugin`.
- `app.json` plugins: `react-native-vision-camera` (frame processors enabled) + `react-native-fast-tflite`.
