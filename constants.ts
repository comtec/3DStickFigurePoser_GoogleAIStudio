import type { PoseData } from './types';

export const INITIAL_POSE_DATA: PoseData = {
  torso: { x: 0, y: 0, z: 0 },
  neck: { x: 0, y: 0, z: 0 },
  leftShoulder: { x: 0, y: 0, z: 0 },
  leftElbow: { x: 0, y: 0, z: 0 },
  rightShoulder: { x: 0, y: 0, z: 0 },
  rightElbow: { x: 0, y: 0, z: 0 },
  leftHip: { x: 0, y: 0, z: 0 },
  leftKnee: { x: 0, y: 0, z: 0 },
  rightHip: { x: 0, y: 0, z: 0 },
  rightKnee: { x: 0, y: 0, z: 0 },
};

export const JOINT_NAMES = {
  HIPS: 'hips',
  TORSO: 'torso',
  NECK: 'neck',
  HEAD: 'head',
  LEFT_SHOULDER: 'leftShoulder',
  LEFT_ELBOW: 'leftElbow',
  LEFT_HAND: 'leftHand',
  RIGHT_SHOULDER: 'rightShoulder',
  RIGHT_ELBOW: 'rightElbow',
  RIGHT_HAND: 'rightHand',
  LEFT_HIP: 'leftHip',
  LEFT_KNEE: 'leftKnee',
  LEFT_FOOT: 'leftFoot',
  RIGHT_HIP: 'rightHip',
  RIGHT_KNEE: 'rightKnee',
  RIGHT_FOOT: 'rightFoot',
};
