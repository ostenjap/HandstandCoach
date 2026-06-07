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
 * The worklet does ONLY the per-frame resize, then hands the pixel buffer to
 * the JS thread. Inference runs on the JS thread via fast-tflite's async
 * `run()` (executes off-thread, non-blocking) — this deliberately keeps the
 * Nitro model OUT of the worklet runtime, which otherwise crashes with
 * "HybridObject does not have a NativeState".
 *
 * One detector feeds every step; `analyzePose(pose, stepId)` is the per-step
 * judge, and the hold timer is driven by the body (`isSuccess`), not buttons.
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
    require('../../assets/models/movenet-lightning.tflite'),
    [] // CPU delegate (portable)
  );
  const model = tflite.state === 'loaded' ? tflite.model : undefined;
  const modelReady = tflite.state === 'loaded';

  const holdTimeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const prRef = useRef(0);
  const inFlightRef = useRef(false);
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

  // Score a decoded pose and advance the body-driven hold timer.
  const scorePose = useCallback((pose: Pose) => {
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
      if (!isRepStep(sid)) holdTimeRef.current = 0;
    }
    fb.holdTime = Math.floor(holdTimeRef.current);

    if (!isRepStep(sid) && fb.holdTime > prRef.current) {
      prRef.current = fb.holdTime;
      setPersonalRecord(fb.holdTime);
      updatePR(sid, fb.holdTime);
    }

    setActivePose(pose);
    setFeedback(fb);
  }, []);

  // JS-thread inference. Runs on the JS thread (called via runOnJS), where the
  // Nitro model has its NativeState. `run()` is async and executes off-thread.
  const runInference = useCallback(
    async (input: Uint8Array) => {
      if (model == null || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const outputs = await model.run([input.buffer as ArrayBuffer]);
        const out = new Float32Array(outputs[0]);
        scorePose(decodePose(out));
      } catch (e) {
        // ignore individual frame failures
      } finally {
        inFlightRef.current = false;
      }
    },
    [model, scorePose]
  );

  const runInferenceJs = useMemo(
    () => Worklets.createRunOnJS(runInference),
    [runInference]
  );

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      // Throttle to ~8 fps; resize in the worklet, infer on JS.
      runAtTargetFps(8, () => {
        'worklet';
        try {
          const resized = resize(frame, {
            scale: { width: MODEL_SIZE, height: MODEL_SIZE },
            pixelFormat: 'rgb',
            dataType: 'uint8',
            mirror: true, // match the mirrored front-camera preview
          });
          runInferenceJs(resized);
        } catch (e) {
          // never let a bad frame crash the pipeline
        }
      });
    },
    [runInferenceJs, resize]
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
