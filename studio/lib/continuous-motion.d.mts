import type {Continuity, ContinuousObject} from '../src/types';
export type Matrix2D = [number, number, number, number, number, number];
export type Rect = {x: number; y: number; width: number; height: number};
export type ObjectState = Omit<ContinuousObject, 'keyframes'> & {
  x: number; y: number; w: number; h: number; opacity: number; rotation: number; radius: number; projectedRect: Rect;
};
export type CameraState = {x: number; y: number; zoom: number; rotation: number; matrix: Matrix2D};
export function cameraMatrix(camera: Omit<CameraState, 'matrix'>, width: number, height: number): Matrix2D;
export function transformPoint(matrix: Matrix2D, x: number, y: number): {x: number; y: number};
export function projectedObjectRect(object: {x: number; y: number; w: number; h: number; rotation: number}, matrix: Matrix2D): Rect;
export function sampleContinuity(continuity: Continuity, time: number, width: number, height: number): {time: number; camera: CameraState; objects: ObjectState[]};
