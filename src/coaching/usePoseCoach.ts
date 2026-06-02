import { useState, useEffect, useRef } from 'react';
import { analyzePose } from './analyzePose';
import { updatePR, loadUserProfile } from './userStore';
import type { CoachFeedback, Pose } from './poseTypes';

export interface PoseCoach {
  feedback: CoachFeedback | null;
  modelReady: boolean;
  activePose: Pose | null;
  simulationState: 'standing' | 'kicking_up' | 'inverted' | 'bailing';
  formQuality: 'perfect' | 'banana_back' | 'plunging' | 'wall_rest';
  setFormQuality: (quality: 'perfect' | 'banana_back' | 'plunging' | 'wall_rest') => void;
  triggerKickUp: () => void;
  triggerFallDown: () => void;
  personalRecord: number;
}

export function usePoseCoach(stepId: number): PoseCoach {
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const [activePose, setActivePose] = useState<Pose | null>(null);
  const [simulationState, setSimulationState] = useState<'standing' | 'kicking_up' | 'inverted' | 'bailing'>('standing');
  const [formQuality, setFormQuality] = useState<'perfect' | 'banana_back' | 'plunging' | 'wall_rest'>('perfect');
  const [personalRecord, setPersonalRecord] = useState(0);

  // Use refs to avoid re-initializing intervals when states change
  const simStateRef = useRef(simulationState);
  simStateRef.current = simulationState;

  const formQualityRef = useRef(formQuality);
  formQualityRef.current = formQuality;

  const stepIdRef = useRef(stepId);
  stepIdRef.current = stepId;

  const holdTimeRef = useRef(0);

  // Load the current PR for this step
  useEffect(() => {
    let active = true;
    async function fetchPR() {
      const profile = await loadUserProfile();
      if (active) {
        setPersonalRecord(profile.personalRecords[stepId] || 0);
      }
    }
    fetchPR();
    return () => {
      active = false;
    };
  }, [stepId]);

  const triggerKickUp = () => {
    if (simStateRef.current === 'standing') {
      setSimulationState('kicking_up');
      holdTimeRef.current = 0;
    }
  };

  const triggerFallDown = () => {
    if (simStateRef.current === 'inverted') {
      setSimulationState('standing');
      // Save PR if current hold time is higher than existing
      if (holdTimeRef.current > 0) {
        const finalTime = Math.round(holdTimeRef.current);
        updatePR(stepIdRef.current, finalTime).then(({ profile, isNewPR }) => {
          if (isNewPR) {
            setPersonalRecord(profile.personalRecords[stepIdRef.current]);
          }
        });
      }
      holdTimeRef.current = 0;
    }
  };

  // Main simulation loop (updates ~5 times per second, every 200ms)
  useEffect(() => {
    let tickCount = 0;
    
    const interval = setInterval(() => {
      const state = simStateRef.current;
      const quality = formQualityRef.current;
      const currentStep = stepIdRef.current;

      tickCount++;

      // 1. Manage state transition sequences automatically if not manually stopped
      if (state === 'kicking_up' && tickCount > 8) {
        setSimulationState('inverted');
        tickCount = 0;
      }

      // 2. Generate simulated pose coordinates based on active state and stepId
      let pose: Pose | null = null;

      if (state === 'standing') {
        pose = generateStandingPose();
      } else if (state === 'kicking_up') {
        pose = generateKickingUpPose();
      } else if (state === 'inverted') {
        pose = generateInvertedPose(currentStep, quality, tickCount);
      } else if (state === 'bailing') {
        pose = generateBailingPose(tickCount);
      }

      if (pose) {
        setActivePose(pose);
        // Run our pure pose coach logic
        const rawFeedback = analyzePose(pose, currentStep);

        // 3. Accumulate hold timer if inverted and feedback indicates success
        if (state === 'inverted') {
          if (rawFeedback.isSuccess) {
            holdTimeRef.current += 0.2; // 200ms increments
          } else if (currentStep === 4) {
            // Step 4 (taps) does not count time when resting on wall
            // So we don't increment, but they remain inverted
          } else {
            // For other steps, poor alignment stops the continuous timer
            // let's pause or decay it slightly, but keep active
          }
          rawFeedback.holdTime = Math.round(holdTimeRef.current);
        } else {
          rawFeedback.holdTime = 0;
        }

        setFeedback(rawFeedback);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return {
    feedback,
    modelReady: true, // Always ready in simulation mode
    activePose,
    simulationState,
    formQuality,
    setFormQuality,
    triggerKickUp,
    triggerFallDown,
    personalRecord,
  };
}

// Coordinate generation helpers:
// Standard image viewport is 0..1 in x and y.
// 0,0 is top-left. 1,1 is bottom-right.
// Inverted means ankles/hips are higher (smaller y) than shoulders.

function generateStandingPose(): Pose {
  // Simple upright stick figure
  return {
    nose: { x: 0.5, y: 0.15, score: 0.95 },
    leftEye: { x: 0.48, y: 0.14, score: 0.9 },
    rightEye: { x: 0.52, y: 0.14, score: 0.9 },
    leftEar: { x: 0.46, y: 0.15, score: 0.8 },
    rightEar: { x: 0.54, y: 0.15, score: 0.8 },
    leftShoulder: { x: 0.42, y: 0.25, score: 0.95 },
    rightShoulder: { x: 0.58, y: 0.25, score: 0.95 },
    leftElbow: { x: 0.38, y: 0.4, score: 0.9 },
    rightElbow: { x: 0.62, y: 0.4, score: 0.9 },
    leftWrist: { x: 0.38, y: 0.55, score: 0.95 },
    rightWrist: { x: 0.62, y: 0.55, score: 0.95 },
    leftHip: { x: 0.45, y: 0.55, score: 0.95 },
    rightHip: { x: 0.55, y: 0.55, score: 0.95 },
    leftKnee: { x: 0.45, y: 0.75, score: 0.9 },
    rightKnee: { x: 0.55, y: 0.75, score: 0.9 },
    leftAnkle: { x: 0.45, y: 0.92, score: 0.95 },
    rightAnkle: { x: 0.55, y: 0.92, score: 0.95 },
  };
}

function generateKickingUpPose(): Pose {
  // Leaning forward, hands reaching for floor, one leg lifting
  return {
    nose: { x: 0.5, y: 0.55, score: 0.9 },
    leftEye: { x: 0.48, y: 0.54, score: 0.8 },
    rightEye: { x: 0.52, y: 0.54, score: 0.8 },
    leftEar: { x: 0.47, y: 0.55, score: 0.7 },
    rightEar: { x: 0.53, y: 0.55, score: 0.7 },
    leftShoulder: { x: 0.45, y: 0.65, score: 0.9 },
    rightShoulder: { x: 0.55, y: 0.65, score: 0.9 },
    leftElbow: { x: 0.43, y: 0.75, score: 0.85 },
    rightElbow: { x: 0.57, y: 0.75, score: 0.85 },
    leftWrist: { x: 0.43, y: 0.88, score: 0.95 },
    rightWrist: { x: 0.57, y: 0.88, score: 0.95 },
    leftHip: { x: 0.48, y: 0.45, score: 0.9 },
    rightHip: { x: 0.56, y: 0.45, score: 0.9 },
    leftKnee: { x: 0.38, y: 0.35, score: 0.85 },
    rightKnee: { x: 0.6, y: 0.3, score: 0.85 },
    leftAnkle: { x: 0.35, y: 0.4, score: 0.9 },
    rightAnkle: { x: 0.65, y: 0.15, score: 0.9 },
  };
}

function generateInvertedPose(stepId: number, quality: string, tick: number): Pose {
  // Wobble simulation using Math.sin
  const wobbleX = Math.sin(tick * 0.5) * 0.015;
  const targetX = 0.5;

  const pose = {
    nose: { x: targetX, y: 0.72, score: 0.9 },
    leftEye: { x: targetX - 0.02, y: 0.71, score: 0.85 },
    rightEye: { x: targetX + 0.02, y: 0.71, score: 0.85 },
    leftEar: { x: targetX - 0.03, y: 0.72, score: 0.8 },
    rightEar: { x: targetX + 0.03, y: 0.72, score: 0.8 },
    // Shoulders stacked above wrists
    leftShoulder: { x: targetX - 0.06, y: 0.62, score: 0.98 },
    rightShoulder: { x: targetX + 0.06, y: 0.62, score: 0.98 },
    leftElbow: { x: targetX - 0.06, y: 0.75, score: 0.95 },
    rightElbow: { x: targetX + 0.06, y: 0.75, score: 0.95 },
    // Wrists anchored on floor
    leftWrist: { x: targetX - 0.06, y: 0.88, score: 0.98 },
    rightWrist: { x: targetX + 0.06, y: 0.88, score: 0.98 },
    // Hips
    leftHip: { x: targetX - 0.05, y: 0.4, score: 0.98 },
    rightHip: { x: targetX + 0.05, y: 0.4, score: 0.98 },
    // Knees
    leftKnee: { x: targetX - 0.04, y: 0.25, score: 0.95 },
    rightKnee: { x: targetX + 0.04, y: 0.25, score: 0.95 },
    // Ankles at top
    leftAnkle: { x: targetX - 0.04, y: 0.12, score: 0.98 },
    rightAnkle: { x: targetX + 0.04, y: 0.12, score: 0.98 },
  };

  // Adjust coordinates based on Step & Form Quality:
  if (stepId === 1) {
    // Wall Pike: hips bent at 90 deg, legs horizontal, ankles on wall
    // Wall is on the left
    pose.leftHip.x = targetX - 0.18 + wobbleX;
    pose.rightHip.x = targetX - 0.14 + wobbleX;
    pose.leftHip.y = 0.55;
    pose.rightHip.y = 0.55;

    // Knees
    pose.leftKnee.x = targetX - 0.3;
    pose.rightKnee.x = targetX - 0.26;
    pose.leftKnee.y = 0.55;
    pose.rightKnee.y = 0.55;

    // Ankles on wall at height 0.55
    pose.leftAnkle.x = targetX - 0.42;
    pose.rightAnkle.x = targetX - 0.4;
    pose.leftAnkle.y = 0.55;
    pose.rightAnkle.y = 0.55;

    if (quality === 'plunging' || quality === 'banana_back') {
      // Shoulders shifted forward (away from wall)
      pose.leftShoulder.x = targetX + 0.06;
      pose.rightShoulder.x = targetX + 0.18;
    }
  } else {
    // Standard handstand alignment
    if (quality === 'banana_back') {
      // Sagging hips in X direction (arching back)
      pose.leftHip.x = targetX + 0.06 + wobbleX;
      pose.rightHip.x = targetX + 0.16 + wobbleX;
    } else if (quality === 'plunging') {
      // Shoulders leaning forward past wrist stack
      pose.leftShoulder.x = targetX + 0.09 + wobbleX;
      pose.rightShoulder.x = targetX + 0.21 + wobbleX;
    } else if (quality === 'wall_rest') {
      // Feet resting against the wall (on the right)
      pose.leftAnkle.x = targetX + 0.12;
      pose.rightAnkle.x = targetX + 0.22;
    } else {
      // Perfect form: add minor natural wiggle
      pose.leftHip.x += wobbleX;
      pose.rightHip.x += wobbleX;
      pose.leftAnkle.x += wobbleX;
      pose.rightAnkle.x += wobbleX;
    }
  }

  return pose;
}

function generateBailingPose(tick: number): Pose {
  // Hips and feet swinging sideways towards ground
  const angle = Math.min(1.2, tick * 0.15); // rotation angle
  return {
    nose: { x: 0.5, y: 0.72, score: 0.95 },
    leftEye: { x: 0.48, y: 0.71, score: 0.8 },
    rightEye: { x: 0.52, y: 0.71, score: 0.8 },
    leftEar: { x: 0.47, y: 0.72, score: 0.7 },
    rightEar: { x: 0.53, y: 0.72, score: 0.7 },
    leftWrist: { x: 0.4, y: 0.88, score: 0.95 },
    rightWrist: { x: 0.6, y: 0.88, score: 0.95 },
    leftShoulder: { x: 0.42, y: 0.65, score: 0.95 },
    rightShoulder: { x: 0.58, y: 0.65, score: 0.95 },
    leftElbow: { x: 0.41, y: 0.76, score: 0.85 },
    rightElbow: { x: 0.59, y: 0.76, score: 0.85 },
    leftHip: { x: 0.5 - Math.sin(angle) * 0.15, y: 0.4 + Math.cos(angle) * 0.05, score: 0.9 },
    rightHip: { x: 0.58 - Math.sin(angle) * 0.15, y: 0.4 + Math.cos(angle) * 0.05, score: 0.9 },
    leftKnee: { x: 0.5 - Math.sin(angle) * 0.28, y: 0.25 + Math.cos(angle) * 0.15, score: 0.85 },
    rightKnee: { x: 0.58 - Math.sin(angle) * 0.28, y: 0.25 + Math.cos(angle) * 0.15, score: 0.85 },
    leftAnkle: { x: 0.5 - Math.sin(angle) * 0.4, y: 0.12 + Math.cos(angle) * 0.25, score: 0.9 },
    rightAnkle: { x: 0.58 - Math.sin(angle) * 0.4, y: 0.12 + Math.cos(angle) * 0.25, score: 0.9 },
  };
}
