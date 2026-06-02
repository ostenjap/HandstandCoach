import { KEYPOINTS, type CoachFeedback, type Keypoint, type Pose } from './poseTypes';

const MIN_SCORE = 0.3;

// Builds a Pose object from MoveNet's flat [y, x, score] * 17 output.
export function decodePose(output: Float32Array | number[]): Pose {
  'worklet';
  const pose = {} as Pose;
  for (let i = 0; i < KEYPOINTS.length; i++) {
    const base = i * 3;
    pose[KEYPOINTS[i]] = {
      y: output[base],
      x: output[base + 1],
      score: output[base + 2],
    };
  }
  return pose;
}

function avgY(...points: Keypoint[]): number {
  'worklet';
  let sum = 0;
  let n = 0;
  for (const p of points) {
    if (p && p.score >= MIN_SCORE) {
      sum += p.y;
      n++;
    }
  }
  return n === 0 ? NaN : sum / n;
}

function avgX(...points: Keypoint[]): number {
  'worklet';
  let sum = 0;
  let n = 0;
  for (const p of points) {
    if (p && p.score >= MIN_SCORE) {
      sum += p.x;
      n++;
    }
  }
  return n === 0 ? NaN : sum / n;
}

// Pure, framework-free coaching logic so it can be unit-tested and reused
// regardless of which camera/model feeds it. Now takes a stepId (1..6).
export function analyzePose(pose: Pose, stepId: number = 6): CoachFeedback {
  'worklet';

  const shoulderY = avgY(pose.leftShoulder, pose.rightShoulder);
  const hipY = avgY(pose.leftHip, pose.rightHip);
  const ankleY = avgY(pose.leftAnkle, pose.rightAnkle);
  const wristY = avgY(pose.leftWrist, pose.rightWrist);

  // Check if inverted. In all steps (even L-stand), hips/ankles are higher than shoulders.
  // In our coordinate space, y grows downward (0 at top, 1 at bottom).
  // So "higher" means a SMALLER y value.
  const isInverted = !Number.isNaN(shoulderY) && !Number.isNaN(hipY) && hipY < shoulderY;

  if (!isInverted) {
    return {
      isInverted: false,
      alignmentScore: 0,
      holdTime: 0,
      message: stepId === 1 
        ? 'Get into a pike position with feet on wall.'
        : 'Kick up into your handstand to start coaching.',
    };
  }

  // Common alignment calculations
  const wristX = avgX(pose.leftWrist, pose.rightWrist);
  const shoulderX = avgX(pose.leftShoulder, pose.rightShoulder);
  const hipX = avgX(pose.leftHip, pose.rightHip);
  const ankleX = avgX(pose.leftAnkle, pose.rightAnkle);

  const xs = [wristX, shoulderX, hipX, ankleX].filter((v) => !Number.isNaN(v));
  let spread = 0;
  if (!Number.isNaN(shoulderX)) {
    for (const x of xs) {
      spread = Math.max(spread, Math.abs(x - shoulderX));
    }
  }

  // spread of 0 = perfect line; ~0.25 of frame width = badly off.
  const alignmentScore = Math.max(0, Math.min(1, 1 - spread / 0.25));

  // Initialize feedback fields
  let message = 'Find your balance.';
  let isSuccess = false;
  let shoulderStacked = false;
  let bananaBack = false;
  let shouldersPlunged = false;
  let feetOffWall = false;
  let balanceScore = 0;

  switch (stepId) {
    case 1: {
      // Step 1: Wall Pike / L-Stand
      // Focus: Wrists and shoulders vertically stacked. Hips bent at 90 deg.
      // We check wrist-shoulder vertical alignment.
      const wristShoulderDiff = Math.abs(wristX - shoulderX);
      shoulderStacked = wristShoulderDiff < 0.06;

      if (!shoulderStacked) {
        message = 'Push your shoulders active: press chest toward the wall.';
      } else {
        isSuccess = true;
        message = 'Perfect L-stack! Squeeze your shoulders and hold.';
      }
      break;
    }

    case 2: {
      // Step 2: Stomach-to-Wall
      // Focus: Straight line alignment, suck in stomach (no banana back).
      // Check if hipX is in line with wristX and ankleX. If hipX is bowing out:
      const midLineX = (wristX + ankleX) / 2;
      const hipDeviation = Math.abs(hipX - midLineX);
      bananaBack = hipDeviation > 0.05;

      if (bananaBack) {
        message = 'Banana back detected. Squeeze your glutes and suck in your belly.';
      } else if (alignmentScore > 0.82) {
        isSuccess = true;
        message = 'Beautiful flat line! Lock out your elbows.';
      } else {
        message = 'Press your fingers into the ground to stay close to the wall.';
      }
      break;
    }

    case 3: {
      // Step 3: Back-to-Wall Kick-Up
      // Focus: Kick up with stacked shoulders, preventing shoulders plunging forward.
      const wristShoulderDiff = Math.abs(wristX - shoulderX);
      shouldersPlunged = wristShoulderDiff > 0.08 && shoulderX > wristX; // shoulders leaning forward

      if (shouldersPlunged) {
        message = 'Shoulders are plunging. Keep your shoulders directly over wrists.';
      } else if (alignmentScore > 0.80) {
        isSuccess = true;
        message = 'Clean kick-up entry! Squeeze legs together.';
      } else {
        message = 'Hold your position against the wall.';
      }
      break;
    }

    case 4: {
      // Step 4: Heel/Wall Taps
      // Focus: Squeeze and balance ankles freestanding off the wall.
      // If ankleX is stacked with shoulderX and hipX, they are balancing.
      const ankleShoulderDiff = Math.abs(ankleX - shoulderX);
      feetOffWall = ankleShoulderDiff < 0.04;

      if (feetOffWall) {
        isSuccess = true;
        message = 'Nice! Feet are floating off the wall. Keep balancing.';
      } else {
        message = 'Gently tap your heels away from the wall to float.';
      }
      break;
    }

    case 5: {
      // Step 5: Bail & Catch
      // Focus: Balanced hold with a safe exit.
      balanceScore = alignmentScore;
      const isBalanced = alignmentScore > 0.85;

      if (isBalanced) {
        isSuccess = true;
        message = 'Balanced! Focus on core tightness.';
      } else if (spread > 0.15) {
        message = 'Losing balance. Pivot your wrist and cartwheel out safely.';
      } else {
        message = 'Adjust pressure in your fingers to stay upright.';
      }
      break;
    }

    case 6: {
      // Step 6: Freestanding Alignment
      // Focus: Squeezed, aligned freestanding hold.
      balanceScore = alignmentScore;
      const isPerfect = alignmentScore > 0.90;

      if (isPerfect) {
        isSuccess = true;
        message = 'Elite alignment! Hold still.';
      } else if (alignmentScore > 0.80) {
        isSuccess = true;
        message = 'Good hold! Squeeze ankles and point toes.';
      } else if (hipX - shoulderX > 0.04) {
        message = 'Hips are arching past hands — engage core.';
      } else if (shoulderX - hipX > 0.04) {
        message = 'Piking detected — open shoulders and push hips forward.';
      } else {
        message = 'Balance over your fingers.';
      }
      break;
    }
  }

  return {
    isInverted: true,
    alignmentScore,
    message,
    holdTime: 0, // Set/accumulated dynamically by the hook
    isSuccess,
    shoulderStacked,
    bananaBack,
    shouldersPlunged,
    feetOffWall,
    balanceScore,
  };
}

