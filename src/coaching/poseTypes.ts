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
  targetPRSeconds: number; // seconds for 'timer', target reps for 'reps'
  type: 'timer' | 'reps';
}

export const DRILL_STEPS: DrillStep[] = [
  {
    id: 0,
    name: 'The Wrist Protocol',
    subtitle: 'Step 0: Injury Prevention',
    description: 'Perform simple wrist rocks on hands and knees, leaning weight into fingers and stretching tendons to build tolerance.',
    goalDescription: 'Complete the 60-second guided wrist mobility sequence.',
    targetPRSeconds: 60,
    type: 'timer',
  },
  {
    id: 1,
    name: 'The Hollow Body Hold',
    subtitle: 'Step 1: Alignment Blueprint',
    description: 'Lie on your back, press your lower back flat to the floor, lift legs and extend arms straight back. Eliminates "banana back".',
    goalDescription: 'Hold a strict hollow body shape for 30 seconds.',
    targetPRSeconds: 30,
    type: 'timer',
  },
  {
    id: 2,
    name: 'The Ground Pike Hold',
    subtitle: 'Step 2: Day-One Inversion',
    description: 'Hands and feet on floor, push hips high into an inverted V. Lock elbows and get comfortable with blood rushing to your head.',
    goalDescription: 'Hold an active V-pike shape for 30 seconds.',
    targetPRSeconds: 30,
    type: 'timer',
  },
  {
    id: 3,
    name: 'The Ground Pike Push-Up',
    subtitle: 'Step 3: Intro to Pressing',
    description: 'From ground pike, lower your head forward in front of hands (forming a triangle) and press back up. Builds shoulder strength.',
    goalDescription: 'Perform a clean set of 5 repetitions.',
    targetPRSeconds: 5,
    type: 'reps',
  },
  {
    id: 4,
    name: 'The Box Pike Hold',
    subtitle: 'Step 4: Increasing the Load',
    description: 'Elevate your feet on a box or step. Push your hips high to stack your torso vertically over your hands.',
    goalDescription: 'Hold a vertical box pike for 30 seconds.',
    targetPRSeconds: 30,
    type: 'timer',
  },
  {
    id: 5,
    name: 'The Box Pike Push-Up',
    subtitle: 'Step 5: Base Pressing Strength',
    description: 'From box pike, lower your head forward of your hands, tuck elbows, and press back up. Builds vertical pushing power.',
    goalDescription: 'Perform a clean set of 5 repetitions.',
    targetPRSeconds: 5,
    type: 'reps',
  },
  {
    id: 6,
    name: 'The Partial Wall Walk',
    subtitle: 'Step 6: The Bridge',
    description: 'Start in a push-up position with feet on the wall. Walk hands back and feet up to a 45-degree angle. Trust the wall.',
    goalDescription: 'Hold a 45-degree wall walk for 30 seconds.',
    targetPRSeconds: 30,
    type: 'timer',
  },
  {
    id: 7,
    name: 'The Full Wall Walk',
    subtitle: 'Step 7: First Full Inversion',
    description: 'Walk hands all the way back until your stomach is close to the wall. Apply hollow body tension in a vertical line.',
    goalDescription: 'Hold a near-vertical wall-walk alignment for 45 seconds.',
    targetPRSeconds: 45,
    type: 'timer',
  },
  {
    id: 8,
    name: 'The Safety Bail',
    subtitle: 'Step 8: Conquer the Fear',
    description: 'Kick up to the wall, then purposefully take one hand off the ground, twist your hips, and step down sideways. Falling is safe.',
    goalDescription: 'Perform 5 clean side-bails to remove fear of falling.',
    targetPRSeconds: 5,
    type: 'reps',
  },
  {
    id: 9,
    name: 'The Wall Kick-Up',
    subtitle: 'Step 9: Finding the Entry',
    description: 'Face the wall and kick up softly until your heels tap light as a feather. Do not plunge shoulders or slam the wall.',
    goalDescription: 'Complete 3 soft, controlled wall entries in a row.',
    targetPRSeconds: 3,
    type: 'reps',
  },
  {
    id: 10,
    name: 'The Float (Wall Taps)',
    subtitle: 'Step 10: Active Balance Taps',
    description: 'Kick up to the wall. Use your fingertips to gently pull your heels off the wall. Timer counts only when you float.',
    goalDescription: 'Accumulate 10 seconds of freestanding float time.',
    targetPRSeconds: 10,
    type: 'timer',
  },
  {
    id: 11,
    name: 'Antigravity',
    subtitle: 'Step 11: The Final Boss',
    description: 'No walls. Kick up in open space and fight for balance. Form is graded strictly to record your personal bests.',
    goalDescription: 'Freestanding balance. Silver: 3s, Gold: 5s, Platinum: 10s.',
    targetPRSeconds: 5,
    type: 'timer',
  },
];

