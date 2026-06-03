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
export function analyzePose(pose: Pose, stepId: number = 11): CoachFeedback {
  'worklet';

  const shoulderY = avgY(pose.leftShoulder, pose.rightShoulder);
  const hipY = avgY(pose.leftHip, pose.rightHip);
  const ankleY = avgY(pose.leftAnkle, pose.rightAnkle);
  const wristY = avgY(pose.leftWrist, pose.rightWrist);

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

  // STEP 0: Wrist rocks (Floor hands & knees posture)
  if (stepId === 0) {
    const isOnFloor = !Number.isNaN(shoulderY) && !Number.isNaN(hipY) && shoulderY > 0.5 && hipY > 0.5;
    return {
      isInverted: false,
      alignmentScore: 1.0,
      holdTime: 0,
      isSuccess: isOnFloor,
      message: isOnFloor ? 'Perform slow wrist rocks, shifting weight forward and back.' : 'Position your camera and get on your hands and knees.',
    };
  }

  // STEP 1: Hollow Body Hold (Lying flat on back)
  if (stepId === 1) {
    const isLyingDown = !Number.isNaN(shoulderY) && !Number.isNaN(hipY) && Math.abs(shoulderY - hipY) < 0.15 && shoulderY > 0.5;
    if (!isLyingDown) {
      return {
        isInverted: false,
        alignmentScore: 0,
        holdTime: 0,
        isSuccess: false,
        message: 'Lie flat on your back to start the Hollow Body Hold.',
      };
    }
    const midLineY = (shoulderY + ankleY) / 2;
    bananaBack = Math.abs(hipY - midLineY) > 0.08;
    isSuccess = !bananaBack;
    return {
      isInverted: false,
      alignmentScore: isSuccess ? 0.9 : 0.4,
      holdTime: 0,
      isSuccess,
      bananaBack,
      message: bananaBack 
        ? 'Banana back! Press your lower back firmly into the floor.' 
        : 'Perfect Hollow Body shape! Keep holding.',
    };
  }

  const isInverted = !Number.isNaN(shoulderY) && !Number.isNaN(hipY) && hipY < shoulderY;

  if (!isInverted) {
    let startingPrompt = 'Kick up against the wall to start.';
    if (stepId === 2 || stepId === 3) startingPrompt = 'Get into Ground Pike position.';
    else if (stepId === 4 || stepId === 5) startingPrompt = 'Place feet on box and hands on floor.';
    else if (stepId === 6 || stepId === 7) startingPrompt = 'Walk your feet up the wall.';

    return {
      isInverted: false,
      alignmentScore: 0,
      holdTime: 0,
      message: startingPrompt,
    };
  }

  switch (stepId) {
    case 2: {
      // Step 2: Ground Pike Hold
      const isVshape = !Number.isNaN(hipY) && !Number.isNaN(shoulderY) && !Number.isNaN(ankleY) && hipY < shoulderY - 0.1 && hipY < ankleY - 0.1;
      if (!isVshape) {
        message = 'Push your hips higher to form an inverted V-shape.';
      } else {
        isSuccess = true;
        message = 'Ground Pike active. Lock your elbows and push the floor away!';
      }
      break;
    }

    case 3: {
      // Step 3: Ground Pike Push-Up
      const isDown = !Number.isNaN(pose.nose.y) && !Number.isNaN(wristY) && Math.abs(pose.nose.y - wristY) < 0.15;
      const isForward = Math.abs(pose.nose.x - wristX) > 0.05;

      if (isDown) {
        if (isForward) {
          isSuccess = true;
          message = 'Excellent descent! Press back up strongly.';
        } else {
          message = 'Tuck elbows and bring your head forward in front of hands.';
        }
      } else {
        isSuccess = true;
        message = 'Perform a pike push-up: lower head forward toward floor.';
      }
      break;
    }

    case 4: {
      // Step 4: Box Pike Hold
      const wristShoulderDiff = Math.abs(wristX - shoulderX);
      shoulderStacked = wristShoulderDiff < 0.06;

      if (!shoulderStacked) {
        message = 'Push your shoulders active: stack them over wrists.';
      } else {
        isSuccess = true;
        message = 'Perfect vertical box pike! Hold and build shoulder tolerance.';
      }
      break;
    }

    case 5: {
      // Step 5: Box Pike Push-Up
      const isDown = !Number.isNaN(pose.nose.y) && !Number.isNaN(wristY) && Math.abs(pose.nose.y - wristY) < 0.15;
      if (isDown) {
        isSuccess = true;
        message = 'Good bottom position! Press back up.';
      } else {
        isSuccess = true;
        message = 'Lower head forward of hands and press back up.';
      }
      break;
    }

    case 6: {
      // Step 6: Partial Wall Walk (45 deg)
      const angleDeviation = Math.abs(hipX - wristX);
      const is45deg = angleDeviation > 0.08 && angleDeviation < 0.2;

      if (!is45deg) {
        message = 'Adjust distance from wall to maintain a 45-degree angle.';
      } else {
        isSuccess = true;
        message = 'Good 45-degree hold. Build tolerance without going vertical.';
      }
      break;
    }

    case 7: {
      // Step 7: Full Wall Walk
      const isVertical = alignmentScore > 0.85;
      if (!isVertical) {
        message = 'Walk hands closer to the wall and stack your joints.';
      } else {
        isSuccess = true;
        message = 'Full vertical inversion! Lock elbows and hold.';
      }
      break;
    }

    case 8: {
      // Step 8: Safety Bail
      isSuccess = true;
      message = 'Inverted! Press "BAIL (SIMULATE EXIT)" to practice stepping down.';
      break;
    }

    case 9: {
      // Step 9: Wall Kick-Up
      const wristShoulderDiff = Math.abs(wristX - shoulderX);
      shouldersPlunged = wristShoulderDiff > 0.08 && shoulderX > wristX;

      if (shouldersPlunged) {
        message = 'Shoulders plunged forward! Push back over wrists.';
      } else if (alignmentScore > 0.82) {
        isSuccess = true;
        message = 'Soft entry! Heels tapped wall light as a feather.';
      } else {
        message = 'Kick up softly until your heels tap the wall.';
      }
      break;
    }

    case 10: {
      // Step 10: The Float (Wall Taps)
      const ankleShoulderDiff = Math.abs(ankleX - shoulderX);
      feetOffWall = ankleShoulderDiff < 0.04;

      if (feetOffWall) {
        isSuccess = true;
        message = 'Floating! Fingers active, control the balance.';
      } else {
        message = 'Resting on wall. Gently push off using finger pressure.';
      }
      break;
    }

    case 11: {
      // Step 11: Antigravity
      balanceScore = alignmentScore;
      const isPerfect = alignmentScore > 0.90;

      if (isPerfect) {
        isSuccess = true;
        message = 'Elite balance! Squeeze glutes and point toes.';
      } else if (alignmentScore > 0.80) {
        isSuccess = true;
        message = 'Freestanding balance active. Squeeze ankles!';
      } else if (hipX - shoulderX > 0.04) {
        message = 'Hips arching (banana back) — tuck tailbone.';
      } else if (shoulderX - hipX > 0.04) {
        message = 'Piking (hips back) — open shoulders.';
      } else {
        message = 'Adjust finger pressure to stack your body.';
      }
      break;
    }
  }

  return {
    isInverted: true,
    alignmentScore,
    message,
    holdTime: 0,
    isSuccess,
    shoulderStacked,
    bananaBack,
    shouldersPlunged,
    feetOffWall,
    balanceScore,
  };
}

