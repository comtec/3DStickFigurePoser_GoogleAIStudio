
export interface Vector3Data {
  x: number;
  y: number;
  z: number;
}

export interface PoseData {
  [jointName: string]: Vector3Data;
}
