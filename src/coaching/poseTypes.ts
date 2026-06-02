// MoveNet SinglePose returns 17 keypoints in this fixed order.
export const KEYPOINTS = [
  'nose',
  'leftEye',
  'rightEye',
  'leftEar',
  'rightEar',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
  'leftKnee',
  'rightKnee',
  'leftAnkle',
  'rightAnkle',
] as const;

export type KeypointName = (typeof KEYPOINTS)[number];

export interface Keypoint {
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  score: number; // confidence 0..1
}

export type Pose = Record<KeypointName, Keypoint>;

export interface CoachFeedback {
  isInverted: boolean; // true if upside down
  alignmentScore: number; // 0..1 stack quality
  message: string;
  
  // Step-specific metrics
  holdTime: number; // current active hold time in seconds
  isSuccess?: boolean; // did they meet the step requirement?
  shoulderStacked?: boolean; // Step 1
  bananaBack?: boolean; // Step 2 (hyper-arched back)
  shouldersPlunged?: boolean; // Step 3
  feetOffWall?: boolean; // Step 4
  balanceScore?: number; // Step 5 & 6
}

export interface DrillStep {
  id: number;
  name: string;
  subtitle: string;
  description: string;
  goalDescription: string;
  targetPRSeconds: number;
}

export const DRILL_STEPS: DrillStep[] = [
  {
    id: 1,
    name: 'Wall Pike (L-Stand)',
    subtitle: 'Step 1: Shoulder & Wrist Stack',
    description: 'Walk feet up to hip height, forming an L-shape with your body. Focus on pushing the floor away and stacking shoulders directly above wrists.',
    goalDescription: 'Stack wrists & shoulders. Hold for 20 seconds.',
    targetPRSeconds: 20,
  },
  {
    id: 2,
    name: 'Stomach-to-Wall',
    subtitle: 'Step 2: Straight Line Alignment',
    description: 'Walk your hands closer to the wall. Focus on tucking your tailbone, locking knees, and sucking in your stomach to eliminate "banana back" arch.',
    goalDescription: 'Maintain a flat back close to wall for 30 seconds.',
    targetPRSeconds: 30,
  },
  {
    id: 3,
    name: 'Back-to-Wall Kick-Up',
    subtitle: 'Step 3: Shoulder Control',
    description: 'Place hands 15-20cm from wall, kick up with shoulders stacked directly over hands. Do not let shoulders plunge forward toward the wall.',
    goalDescription: 'Control kick-up without shoulder collapse. Hold for 10 seconds.',
    targetPRSeconds: 10,
  },
  {
    id: 4,
    name: 'Heel/Wall Taps',
    subtitle: 'Step 4: Active Balance Taps',
    description: 'Stomach-to-wall, gently push ankles off the wall to find your freestanding balance. Let the timer count your clean taps.',
    goalDescription: 'Perform heel/wall taps off the wall. Accumulate 10 seconds of balance.',
    targetPRSeconds: 10,
  },
  {
    id: 5,
    name: 'Bail & Catch',
    subtitle: 'Step 5: Safe Exit Practice',
    description: 'Kick up freestanding. If you start falling over, turn your hand and cartwheel exit safely. The coach checks your balance entry and exit control.',
    goalDescription: 'Balance freestanding with a safe, controlled exit. Hold for 15 seconds.',
    targetPRSeconds: 15,
  },
  {
    id: 6,
    name: 'Freestanding Alignment',
    subtitle: 'Step 6: Master Balance & Form',
    description: 'Master freestanding balance. Minimize wobbling, lock your shoulders, squeeze your glutes, and point your toes. Track your personal records.',
    goalDescription: 'Strict freestanding hold with a 90%+ alignment score. Hold for 20 seconds.',
    targetPRSeconds: 20,
  },
];

