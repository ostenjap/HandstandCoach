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
    const currentStep = stepIdRef.current;
    if (simStateRef.current === 'inverted') {
      if (currentStep === 8) {
        // Step 8: Safety Bail transitions to 'bailing' state instead of immediate drop
        setSimulationState('bailing');
      } else {
        setSimulationState('standing');
        if (holdTimeRef.current > 0 && !isRepStep(currentStep)) {
          const finalTime = Math.round(holdTimeRef.current);
          updatePR(currentStep, finalTime).then(({ profile, isNewPR }) => {
            if (isNewPR) {
              setPersonalRecord(profile.personalRecords[currentStep]);
            }
          });
        }
        holdTimeRef.current = 0;
      }
    }
  };

  // Helper to determine if step is repetition based
  const isRepStep = (stepId: number) => {
    return stepId === 3 || stepId === 5 || stepId === 8 || stepId === 9;
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
        const rawFeedback = analyzePose(pose, currentStep);

        // 3. Accumulate hold timer or repetitions depending on state and step
        if (state === 'inverted') {
          if (isRepStep(currentStep)) {
            // Repetition steps
            if (currentStep === 3 || currentStep === 5) {
              // Pike Push-Ups: complete a rep every 10 ticks
              if (tickCount % 10 === 0 && tickCount > 0) {
                holdTimeRef.current += 1;
                updatePR(currentStep, holdTimeRef.current).then(({ profile }) => {
                  setPersonalRecord(profile.personalRecords[currentStep]);
                });
              }
            } else if (currentStep === 9) {
              // Wall Kick-Up: holds for 5 ticks, then falls down to complete a rep
              if (tickCount >= 5) {
                setSimulationState('standing');
                tickCount = 0;
                if (quality === 'perfect') {
                  holdTimeRef.current += 1;
                  updatePR(currentStep, holdTimeRef.current).then(({ profile }) => {
                    setPersonalRecord(profile.personalRecords[currentStep]);
                  });
                }
              }
            }
          } else {
            // Timer steps
            if (rawFeedback.isSuccess) {
              holdTimeRef.current += 0.2; // 200ms increments
            }
          }
          rawFeedback.holdTime = Math.round(holdTimeRef.current);
        } else if (state === 'bailing') {
          // Bailing animation duration
          if (tickCount > 6) {
            setSimulationState('standing');
            tickCount = 0;
            if (currentStep === 8) {
              holdTimeRef.current += 1;
              updatePR(currentStep, holdTimeRef.current).then(({ profile }) => {
                setPersonalRecord(profile.personalRecords[currentStep]);
              });
            }
          }
        } else {
          // In standing or kicking_up, reset active timer (unless it is a rep accumulator)
          if (!isRepStep(currentStep)) {
            holdTimeRef.current = 0;
          }
          rawFeedback.holdTime = Math.round(holdTimeRef.current);
        }

        setFeedback(rawFeedback);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  return {
    feedback,
    modelReady: true,
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
function generateStandingPose(): Pose {
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
  const wobbleX = Math.sin(tick * 0.5) * 0.015;
  const targetX = 0.5;

  // STEP 0: Wrist rocks (Floor hands & knees posture)
  if (stepId === 0) {
    const rockX = Math.sin(tick * 0.4) * 0.04;
    return {
      nose: { x: targetX + 0.12 + rockX, y: 0.65, score: 0.95 },
      leftEye: { x: targetX + 0.14 + rockX, y: 0.64, score: 0.9 },
      rightEye: { x: targetX + 0.14 + rockX, y: 0.66, score: 0.9 },
      leftEar: { x: targetX + 0.12 + rockX, y: 0.63, score: 0.8 },
      rightEar: { x: targetX + 0.12 + rockX, y: 0.67, score: 0.8 },
      leftShoulder: { x: targetX + 0.06 + rockX, y: 0.7, score: 0.95 },
      rightShoulder: { x: targetX + 0.06 + rockX, y: 0.72, score: 0.95 },
      leftElbow: { x: targetX + 0.06 + rockX, y: 0.78, score: 0.9 },
      rightElbow: { x: targetX + 0.06 + rockX, y: 0.8, score: 0.9 },
      leftWrist: { x: targetX + 0.06, y: 0.85, score: 0.95 },
      rightWrist: { x: targetX + 0.06, y: 0.85, score: 0.95 },
      leftHip: { x: targetX - 0.12 + rockX, y: 0.7, score: 0.95 },
      rightHip: { x: targetX - 0.12 + rockX, y: 0.72, score: 0.95 },
      leftKnee: { x: targetX - 0.12, y: 0.85, score: 0.9 },
      rightKnee: { x: targetX - 0.12, y: 0.85, score: 0.9 },
      leftAnkle: { x: targetX - 0.18, y: 0.85, score: 0.95 },
      rightAnkle: { x: targetX - 0.18, y: 0.85, score: 0.95 },
    };
  }

  // STEP 1: Hollow Body Hold
  if (stepId === 1) {
    const hipSagY = quality === 'banana_back' ? 0.78 : 0.72;
    return {
      nose: { x: 0.35, y: 0.69, score: 0.95 },
      leftEye: { x: 0.35, y: 0.67, score: 0.9 },
      rightEye: { x: 0.35, y: 0.67, score: 0.9 },
      leftEar: { x: 0.34, y: 0.69, score: 0.8 },
      rightEar: { x: 0.34, y: 0.69, score: 0.8 },
      leftShoulder: { x: 0.42, y: 0.7, score: 0.95 },
      rightShoulder: { x: 0.42, y: 0.7, score: 0.95 },
      leftElbow: { x: 0.32, y: 0.7, score: 0.9 },
      rightElbow: { x: 0.32, y: 0.7, score: 0.9 },
      leftWrist: { x: 0.22, y: 0.7, score: 0.95 },
      rightWrist: { x: 0.22, y: 0.7, score: 0.95 },
      leftHip: { x: 0.58, y: hipSagY, score: 0.95 },
      rightHip: { x: 0.58, y: hipSagY, score: 0.95 },
      leftKnee: { x: 0.72, y: 0.68, score: 0.9 },
      rightKnee: { x: 0.72, y: 0.68, score: 0.9 },
      leftAnkle: { x: 0.85, y: 0.66, score: 0.95 },
      rightAnkle: { x: 0.85, y: 0.66, score: 0.95 },
    };
  }

  // STEP 2 & 3: Ground Pike Hold / Ground Pike Push-Up
  if (stepId === 2 || stepId === 3) {
    let pushUpOffset = 0;
    if (stepId === 3) {
      const cycle = (tick % 10) / 9;
      pushUpOffset = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
    }

    const noseY = 0.72 + pushUpOffset * 0.12;
    const noseX = targetX + pushUpOffset * 0.08;
    const shoulderY = 0.62 + pushUpOffset * 0.08;

    return {
      nose: { x: noseX, y: noseY, score: 0.9 },
      leftEye: { x: noseX - 0.02, y: noseY - 0.01, score: 0.85 },
      rightEye: { x: noseX + 0.02, y: noseY - 0.01, score: 0.85 },
      leftEar: { x: noseX - 0.03, y: noseY, score: 0.8 },
      rightEar: { x: noseX + 0.03, y: noseY, score: 0.8 },
      leftShoulder: { x: targetX - 0.06, y: shoulderY, score: 0.98 },
      rightShoulder: { x: targetX + 0.06, y: shoulderY, score: 0.98 },
      leftElbow: { x: targetX - 0.08, y: shoulderY + 0.1, score: 0.95 },
      rightElbow: { x: targetX + 0.08, y: shoulderY + 0.1, score: 0.95 },
      leftWrist: { x: targetX - 0.06, y: 0.88, score: 0.98 },
      rightWrist: { x: targetX + 0.06, y: 0.88, score: 0.98 },
      leftHip: { x: targetX - 0.08 + wobbleX, y: 0.4, score: 0.98 },
      rightHip: { x: targetX + 0.08 + wobbleX, y: 0.4, score: 0.98 },
      leftKnee: { x: targetX - 0.16, y: 0.64, score: 0.95 },
      rightKnee: { x: targetX - 0.12, y: 0.64, score: 0.95 },
      leftAnkle: { x: targetX - 0.24, y: 0.88, score: 0.98 },
      rightAnkle: { x: targetX - 0.2, y: 0.88, score: 0.98 },
    };
  }

  // STEP 4 & 5: Box Pike Hold / Box Pike Push-Up
  if (stepId === 4 || stepId === 5) {
    let pushUpOffset = 0;
    if (stepId === 5) {
      const cycle = (tick % 10) / 9;
      pushUpOffset = cycle < 0.5 ? cycle * 2 : (1 - cycle) * 2;
    }

    const noseY = 0.72 + pushUpOffset * 0.12;
    const shoulderY = 0.62 + pushUpOffset * 0.08;

    let shoulderStackX = targetX;
    if (quality === 'plunging') {
      shoulderStackX = targetX + 0.09;
    }

    return {
      nose: { x: shoulderStackX, y: noseY, score: 0.9 },
      leftEye: { x: shoulderStackX - 0.02, y: noseY - 0.01, score: 0.85 },
      rightEye: { x: shoulderStackX + 0.02, y: noseY - 0.01, score: 0.85 },
      leftEar: { x: shoulderStackX - 0.03, y: noseY, score: 0.8 },
      rightEar: { x: shoulderStackX + 0.03, y: noseY, score: 0.8 },
      leftShoulder: { x: shoulderStackX - 0.06, y: shoulderY, score: 0.98 },
      rightShoulder: { x: shoulderStackX + 0.06, y: shoulderY, score: 0.98 },
      leftElbow: { x: shoulderStackX - 0.06, y: shoulderY + 0.1, score: 0.95 },
      rightElbow: { x: shoulderStackX + 0.06, y: shoulderY + 0.1, score: 0.95 },
      leftWrist: { x: targetX - 0.06, y: 0.88, score: 0.98 },
      rightWrist: { x: targetX + 0.06, y: 0.88, score: 0.98 },
      leftHip: { x: targetX - 0.06 + wobbleX, y: 0.35, score: 0.98 },
      rightHip: { x: targetX + 0.06 + wobbleX, y: 0.35, score: 0.98 },
      leftKnee: { x: targetX - 0.18, y: 0.55, score: 0.95 },
      rightKnee: { x: targetX - 0.12, y: 0.55, score: 0.95 },
      leftAnkle: { x: targetX - 0.3, y: 0.55, score: 0.98 },
      rightAnkle: { x: targetX - 0.24, y: 0.55, score: 0.98 },
    };
  }

  // STEP 6: Partial Wall Walk (45 deg)
  if (stepId === 6) {
    const hipOffset = 0.14 + wobbleX;
    return {
      nose: { x: targetX + 0.05, y: 0.72, score: 0.9 },
      leftEye: { x: targetX + 0.03, y: 0.71, score: 0.85 },
      rightEye: { x: targetX + 0.07, y: 0.71, score: 0.85 },
      leftEar: { x: targetX + 0.02, y: 0.72, score: 0.8 },
      rightEar: { x: targetX + 0.08, y: 0.72, score: 0.8 },
      leftShoulder: { x: targetX - 0.02, y: 0.65, score: 0.98 },
      rightShoulder: { x: targetX + 0.08, y: 0.65, score: 0.98 },
      leftElbow: { x: targetX - 0.03, y: 0.76, score: 0.95 },
      rightElbow: { x: targetX + 0.07, y: 0.76, score: 0.95 },
      leftWrist: { x: targetX - 0.06, y: 0.88, score: 0.98 },
      rightWrist: { x: targetX + 0.06, y: 0.88, score: 0.98 },
      leftHip: { x: targetX - hipOffset, y: 0.45, score: 0.98 },
      rightHip: { x: targetX - hipOffset + 0.1, y: 0.45, score: 0.98 },
      leftKnee: { x: targetX - hipOffset - 0.1, y: 0.35, score: 0.95 },
      rightKnee: { x: targetX - hipOffset - 0.04, y: 0.35, score: 0.95 },
      leftAnkle: { x: targetX - hipOffset - 0.2, y: 0.25, score: 0.98 },
      rightAnkle: { x: targetX - hipOffset - 0.14, y: 0.25, score: 0.98 },
    };
  }

  // Standard vertical stack
  const pose = {
    nose: { x: targetX, y: 0.72, score: 0.9 },
    leftEye: { x: targetX - 0.02, y: 0.71, score: 0.85 },
    rightEye: { x: targetX + 0.02, y: 0.71, score: 0.85 },
    leftEar: { x: targetX - 0.03, y: 0.72, score: 0.8 },
    rightEar: { x: targetX + 0.03, y: 0.72, score: 0.8 },
    leftShoulder: { x: targetX - 0.06, y: 0.62, score: 0.98 },
    rightShoulder: { x: targetX + 0.06, y: 0.62, score: 0.98 },
    leftElbow: { x: targetX - 0.06, y: 0.75, score: 0.95 },
    rightElbow: { x: targetX + 0.06, y: 0.75, score: 0.95 },
    leftWrist: { x: targetX - 0.06, y: 0.88, score: 0.98 },
    rightWrist: { x: targetX + 0.06, y: 0.88, score: 0.98 },
    leftHip: { x: targetX - 0.05, y: 0.4, score: 0.98 },
    rightHip: { x: targetX + 0.05, y: 0.4, score: 0.98 },
    leftKnee: { x: targetX - 0.04, y: 0.25, score: 0.95 },
    rightKnee: { x: targetX + 0.04, y: 0.25, score: 0.95 },
    leftAnkle: { x: targetX - 0.04, y: 0.12, score: 0.98 },
    rightAnkle: { x: targetX + 0.04, y: 0.12, score: 0.98 },
  };

  if (quality === 'banana_back') {
    pose.leftHip.x = targetX + 0.06 + wobbleX;
    pose.rightHip.x = targetX + 0.16 + wobbleX;
  } else if (quality === 'plunging') {
    pose.leftShoulder.x = targetX + 0.09 + wobbleX;
    pose.rightShoulder.x = targetX + 0.21 + wobbleX;
  } else if (quality === 'wall_rest') {
    // Foot resting against the wall (on left side)
    pose.leftAnkle.x = targetX - 0.14;
    pose.rightAnkle.x = targetX - 0.22;
  } else {
    pose.leftHip.x += wobbleX;
    pose.rightHip.x += wobbleX;
    pose.leftAnkle.x += wobbleX;
    pose.rightAnkle.x += wobbleX;
  }

  return pose;
}

function generateBailingPose(tick: number): Pose {
  const angle = Math.min(1.2, tick * 0.2); // cartwheel exit rotation
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
