# How the Computer Vision Works (Plain English)

A guide to *your* pose pipeline, so you understand what every piece does.

---

## The 30-second mental model

```
Camera frame  ──►  Resize to 192x192  ──►  MoveNet model  ──►  17 keypoints
                                                                     │
        Feedback on screen  ◄──  analyzePose()  ◄────────────────────┘
```

Every frame the camera produces, a few times per second, gets shrunk, fed to an
AI model that finds 17 body joints, and those joints get scored by your own
handstand logic. The result is the coaching message you see.

---

## The players (which file does what)

| File | Job |
|---|---|
| `src/screens/CoachScreen.tsx` | Shows the camera + the feedback card. UI only. |
| `src/coaching/usePoseCoach.ts` | The engine. Runs the model on each frame. |
| `src/coaching/analyzePose.ts` | Pure handstand logic. No camera, no model — just math. |
| `src/coaching/poseTypes.ts` | The contract: what a "keypoint" and a "pose" are. |
| `assets/models/movenet-lightning.tflite` | The actual AI model (a file of trained numbers). |

The golden rule: **the model/camera stuff lives in `usePoseCoach`, the thinking
lives in `analyzePose`.** You can change one without breaking the other.

---

## Step by step (what happens to one frame)

### 1. The camera produces a frame
`react-native-vision-camera` hands each camera frame to a **frame processor** —
a function that runs on a fast background thread (a "worklet"), not the slow
JS/UI thread. That's why it can keep up with live video.

### 2. We throttle it
We don't run the model on *every* frame (too expensive, drains battery). The
`lastRun` shared value skips frames so we only analyze every `150ms` (~6–7x per
second). That's plenty for coaching and keeps the phone cool.

### 3. We resize the frame to 192×192
`vision-camera-resize-plugin` shrinks the frame to **192×192 pixels, RGB,
uint8**. Why? Because MoveNet Lightning was trained on exactly that size and
format. Feed it anything else and you get garbage or a crash. Smaller = faster,
which is the whole point of the "Lightning" model.

### 4. MoveNet finds the body
`react-native-fast-tflite` runs the `.tflite` model on the resized image:
```ts
const outputs = tfModel.runSync([resized]);
```
MoveNet is a **pose estimation** model. It outputs **17 keypoints** — nose, eyes,
shoulders, elbows, wrists, hips, knees, ankles — each with:
- an `x` and `y` position (normalized 0–1, i.e. fraction of the image), and
- a `score` (confidence 0–1: "how sure am I this is really the wrist?").

### 5. We decode the raw numbers
The model returns a flat list of 51 numbers (17 joints × 3 values). `decodePose()`
in `analyzePose.ts` turns that into a friendly object like
`pose.leftShoulder = { x, y, score }`.

### 6. We judge the handstand
`analyzePose()` is pure math on those keypoints:
- **Is the person inverted?** If the hips are *higher in the frame* than the
  shoulders, they're probably upside down. (Remember: image `y` grows downward,
  so "higher" means a *smaller* y.)
- **How straight is the line?** A good handstand stacks wrists → shoulders → hips
  → ankles in a vertical column. We measure how far each drifts sideways from the
  shoulders. Less drift = higher `alignmentScore`.
- It returns a `CoachFeedback`: inverted yes/no, a 0–1 score, and a message.

### 7. We show it on screen
The worklet runs on a background thread, but React UI lives on the JS thread.
`onFeedback` (built with `useRunOnJS`) safely hands the result back across that
boundary so `CoachScreen` can render the message.

---

## Why each library exists

- **react-native-vision-camera** — gives raw camera frames (plain camera apps can't).
- **react-native-worklets-core** — lets the frame processor run on a fast thread.
- **vision-camera-resize-plugin** — fast native resize into the model's required shape.
- **react-native-fast-tflite** — actually runs the `.tflite` model on the phone (on-device, no internet).

---

## Things to know / current limitations

- **Confidence matters.** A keypoint with a low `score` (< 0.3) is unreliable —
  the code ignores those when averaging. If lighting is bad or the body is
  partly out of frame, scores drop and feedback gets noisy.
- **MoveNet is trained mostly on upright people.** It works on handstands (you
  tested it!), but accuracy on inverted bodies is the weakest link. Watch for
  swapped or jittery joints.
- **No smoothing yet.** Each frame is judged independently, so the message can
  flicker. A future improvement is to average keypoints over the last few frames.
- **Coordinates assume a normal upright frame.** If the phone is rotated/propped
  oddly, the x/y logic in `analyzePose` may need adjusting.

---

## Where to tinker

- **Make it stricter/looser:** the thresholds in `analyzePose.ts`
  (`alignmentScore`, the `0.05` hip/shoulder offsets).
- **Run more/less often:** `ANALYZE_EVERY_MS` in `usePoseCoach.ts`.
- **Swap the model:** change the `require(...)` path and the `scale`/`dataType`
  in `usePoseCoach.ts` to match the new model's expected input.
