# Pose model

The coaching engine expects a MoveNet SinglePose model here:

    assets/models/movenet-lightning.tflite

It is not committed (binary). Download it once before building:

1. Go to https://www.kaggle.com/models/google/movenet (TF Lite, "singlepose-lightning")
   or fetch the int8/fp16 `.tflite` directly.
2. Save the file as `movenet-lightning.tflite` in this folder.

Input:  192x192x3 uint8 RGB
Output: 1x1x17x3 float32 (y, x, score per keypoint)

To swap models, update the `require(...)` path and the `scale`/`dataType`
in `src/coaching/usePoseCoach.ts`.
