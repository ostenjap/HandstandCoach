# CV V2 — Change Log (Step 0 First: Real On-Device Pose Detection)

This pass replaced the **simulated** pose pipeline with **real on-device MoveNet
inference** running on the live camera. One frame processor feeds every step; Step 0
(wrist rocks) is the proven-first slice.

## Summary

Before: `expo-camera` preview + `usePoseCoach` generating **fake** keypoints on a timer,
driven by KICK UP / FALL DOWN / Perfect / Banana buttons.

After: `react-native-vision-camera` frame processor → resize → **MoveNet via
`react-native-fast-tflite`** → `decodePose` → existing `analyzePose` → body-driven hold
timer. No simulator buttons.

---

## Dependencies

**Added**
- `react-native-vision-camera@^4.7.3` — frame processors (the **v4** line; v5 is a nitro
  rewrite that dropped `useFrameProcessor` and is incompatible with the resize/tflite
  ecosystem, so it was explicitly downgraded).
- `react-native-fast-tflite@^3.0.1` — runs the `.tflite` model in the worklet.
- `react-native-nitro-modules@0.35.9` — required peer of fast-tflite v3 (Nitro).
- `react-native-worklets-core@^1.6.3` — worklet thread + JS bridge (`createRunOnJS`).
- `vision-camera-resize-plugin@^3.2.0` — resizes/format-converts each frame to the
  model's input tensor (also does front-camera `mirror`).

**Removed**
- `expo-camera` — cannot do real-time per-frame ML.

> `react-native-reanimated` was deliberately **not** added — the app uses RN's built-in
> `Animated`, so we avoid the documented reanimated/worklets JSI conflict.

## Native config

- `app.json` plugins → just `["react-native-fast-tflite"]`. (vision-camera v4's Expo
  plugin is autolinked; v5 has none. worklets/resize have no config plugin.)
- `babel.config.js` → added `react-native-worklets-core/plugin` (required for worklet
  frame processors).
- `android/app/build.gradle` → added `noCompress += ['tflite']` under `androidResources`
  so fast-tflite can memory-map the model from the APK.
- New Architecture (`newArchEnabled=true`) confirmed on — required by Nitro/fast-tflite.
- `CAMERA` permission already present in the native `AndroidManifest.xml`.

## Code

### `src/coaching/usePoseCoach.ts` (rewritten)
- Loads `assets/models/movenet-lightning.tflite` via `useTensorflowModel(source, [])`
  (CPU delegate for portability).
- `useFrameProcessor` worklet each frame: `resize → 192×192 rgb uint8 (mirror:true) →
  model.runSync([buffer]) → Float32Array → decodePose`, handed to JS via
  `Worklets.createRunOnJS`.
- **Body-driven timing:** hold timer accumulates real elapsed seconds while
  `analyzePose(...).isSuccess` is true; resets when you drop out (timer steps). PR is
  persisted as the hold grows.
- Exposes `device`, `hasPermission`, `requestPermission`, `frameProcessor` for the screen.
- Deleted: the `setInterval` simulator, all `generate*Pose()` functions, and the
  `simulationState` / `formQuality` / `triggerKickUp` / `triggerFallDown` API.

### `src/screens/CoachScreen.tsx`
- Renders `<Camera device={device} isActive frameProcessor={frameProcessor} fps={10} />`
  (was `expo-camera`'s `<CameraView>`).
- Permission flow uses vision-camera's `useCameraPermission`; added a "no camera" state.
- Status badge now reflects real state: `LOADING POSE MODEL… / SEARCHING FOR BODY… /
  POSE TRACKING LIVE`.
- Removed the simulator control panel + form-quality selector; replaced with a single
  **END DRILL** button (`onBack`). Skeleton overlay (`renderBones`/`renderJoints`)
  unchanged — it draws the real `activePose`.

### Unchanged on purpose
- `src/coaching/analyzePose.ts` — the universal per-step judge. `decodePose` was already
  worklet-safe and matches MoveNet's COCO-17 order, so it's reused as-is.

---

## How the pieces map to the plan
- Phase A (native swap) ✅  · Phase B (frame processor) ✅  · Phase C (mirror/coords) ✅
  via resize `mirror` · Phase D (body-driven timer) ✅.

## Post-build fixes (device testing round 1)

Two runtime errors surfaced on-device and were fixed:

1. **`fps requires a format`** (vision-camera): removed the `fps` prop from `<Camera>`
   and throttle inference inside the worklet with `runAtTargetFps(10, …)` instead
   (no `format` needed). JS-only.
2. **`HybridTfliteModelSpec.outputs … does not have a NativeState`** (render crash):
   fast-tflite **v3 (Nitro)** could not share the model HybridObject into the worklet
   runtime. Downgraded to **fast-tflite `1.5.1`** — the pure-JSI version (plain JSI host
   objects are natively worklet-shareable) — and **removed `react-native-nitro-modules`**.
   - Note: `1.6.0/1.6.1/2.0.0` are mis-packaged (reference an unpublished `spec/`
     codegen dir) and fail to bundle; `1.5.1` is the last clean JSI release.
   - API is the same shape the hook already used: `useTensorflowModel(source, delegate?)`
     and `runSync(TypedArray[]) → TypedArray[]` (pass the `Uint8Array` directly).

## Known limitations / next
- **Step 0 is the proven target** (non-inverted, forgiving check `shoulderY/hipY > 0.5`).
- **Inverted steps (6–11) will detect worse** — MoveNet is trained on upright people.
  The resize plugin already exposes `rotation`, so the Phase-4 fix (rotate frame 180°
  for inverted steps) is a small follow-up.
- **Rep steps (3/5/8/9)** currently accumulate like a timer; real rep-counting from pose
  cycles is a later addition.
- **Aspect ratio:** frames are stretched to a square for the model; overlay alignment is
  approximate on a `cover` preview. Fine for Step 0; tighten later if needed.
- **Model input dtype** assumed `uint8 192×192` (standard MoveNet Lightning). If keypoints
  look wrong, that's the first thing to verify.
