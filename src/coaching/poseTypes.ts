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
  isInverted: boolean; // hips above shoulders -> likely a handstand attempt
  alignmentScore: number; // 0..1, how vertically stacked wrists/shoulders/hips/ankles are
  message: string;
}
