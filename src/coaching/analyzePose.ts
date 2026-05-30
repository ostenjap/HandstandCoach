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
    if (p.score >= MIN_SCORE) {
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
    if (p.score >= MIN_SCORE) {
      sum += p.x;
      n++;
    }
  }
  return n === 0 ? NaN : sum / n;
}

// Pure, framework-free coaching logic so it can be unit-tested and reused
// regardless of which camera/model feeds it.
export function analyzePose(pose: Pose): CoachFeedback {
  'worklet';
  const shoulderY = avgY(pose.leftShoulder, pose.rightShoulder);
  const hipY = avgY(pose.leftHip, pose.rightHip);
  const ankleY = avgY(pose.leftAnkle, pose.rightAnkle);

  // Image y grows downward, so "inverted" means ankles/hips have a smaller y
  // (higher in frame) than the shoulders.
  const isInverted =
    !Number.isNaN(shoulderY) && !Number.isNaN(hipY) && hipY < shoulderY;

  if (!isInverted) {
    return {
      isInverted: false,
      alignmentScore: 0,
      message: 'Kick up into your handstand to start coaching.',
    };
  }

  // Vertical stack quality: wrists, shoulders, hips, ankles should share an x.
  const wristX = avgX(pose.leftWrist, pose.rightWrist);
  const shoulderX = avgX(pose.leftShoulder, pose.rightShoulder);
  const hipX = avgX(pose.leftHip, pose.rightHip);
  const ankleX = avgX(pose.leftAnkle, pose.rightAnkle);

  const xs = [wristX, shoulderX, hipX, ankleX].filter((v) => !Number.isNaN(v));
  let spread = 0;
  for (const x of xs) spread = Math.max(spread, Math.abs(x - shoulderX));

  // spread of 0 == perfectly stacked; ~0.25 of frame width == badly off.
  const alignmentScore = Math.max(0, Math.min(1, 1 - spread / 0.25));

  let message: string;
  if (alignmentScore > 0.85) {
    message = 'Great line — hold it!';
  } else if (hipX - shoulderX > 0.05) {
    message = 'Hips are arching past your hands — engage your core.';
  } else if (shoulderX - hipX > 0.05) {
    message = 'You are piking — open the shoulders and stack your hips.';
  } else {
    message = 'Find your balance over your hands.';
  }

  return { isInverted: true, alignmentScore, message };
}
