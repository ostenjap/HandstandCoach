Here's a tight plan. The key realization up front: you don't need per-step detectors. One pose detector serves every step — because MoveNet always returns the same 17 keypoints regardless of body orientation, and your analyzePose(pose, stepId) already does the per-step interpretation. The simulator already proves this contract: it produces 17 keypoints and feeds them to analyzePose. Going "real" just means swapping the source of those keypoints from generate*Pose() to the camera — everything downstream stays.

The one decision that shapes everything
expo-camera can't do real-time ML — it gives you a preview, not per-frame pixel buffers for inference (you'd be stuck calling takePictureAsync in a loop: slow, laggy, useless for coaching). Real-time pose detection requires react-native-vision-camera frame processors + react-native-fast-tflite — which is exactly the stack your CLAUDE.md originally specified and the movenet-lightning.tflite model is already sitting in assets/ for. So step 1 is pivoting the camera layer back to that stack.

The plan
Phase 0 — Native stack swap (1 build)

Add react-native-vision-camera, react-native-fast-tflite, react-native-worklets-core, react-native-reanimated; remove expo-camera.
Add their config plugins to app.json and re-run expo prebuild (you have a committed android/ dir, so plugins won't auto-apply otherwise).
One fresh EAS dev-client build. This is the only native rebuild needed for the whole effort.
Phase 1 — The single shared pose engine (the heart of it)

In usePoseCoach.ts, replace the setInterval + generate*Pose() functions with a useFrameProcessor that, every frame: runs MoveNet via fast-tflite → gets 17 keypoints → packs them into the existing Pose shape.
MoveNet's output order is COCO-17, which already matches your KeypointName enum 1:1 — no remapping table needed.
Throttle to ~10–15 fps and hand results back to JS via runOnJS/shared value. This single processor is what
<truncated 317 bytes>
ect + mirrored, the skeleton overlay just works.
Phase 3 — Derive state from the body, not buttons

Today, KICK UP / FALL DOWN / Perfect / Banana drive a fake state machine and the hold-time/rep counters.
Replace with pose-derived state: use analyzePose's isInverted / isSuccess to auto-detect "in position," and accumulate holdTime/reps + PR updates from that. analyzePose.ts itself stays untouched — it's already the universal per-step judge.
Keep the simulator behind a __DEV__ debug toggle so you can still test logic without contorting in front of the camera.
Phase 4 — Inverted-pose accuracy (the real risk)

MoveNet is trained mostly on upright people; upside-down handstands and hands-and-knees poses will detect worse. This is the part most likely to need iteration, not a one-shot.
Mitigations, cheapest first: (a) rotate the frame 180° before inference for the inverted steps (6–11) so the model sees an "upright" person; (b) lower the keypoint confidence threshold for those steps; (c) smooth keypoints across frames (EMA) to kill jitter.
Honest scope note
Phases 0–3 are mostly mechanical and low-risk — the contract is already designed for this swap. Phase 4 is where the actual computer-vision difficulty lives, and the hands-and-knees (step 0) + inverted wall work (steps 6–11) are where MoveNet will fight you. Budget real iteration time there.

Want me to start on Phase 0 (the dependency swap + plugin/prebuild wiring) so it's ready to build the moment the current EAS build verifies the camera works? Or hold until you've confirmed the current build runs on your device first?