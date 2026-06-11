import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
  runAtTargetFps,
} from 'react-native-vision-camera';
import { useResizePlugin } from 'vision-camera-resize-plugin';
import { useTensorflowModel } from 'react-native-fast-tflite';
import { NitroModules } from 'react-native-nitro-modules';
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

    const okCount = diagRef.current.ok++;
    if (okCount < 3 || okCount % 24 === 0) {
      console.log(
        `[pose] scored #${okCount} success=${fb.isSuccess} hold=${fb.holdTime} ` +
          `nose(y,x,s)=${pose.nose.y.toFixed(2)},${pose.nose.x.toFixed(2)},${pose.nose.score.toFixed(2)}`
      );
    }

    setActivePose(pose);
    setFeedback(fb);
  }, []);

  const diagRef = useRef({ ok: 0 });

  // Deduping logger callable from the worklet — prints each distinct message
  // once so we can see how far the pipeline gets without spam.
  const seenRef = useRef<Set<string>>(new Set());
  const logJs = useMemo(
    () =>
      Worklets.createRunOnJS((m: string) => {
        if (seenRef.current.has(m)) return;
        seenRef.current.add(m);
        console.log('[pose-wl]', m);
      }),
    []
  );

  // Send the decoded pose (a plain object of numbers — a valid shared value)
  // to JS for scoring. The pixel buffer never crosses the bridge.
  const onPoseJs = useMemo(() => Worklets.createRunOnJS(scorePose), [scorePose]);

  // Box the Nitro model into a jsi::HostObject so it can be captured by
  // VisionCamera v4's worklet runtime (the raw HybridObject's NativeState is
  // not accessible there). We unbox() inside the worklet to run inference.
  const boxedModel = useMemo(
    () => (model != null ? NitroModules.box(model) : undefined),
    [model]
  );

  // Inference runs INSIDE the worklet (the documented fast-tflite pattern).
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      if (boxedModel == null) return;
      runAtTargetFps(8, () => {
        'worklet';
        try {
          const tflite = boxedModel.unbox();
          const resized = resize(frame, {
            scale: { width: MODEL_SIZE, height: MODEL_SIZE },
            pixelFormat: 'rgb',
            dataType: 'uint8',
            mirror: true, // match the mirrored front-camera preview
          });
          // Extract the exact slice (typed arrays may have a byteOffset).
          const inputBuffer = resized.buffer.slice(
            resized.byteOffset,
            resized.byteOffset + resized.byteLength
          );
          const outputs = tflite.runSync([inputBuffer as ArrayBuffer]);
          const pose = decodePose(new Float32Array(outputs[0]));
          logJs('OK: inference ran, nose=' + pose.nose.score.toFixed(2));
          onPoseJs(pose);
        } catch (e: any) {
          logJs('ERR: ' + (e?.message ?? String(e)));
        }
      });
    },
    [boxedModel, resize, onPoseJs, logJs]
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
