// ============================================================
// Axon — useAnimationControls hook
//
// Extracted from ModelViewer3D.tsx for <500 line rule.
// Manages GLTF animation state: play/pause/seek/speed/select.
// ============================================================

import { useState, useCallback, useRef } from 'react';
import * as THREE from 'three';
import type { AnimationInfo } from '@/app/components/viewer3d/AnimationControls';
import { logger } from '@/app/lib/logger';

export interface AnimationControlsState {
  // State
  animationInfos: AnimationInfo[];
  currentAnimIndex: number;
  isAnimPlaying: boolean;
  animCurrentTime: number;
  animDuration: number;
  animSpeed: number;
  // Refs (exposed for the render loop)
  mixerRef: React.MutableRefObject<THREE.AnimationMixer | null>;
  animActionsRef: React.MutableRefObject<THREE.AnimationAction[]>;
  clockRef: React.MutableRefObject<THREE.Clock>;
  lastAnimTimeUpdateRef: React.MutableRefObject<number>;
  // Handlers
  handleAnimPlay: () => void;
  handleAnimPause: () => void;
  handleAnimSeek: (time: number) => void;
  handleAnimSelect: (index: number) => void;
  handleAnimSpeedChange: (speed: number) => void;
  handleAnimReset: () => void;
  /** Call this after GLTF loads to init animations */
  initAnimations: (modelGroup: THREE.Object3D, animations: THREE.AnimationClip[]) => void;
  /** Call from render loop to update mixer + throttled time state */
  updateAnimation: () => void;
}

/** Throttle timeline state updates to ~4fps (avoid 60fps React re-renders) */
const ANIM_TIME_THROTTLE_MS = 250;

export function useAnimationControls(): AnimationControlsState {
  const [animationInfos, setAnimationInfos] = useState<AnimationInfo[]>([]);
  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);
  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
  const [animCurrentTime, setAnimCurrentTime] = useState(0);
  const [animDuration, setAnimDuration] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);

  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animActionsRef = useRef<THREE.AnimationAction[]>([]);
  const clockRef = useRef(new THREE.Clock());
  const lastAnimTimeUpdateRef = useRef(0);

  const initAnimations = useCallback((modelGroup: THREE.Object3D, animations: THREE.AnimationClip[]) => {
    if (!animations || animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(modelGroup);
    mixerRef.current = mixer;
    clockRef.current.start();

    const infos: AnimationInfo[] = animations.map((clip, i) => ({
      name: clip.name || `Animation ${i + 1}`,
      duration: clip.duration,
      index: i,
    }));
    setAnimationInfos(infos);
    setAnimDuration(infos[0]?.duration || 0);

    const actions = animations.map(clip => mixer.clipAction(clip));
    animActionsRef.current = actions;
    logger.info('useAnimationControls', `Found ${infos.length} GLTF animation(s)`);
  }, []);

  const updateAnimation = useCallback(() => {
    if (!mixerRef.current) return;
    const delta = clockRef.current.getDelta();
    mixerRef.current.update(delta);

    const now = performance.now();
    if (now - lastAnimTimeUpdateRef.current > ANIM_TIME_THROTTLE_MS) {
      lastAnimTimeUpdateRef.current = now;
      const action = animActionsRef.current[currentAnimIndex];
      if (action) setAnimCurrentTime(action.time);
    }
  }, [currentAnimIndex]);

  const handleAnimPlay = useCallback(() => {
    const action = animActionsRef.current[currentAnimIndex];
    if (action && mixerRef.current) {
      action.play();
      action.paused = false;
      setIsAnimPlaying(true);
    }
  }, [currentAnimIndex]);

  const handleAnimPause = useCallback(() => {
    const action = animActionsRef.current[currentAnimIndex];
    if (action) {
      action.paused = true;
      setIsAnimPlaying(false);
    }
  }, [currentAnimIndex]);

  const handleAnimSeek = useCallback((time: number) => {
    const action = animActionsRef.current[currentAnimIndex];
    if (action && mixerRef.current) {
      action.time = time;
      mixerRef.current.update(0);
      setAnimCurrentTime(time);
    }
  }, [currentAnimIndex]);

  const handleAnimSelect = useCallback((index: number) => {
    animActionsRef.current.forEach(a => a.stop());
    setCurrentAnimIndex(index);
    setAnimDuration(animationInfos[index]?.duration || 0);
    setAnimCurrentTime(0);
    setIsAnimPlaying(false);
  }, [animationInfos]);

  const handleAnimSpeedChange = useCallback((speed: number) => {
    setAnimSpeed(speed);
    if (mixerRef.current) mixerRef.current.timeScale = speed;
  }, []);

  const handleAnimReset = useCallback(() => {
    animActionsRef.current.forEach(a => a.stop());
    setAnimCurrentTime(0);
    setIsAnimPlaying(false);
  }, []);

  return {
    animationInfos,
    currentAnimIndex,
    isAnimPlaying,
    animCurrentTime,
    animDuration,
    animSpeed,
    mixerRef,
    animActionsRef,
    clockRef,
    lastAnimTimeUpdateRef,
    handleAnimPlay,
    handleAnimPause,
    handleAnimSeek,
    handleAnimSelect,
    handleAnimSpeedChange,
    handleAnimReset,
    initAnimations,
    updateAnimation,
  };
}
