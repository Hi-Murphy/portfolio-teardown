import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, type RefObject } from 'react';
import type { Camera } from 'three';

export interface PickBridgeHandle {
  camera: Camera | null;
  progress: Float32Array | null;
  onFrame: (() => void) | null;
}

export interface PickBridgeProps {
  readonly bridgeRef: RefObject<PickBridgeHandle>;
  readonly progressRef?: RefObject<Float32Array | null>;
}

export function PickBridge({ bridgeRef, progressRef }: PickBridgeProps) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    const bridge = bridgeRef.current;

    bridge.camera = camera;
    bridge.progress = progressRef?.current ?? null;

    return () => {
      bridge.camera = null;
      bridge.progress = null;
    };
  }, [bridgeRef, camera, progressRef]);

  useFrame(() => {
    const bridge = bridgeRef.current;

    bridge.progress = progressRef?.current ?? null;

    if (bridge.camera === null || bridge.progress === null) return;
    bridge.onFrame?.();
  });

  return null;
}
