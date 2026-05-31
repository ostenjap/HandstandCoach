import { useState } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useRunOnJS, useSharedValue } from 'react-native-worklets-core';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { analyzePose, decodePose } from './analyzePose';
import type { CoachFeedback } from './poseTypes';

const MODEL = require('../../assets/models/movenet-lightning.tflite');

// Throttle inference so we run the model a few times a second, not per frame.
const ANALYZE_EVERY_MS = 150;

export interface PoseCoach {
  feedback: CoachFeedback | null;
  modelReady: boolean;
  frameProcessor: ReturnType<typeof useFrameProcessor>;
}

export function usePoseCoach(): PoseCoach {
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const model = useTensorflowModel(MODEL);
  const { resize } = useResizePlugin();

  const onFeedback = useRunOnJS((next: CoachFeedback) => {
    setFeedback(next);
  }, []);

  // Capture the loaded TensorflowModel itself (or undefined). This is what the
  // worklet closes over, so we never reach into `.model` on an unloaded plugin.
  const tfModel = model.state === 'loaded' ? model.model : undefined;

  // Worklet-shared throttle clock (safe across the JS/worklet boundary).
  const lastRun = useSharedValue(0);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (tfModel == null) return;

      // Skip frames to keep inference cheap.
      const now = Date.now();
      if (now - lastRun.value < ANALYZE_EVERY_MS) return;
      lastRun.value = now;

      const resized = resize(frame, {
        scale: { width: 192, height: 192 },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      const outputs = tfModel.runSync([resized]);
      const pose = decodePose(outputs[0] as unknown as Float32Array);
      onFeedback(analyzePose(pose));
    },
    [tfModel, resize, onFeedback, lastRun]
  );

  return { feedback, modelReady: model.state === 'loaded', frameProcessor };
}
