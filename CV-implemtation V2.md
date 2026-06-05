# CV Implementation V2 — Step 0 First (Wrist Rocks)

## Strategy: one engine, proven on one pose

We are replacing the **fake** keypoint source (the `setInterval` + `generate*Pose()`
functions in `usePoseCoach.ts`) with **real** on-device MoveNet inference.

The architecture is already designed for this swap:

- `analyzePose(pose, stepId)` is the single, universal per-step judge — it does not
  care where the 17 keypoints came from.
- `decodePose(output)` **already exists** in `analyzePose.ts`, is already
  `'worklet'`-safe, and already maps MoveNet's flat `[y, x, score] × 17` output into
  the `Pose` shape.
- The skeleton overlay (`renderBones` / `renderJoints` in `CoachScreen.tsx`) already
  multiplies normalized coords by `layout.width/height`.

So "real CV" = wire the camera → MoveNet → `decodePose` → existing pipeline. One frame
processor feeds **all** steps. We just **prove it on Step 0 first**, then the remaining
steps are free (same engine, different `stepId`).

## Why Step 0 is the right first slice

- **Not inverted.** Step 0 is hands-and-knees. MoveNet is trained on upright people, so
  this detects far more reliably than the wall/handstand steps (6–11) — we de-risk the
  pipeline without fighting the model's worst case.
- **Forgiving success check.** `analyzePose` step 0 only needs
  `shoulderY > 0.5 && hipY > 0.5` (shoulders + hips in the lower half of frame). No
  fragile angle math to debug while the plumbing is new.
- **Exercises the whole path.** Camera → resize → tflite → decode → overlay → feedback
  → hold timer. If Step 0 works end-to-end, everything structural is done.

---

## Phase A — Native stack swap (one EAS build)

> The only native rebuild for the whole effort. `expo-camera` cannot do real-time
> per-frame ML; we move to vision-camera frame processors.

1. Remove `expo-camera`. Add:
   - `react-native-vision-camera` (frame processors)
   - `react-native-fast-tflite` (runs the `.tflite`)
   - `react-native-worklets-core` (worklet thread for the processor)
   - `react-native-reanimated` (shared values / `runOnJS`)
   - `vision-camera-resize-plugin` (resize+convert frame → model input tensor)
2. `babel.config.js`: add `react-native-worklets-core/plugin` and
   `react-native-reanimated/plugin` (reanimated **last**).
3. `app.json` plugins: `react-native-vision-camera` (frameProcessors enabled) +
   `react-native-fast-tflite`. **Then re-run `npx expo prebuild --clean`** — there is a
   committed `android/` dir, so config plugins do NOT auto-apply during EAS build.
   Verify `CAMERA` stays in `android/app/src/main/AndroidManifest.xml`.
4. `eas build --profile development --platform android`, install the new APK.

**Acceptance:** app launches, `<Camera>` preview renders. No `ExpoCamera`/native-module
errors.

---

## Phase B — The shared pose engine (wired, tested on Step 0)

In `usePoseCoach.ts`:

1. Load the model once: `useTensorflowModel(require('../../assets/models/movenet-lightning.tflite'))`.
2. `const frameProcessor = useFrameProcessor(frame => { 'worklet'; ... }, [...])`:
   - Resize the frame to MoveNet Lightning input **192×192**, `uint8`, RGB
     (via `useResizePlugin`).
   - `const outputs = model.runSync([inputTensor])` → `Float32Array` of length 51.
   - `const pose = decodePose(outputs[0])` (already worklet-safe).
   - Throttle to ~10–15 fps (skip frames via a frame counter / timestamp).
   - Hand the pose back to JS with a `runOnJS` setter (or a Reanimated shared value
     polled by the overlay).
3. Delete `generateStandingPose/KickingUp/Inverted/Bailing` — or keep them behind a
   `USE_SIMULATOR` `__DEV__` flag so logic is still testable off-camera.
4. Keep `const rawFeedback = analyzePose(pose, stepId)` exactly as-is.

**Note (MoveNet output orientation):** MoveNet returns `[y, x, score]`. `decodePose`
already stores `y` then `x` correctly — confirm against a live skeleton, don't assume.

---

## Phase C — Coordinate mapping & overlay (front camera)

- MoveNet coords are normalized `[0,1]` on the **square** model input. The camera frame
  is not square, so account for the center-crop/letterbox offset when mapping to the
  preview, or run the model on a square-cropped region and map within it.
- **Front camera is mirrored:** flip x with `x → 1 - x` before drawing, so the on-screen
  skeleton tracks the user.
- `renderBones`/`renderJoints` already scale by layout — once normalized+mirrored coords
  are correct, the overlay "just works."

**Acceptance (Step 0):** on hands and knees, the dots/bones land on your actual
shoulders, hips, wrists, knees and track as you rock.

---

## Phase D — Step 0 state & timing (no buttons)

Today KICK UP / FALL DOWN / Perfect / Banana drive a fake state machine. For Step 0:

- Drive state from the body: when `analyzePose(...).isSuccess` is true (you're on hands
  and knees), start/continue the hold timer; when it drops, pause it.
- Accumulate `holdTime` from real frames; on reaching `targetPRSeconds`, fire the
  existing `completeStep` / `updatePR` flow (unchanged).
- The simulator control panel can be hidden for Step 0 (or gated behind the `__DEV__`
  flag) so the screen shows the live coach only.

**Acceptance (Step 0):** getting on hands and knees flips the coach message to "Perform
slow wrist rocks…", the HOLD TIME counts up while you hold, and the step auto-completes
at the goal — all with no button presses.

---

## After Step 0: generalizing to Steps 1–11

Nothing in the engine changes. Each remaining step is already implemented in
`analyzePose`; turning it "real" is just confirming detection quality for that body
orientation:

- **Steps 1–5 (floor / pike / box):** mostly upright-ish → should work with the same
  engine, light tuning of thresholds.
- **Steps 6–11 (wall walks, kick-ups, freestanding):** the hard part. MoveNet degrades
  upside-down. Mitigations, cheapest first:
  1. Rotate the frame 180° before inference for inverted steps so the model sees an
     "upright" person, then un-rotate the coords.
  2. Lower the confidence threshold (`MIN_SCORE`) for those steps.
  3. EMA-smooth keypoints across frames to kill jitter.

---

## Risks / watch-list

- **Inverted accuracy (steps 6–11)** — the real CV difficulty; budget iteration, not a
  one-shot. (Step 0 sidesteps this by being non-inverted.)
- **Model input format** — Lightning expects `192×192 uint8`. Wrong size/dtype = garbage
  keypoints. Verify first.
- **Front-camera mirroring & aspect crop** — most common cause of "skeleton is offset."
- **Perf** — run inference on the worklet thread, throttle to ~10–15 fps; never block JS.

---

## Task checklist (Step 0 milestone)

- [ ] Phase A: swap deps, babel/app.json plugins, `prebuild --clean`, EAS build, install
- [ ] Phase B: load model + frame processor + `decodePose` + throttle + `runOnJS`
- [ ] Phase C: normalize + mirror coords; verify live skeleton on hands/knees
- [ ] Phase D: body-driven hold timer + auto-complete for Step 0
- [ ] Verify all four acceptance checks above, then green-light fan-out to other steps
