import { useState } from 'react';
import { useFrameProcessor } from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useRunOnJS } from 'react-native-worklets-core';
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

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model.state !== 'loaded') return;

      // Skip frames to keep inference cheap.
      const now = Date.now();
      // @ts-expect-error worklet-local cache stashed on the frame processor
      const last = globalThis.__lastPoseAt ?? 0;
      if (now - last < ANALYZE_EVERY_MS) return;
      // @ts-expect-error
      globalThis.__lastPoseAt = now;

      const resized = resize(frame, {
        scale: { width: 192, height: 192 },
        pixelFormat: 'rgb',
        dataType: 'uint8',
      });

      const outputs = model.model.runSync([resized]);
      const pose = decodePose(outputs[0] as unknown as Float32Array);
      onFeedback(analyzePose(pose));
    },
    [model, resize, onFeedback]
  );

  return { feedback, modelReady: model.state === 'loaded', frameProcessor };
}
