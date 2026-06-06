import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  runAtTargetFps,
} from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { Worklets } from 'react-native-worklets-core';
import { analyzePose, decodePose } from './analyzePose';
import { updatePR, loadUserProfile } from './userStore';
import type { CoachFeedback, Pose } from './poseTypes';

// MoveNet Lightning expects a 192x192 RGB input tensor.
const MODEL_SIZE = 192;

const isRepStep = (id: number) => id === 3 || id === 5 || id === 8 || id === 9;

export interface PoseCoach {
  feedback: CoachFeedback | null;
  modelReady: boolean;
  activePose: Pose | null;
  personalRecord: number;
  device: ReturnType<typeof useCameraDevice>;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
  frameProcessor: ReturnType<typeof useFrameProcessor>;
}

/**
 * Real on-device pose coaching.
 *
 * A single MoveNet frame processor produces the 17 keypoints for EVERY step;
 * `analyzePose(pose, stepId)` does the per-step interpretation. The hold timer
 * is driven by the body (analyzePose's `isSuccess`), not by buttons.
 */
export function usePoseCoach(stepId: number): PoseCoach {
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [activePose, setActivePose] = useState<Pose | null>(null);
  const [personalRecord, setPersonalRecord] = useState(0);

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const { resize } = useResizePlugin();

  // Load the bundled MoveNet model once.
  const tflite = useTensorflowModel(
    require('../../assets/models/movenet-lightning.tflite')
    // default (CPU) delegate — portable across all devices
  );
  const model = tflite.state === 'loaded' ? tflite.model : undefined;
  const modelReady = tflite.state === 'loaded';

  const holdTimeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const prRef = useRef(0);
  const stepIdRef = useRef(stepId);
  stepIdRef.current = stepId;

  // Load the saved PR for this step and reset the live timer.
  useEffect(() => {
    let active = true;
    holdTimeRef.current = 0;
    lastTsRef.current = null;
    loadUserProfile().then((p) => {
      if (!active) return;
      const pr = p.personalRecords[stepId] || 0;
      prRef.current = pr;
      setPersonalRecord(pr);
    });
    return () => {
      active = false;
    };
  }, [stepId]);

  // JS-side handler. Receives a decoded pose from the worklet each processed
  // frame, scores it, and advances the body-driven hold timer.
  const onPose = useCallback((pose: Pose) => {
    const sid = stepIdRef.current;
    const fb = analyzePose(pose, sid);

    const now = Date.now();
    if (fb.isSuccess) {
      if (lastTsRef.current != null) {
        holdTimeRef.current += (now - lastTsRef.current) / 1000;
      }
      lastTsRef.current = now;
    } else {
      lastTsRef.current = null;
      // Timer steps reset when you fall out of position; rep steps accumulate.
      if (!isRepStep(sid)) holdTimeRef.current = 0;
    }
    fb.holdTime = Math.floor(holdTimeRef.current);

    // Persist a new personal record as the hold grows (timer steps).
    if (!isRepStep(sid) && fb.holdTime > prRef.current) {
      prRef.current = fb.holdTime;
      setPersonalRecord(fb.holdTime);
      updatePR(sid, fb.holdTime);
    }

    setActivePose(pose);
    setFeedback(fb);
  }, []);

  // Worklet -> JS bridge (worklets-core).
  const onPoseJs = useMemo(() => Worklets.createRunOnJS(onPose), [onPose]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (model == null) return;
      // Throttle inference to ~10 fps without requiring a camera `format`.
      runAtTargetFps(10, () => {
        'worklet';
        try {
          // Resize + convert the frame to the model's input tensor.
          // mirror:true matches the (mirrored) front-camera preview, so the
          // decoded keypoints are already in on-screen coordinates.
          const resized = resize(frame, {
            scale: { width: MODEL_SIZE, height: MODEL_SIZE },
            pixelFormat: 'rgb',
            dataType: 'uint8',
            mirror: true,
          });

          // fast-tflite v1 takes the typed array directly and returns
          // typed arrays (MoveNet output: 17 * [y, x, score] floats).
          const outputs = model.runSync([resized]);
          const pose = decodePose(outputs[0] as Float32Array);
          onPoseJs(pose);
        } catch (e) {
          // Never let a single bad frame crash the camera pipeline.
        }
      });
    },
    [model, onPoseJs, resize]
  );

  return {
    feedback,
    modelReady,
    activePose,
    personalRecord,
    device,
    hasPermission,
    requestPermission,
    frameProcessor,
  };
}
