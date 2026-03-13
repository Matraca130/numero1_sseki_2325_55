// ============================================================
// Axon — ModelViewer3D Component
//
// Three.js viewer for 3D anatomical models (procedural fallback).
// Integrates:
//   - PinSystem: professor pin placement / student pin viewing
//   - PinEditor: professor side panel for pin management
//   - StudentNotes3D: student spatial + text notes
//   - LayerPanel: professor side panel for layer management
//   - ModelPartLoader: loads and manages model parts and layers
//   - AnimationControls: F3 GLTF animation play/pause/timeline
//   - ClippingPlaneControls: F4 anatomical cross-section clipping
//   - CaptureViewDialog: F5 screenshot -> flashcard creation
//   - ExplodeControl: F6 exploded view for multi-part models
//
// Props:
//   modelId    — ID of the model_3d record
//   modelName  — display name
//   fileUrl    — optional URL to a .glb/.gltf file for direct single-file loading
//   mode       — "view" (student) or "edit" (professor)
//   topicId    — optional topic ID for keyword autocomplete + flashcard creation
// ============================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import clsx from 'clsx';
import { Loader2, List, Layers, AlertTriangle, RefreshCw, Keyboard } from 'lucide-react';
import { PinSystem } from '@/app/components/viewer3d/PinSystem';
import type { PinMode } from '@/app/components/viewer3d/PinSystem';
import { PinEditor } from '@/app/components/viewer3d/PinEditor';
import { StudentNotes3D } from '@/app/components/viewer3d/StudentNotes3D';
import { LayerPanel } from '@/app/components/viewer3d/LayerPanel';
import { ModelPartLoader, getStoredParts, getStoredLayers, fetchPartsFromAPI, fetchLayersFromAPI } from '@/app/components/viewer3d/ModelPartMesh';
import type { ModelLayerConfig } from '@/app/components/viewer3d/ModelPartMesh';
import { disposeMaterialTextures } from '@/app/components/viewer3d/three-utils';
import { logger } from '@/app/lib/logger';
import { uploadThumbnail, updateModel3D } from '@/app/lib/model3d-api';
// DIFF 2: New imports for F3/F4/F5/F6
import { AnimationControls } from '@/app/components/viewer3d/AnimationControls';
import type { AnimationInfo } from '@/app/components/viewer3d/AnimationControls';
import { ClippingPlaneControls } from '@/app/components/viewer3d/ClippingPlaneControls';
import { CaptureViewDialog } from '@/app/components/viewer3d/CaptureViewDialog';
import { ExplodeControl } from '@/app/components/viewer3d/ExplodeControl';

// ── Model Data by topic (procedural fallback) ──
const MODEL_CONFIGS: Record<string, {
  buildModel: (scene: THREE.Scene) => void;
  cameraPos: [number, number, number];
}> = {
  'shoulder-joint-3d': { cameraPos: [4, 3, 5], buildModel: (scene) => buildShoulderModel(scene) },
  'arm-muscles-3d': { cameraPos: [3, 2, 5], buildModel: (scene) => buildArmModel(scene) },
  'heart-3d': { cameraPos: [4, 2, 5], buildModel: (scene) => buildHeartModel(scene) },
};

const DEFAULT_CONFIG = {
  cameraPos: [4, 3, 5] as [number, number, number],
  buildModel: (scene: THREE.Scene) => { buildGenericBone(scene); },
};

// ══════════════════════════════════════════════
// ── Model Builders (procedural fallback) ──
// ══════════════════════════════════════════════

function createBoneMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf5e6d3, roughness: 0.6, metalness: 0.05, clearcoat: 0.1, clearcoatRoughness: 0.4,
  });
}

function createMuscleMaterial(color = 0xcc4444) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.7, metalness: 0.02, clearcoat: 0.3, clearcoatRoughness: 0.6,
  });
}

function createCartillageMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xb8d4e3, roughness: 0.4, metalness: 0.0, clearcoat: 0.5, clearcoatRoughness: 0.2,
    transparent: true, opacity: 0.85,
  });
}

function buildGenericBone(scene: THREE.Scene) {
  const boneMat = createBoneMaterial();
  const shaftPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 4 - 2;
    const r = 0.25 + 0.15 * Math.cos(Math.PI * t);
    shaftPoints.push(new THREE.Vector2(r, y));
  }
  const shaftGeo = new THREE.LatheGeometry(shaftPoints, 24);
  const shaft = new THREE.Mesh(shaftGeo, boneMat);
  scene.add(shaft);

  const proxGeo = new THREE.SphereGeometry(0.55, 24, 24);
  const prox = new THREE.Mesh(proxGeo, boneMat);
  prox.position.y = 2;
  scene.add(prox);

  const distGeo1 = new THREE.SphereGeometry(0.4, 20, 20);
  const dist1 = new THREE.Mesh(distGeo1, boneMat);
  dist1.position.set(-0.2, -2, 0);
  scene.add(dist1);
  const dist2 = new THREE.Mesh(distGeo1.clone(), boneMat);
  dist2.position.set(0.2, -2, 0);
  scene.add(dist2);

  const cartGeo = new THREE.SphereGeometry(0.56, 24, 24, 0, Math.PI * 2, 0, Math.PI / 3);
  const cart = new THREE.Mesh(cartGeo, createCartillageMaterial());
  cart.position.y = 2;
  scene.add(cart);
}

function buildShoulderModel(scene: THREE.Scene) {
  const boneMat = createBoneMaterial();
  const cartMat = createCartillageMaterial();

  const humerusPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const y = t * 4 - 1.5;
    const r = 0.22 + 0.12 * Math.pow(Math.cos(Math.PI * t * 0.8), 2);
    humerusPoints.push(new THREE.Vector2(r, y));
  }
  const humerusGeo = new THREE.LatheGeometry(humerusPoints, 20);
  const humerus = new THREE.Mesh(humerusGeo, boneMat);
  humerus.position.set(0.2, -0.3, 0);
  scene.add(humerus);

  const headGeo = new THREE.SphereGeometry(0.65, 24, 24);
  const head = new THREE.Mesh(headGeo, boneMat);
  head.position.set(0, 1.8, 0);
  scene.add(head);

  const cartHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2.2),
    cartMat,
  );
  cartHead.position.set(0, 1.8, 0);
  cartHead.rotation.x = -0.3;
  scene.add(cartHead);

  const tubercleGeo = new THREE.SphereGeometry(0.3, 16, 16);
  const tubercle = new THREE.Mesh(tubercleGeo, boneMat);
  tubercle.position.set(0.7, 1.5, 0.3);
  scene.add(tubercle);

  const scapShape = new THREE.Shape();
  scapShape.moveTo(0, 0);
  scapShape.lineTo(-0.8, 1.5);
  scapShape.lineTo(-0.6, 2.8);
  scapShape.lineTo(0.2, 2.5);
  scapShape.lineTo(0.5, 1.8);
  scapShape.lineTo(0.3, 0.5);
  scapShape.closePath();
  const scapGeo = new THREE.ExtrudeGeometry(scapShape, {
    depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3,
  });
  const scapula = new THREE.Mesh(scapGeo, boneMat);
  scapula.position.set(-1.5, -0.5, -0.2);
  scapula.rotation.y = 0.2;
  scene.add(scapula);

  const glenoidGeo = new THREE.SphereGeometry(0.45, 20, 20, 0, Math.PI * 2, 0, Math.PI / 2.5);
  const glenoid = new THREE.Mesh(glenoidGeo, cartMat);
  glenoid.position.set(-0.6, 1.5, 0.1);
  glenoid.rotation.z = Math.PI / 2;
  glenoid.rotation.x = -0.2;
  scene.add(glenoid);

  const acromGeo = new THREE.BoxGeometry(1.2, 0.12, 0.4);
  const acromion = new THREE.Mesh(acromGeo, boneMat);
  acromion.position.set(-0.8, 2.5, 0);
  acromion.rotation.z = -0.15;
  scene.add(acromion);

  const clavPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    clavPoints.push(new THREE.Vector2(0.08 + 0.04 * Math.sin(Math.PI * t), t * 2.5 - 1.25));
  }
  const clavGeo = new THREE.LatheGeometry(clavPoints, 12);
  const clavicle = new THREE.Mesh(clavGeo, boneMat);
  clavicle.position.set(-0.3, 2.6, 0.3);
  clavicle.rotation.z = Math.PI / 2;
  scene.add(clavicle);
}

function buildArmModel(scene: THREE.Scene) {
  const boneMat = createBoneMaterial();
  const muscleMat = createMuscleMaterial(0xcc5555);
  const muscleMat2 = createMuscleMaterial(0xbb4444);

  const humerusPoints: THREE.Vector2[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const y = t * 4 - 2;
    const r = 0.18 + 0.08 * Math.cos(Math.PI * t);
    humerusPoints.push(new THREE.Vector2(r, y));
  }
  const humerusGeo = new THREE.LatheGeometry(humerusPoints, 16);
  const humerus = new THREE.Mesh(humerusGeo, boneMat);
  scene.add(humerus);

  const headGeo = new THREE.SphereGeometry(0.45, 20, 20);
  const head = new THREE.Mesh(headGeo, boneMat);
  head.position.y = 2;
  scene.add(head);

  const bicepGeo = new THREE.CapsuleGeometry(0.28, 2.2, 12, 16);
  const bicep = new THREE.Mesh(bicepGeo, muscleMat);
  bicep.position.set(0.35, 0.3, 0.25);
  bicep.scale.set(0.9, 1, 0.7);
  scene.add(bicep);

  const tricepGeo = new THREE.CapsuleGeometry(0.32, 2, 12, 16);
  const tricep = new THREE.Mesh(tricepGeo, muscleMat2);
  tricep.position.set(-0.2, 0.1, -0.3);
  tricep.scale.set(0.85, 1, 0.8);
  scene.add(tricep);

  const deltGeo = new THREE.SphereGeometry(0.6, 20, 20, 0, Math.PI * 1.5, 0, Math.PI / 1.8);
  const deltoid = new THREE.Mesh(deltGeo, createMuscleMaterial(0xcc6666));
  deltoid.position.set(0.3, 1.7, 0);
  deltoid.scale.set(1, 0.8, 1);
  scene.add(deltoid);

  const condGeo = new THREE.SphereGeometry(0.28, 16, 16);
  const cond1 = new THREE.Mesh(condGeo, boneMat);
  cond1.position.set(-0.15, -2, 0);
  scene.add(cond1);
  const cond2 = new THREE.Mesh(condGeo.clone(), boneMat);
  cond2.position.set(0.15, -2, 0);
  scene.add(cond2);
}

function buildHeartModel(scene: THREE.Scene) {
  const heartMat = createMuscleMaterial(0xcc3333);
  const vesselMat = createMuscleMaterial(0xaa2222);
  const veinMat = new THREE.MeshPhysicalMaterial({
    color: 0x4466cc, roughness: 0.5, metalness: 0.05, clearcoat: 0.3,
  });

  const lvGeo = new THREE.SphereGeometry(0.9, 24, 24);
  const lv = new THREE.Mesh(lvGeo, heartMat);
  lv.position.set(0.3, -0.3, 0);
  lv.scale.set(0.85, 1.1, 0.9);
  scene.add(lv);

  const rvGeo = new THREE.SphereGeometry(0.7, 24, 24);
  const rv = new THREE.Mesh(rvGeo, heartMat);
  rv.position.set(-0.4, -0.2, 0.2);
  rv.scale.set(0.8, 1, 0.85);
  scene.add(rv);

  const laGeo = new THREE.SphereGeometry(0.55, 20, 20);
  const la = new THREE.Mesh(laGeo, heartMat);
  la.position.set(0.3, 0.8, -0.1);
  scene.add(la);

  const raGeo = new THREE.SphereGeometry(0.5, 20, 20);
  const ra = new THREE.Mesh(raGeo, heartMat);
  ra.position.set(-0.45, 0.75, 0.15);
  scene.add(ra);

  const aortaGeo = new THREE.CylinderGeometry(0.18, 0.2, 1.5, 16);
  const aorta = new THREE.Mesh(aortaGeo, vesselMat);
  aorta.position.set(0.15, 1.7, -0.1);
  aorta.rotation.z = -0.15;
  scene.add(aorta);

  const archGeo = new THREE.TorusGeometry(0.35, 0.15, 12, 16, Math.PI);
  const arch = new THREE.Mesh(archGeo, vesselMat);
  arch.position.set(0, 2.3, -0.1);
  arch.rotation.x = Math.PI / 2;
  scene.add(arch);

  const pulGeo = new THREE.CylinderGeometry(0.14, 0.16, 1.2, 12);
  const pulmonary = new THREE.Mesh(pulGeo, veinMat);
  pulmonary.position.set(-0.3, 1.6, 0.3);
  pulmonary.rotation.z = 0.2;
  scene.add(pulmonary);

  const apexGeo = new THREE.ConeGeometry(0.4, 0.6, 16);
  const apex = new THREE.Mesh(apexGeo, heartMat);
  apex.position.set(0.1, -1.2, 0.1);
  apex.rotation.z = 0.1;
  scene.add(apex);
}


// ══════════════════════════════════════════════
// ── ModelViewer3D Component ──
// ══════════════════════════════════════════════
// DIFF 1: Added topicId to props
interface ModelViewer3DProps {
  modelId: string;
  modelName: string;
  /** Optional URL to a .glb/.gltf file for direct single-file loading */
  fileUrl?: string;
  mode?: PinMode; // "view" (student default) | "edit" (professor)
  /** Topic ID for keyword autocomplete (F1) + flashcard creation (F5) */
  topicId?: string;
}

export function ModelViewer3D({ modelId, modelName, fileUrl, mode = 'view', topicId }: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const modelMeshesRef = useRef<THREE.Object3D[]>([]);
  const partLoaderRef = useRef<ModelPartLoader | null>(null);

  // ── Frame callback registry (replaces DOM hacking) ──
  const frameCallbacksRef = useRef<Set<() => void>>(new Set());

  const registerFrameCallback = useCallback((cb: () => void) => {
    frameCallbacksRef.current.add(cb);
    return () => { frameCallbacksRef.current.delete(cb); };
  }, []);

  // State for child components
  const [sceneReady, setSceneReady] = useState(false);
  const [showPinEditor, setShowPinEditor] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [layerUpdateKey, setLayerUpdateKey] = useState(0);
  const [storedLayers, setStoredLayersState] = useState<ModelLayerConfig[]>([]);
  const [hasMultiPart, setHasMultiPart] = useState(false);
  /** True while a single-file GLB is being downloaded */
  const [glbLoading, setGlbLoading] = useState(false);

  // ── F3 audit: keyboard shortcut visibility toggles ──
  const [showPins, setShowPins] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showShortcutHint, setShowShortcutHint] = useState(false);

  // ── F3: GLTF Animation state (DIFF 3) ──
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const animActionsRef = useRef<THREE.AnimationAction[]>([]);
  const [animationInfos, setAnimationInfos] = useState<AnimationInfo[]>([]);
  const [currentAnimIndex, setCurrentAnimIndex] = useState(0);
  const [isAnimPlaying, setIsAnimPlaying] = useState(false);
  const [animCurrentTime, setAnimCurrentTime] = useState(0);
  const [animDuration, setAnimDuration] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const clockRef = useRef(new THREE.Clock());
  const lastAnimTimeUpdateRef = useRef(0);
  const ANIM_TIME_THROTTLE_MS = 250; // ~4fps for timeline UI (B2 fix)

  // ── 3DP-2: Auto-thumbnail capture ──
  const thumbnailCapturedRef = useRef(false);

  const captureThumbnail = useCallback(() => {
    if (mode !== 'edit' || thumbnailCapturedRef.current) return;
    thumbnailCapturedRef.current = true;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!renderer || !scene || !camera) return;

    renderer.render(scene, camera);
    const dataUrl = renderer.domElement.toDataURL('image/png');

    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `thumb-${modelId}.png`, { type: 'image/png' });
        return uploadThumbnail(file, modelId);
      })
      .then(thumbnailUrl => {
        return updateModel3D(modelId, { thumbnail_url: thumbnailUrl });
      })
      .then(() => {
        logger.info('ModelViewer3D', `Thumbnail auto-captured for model ${modelId}`);
      })
      .catch(err => {
        logger.warn('ModelViewer3D', 'Auto-thumbnail capture failed (non-critical):', err);
      });
  }, [modelId, mode]);

  // ── WebGL context loss recovery (G1) ──
  const [contextLost, setContextLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const contextLossCountRef = useRef(0);
  const contextLossTimestampRef = useRef(0);
  const MAX_CONTEXT_LOSSES = 2;
  const CONTEXT_LOSS_WINDOW_MS = 30000;

  // ── Pin refresh key ──
  const [pinRefreshKey, setPinRefreshKey] = useState(0);
  const handlePinsChanged = useCallback(() => {
    setPinRefreshKey(k => k + 1);
  }, []);

  const config = MODEL_CONFIGS[modelId] || DEFAULT_CONFIG;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111118);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(...config.cameraPos);
    camera.lookAt(0, 0.5, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0.5, 0);
    controls.minDistance = 2;
    controls.maxDistance = 12;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controlsRef.current = controls;

    // Lighting
    const ambLight = new THREE.AmbientLight(0x404060, 0.8);
    scene.add(ambLight);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-3, 2, -3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0x4488ff, 0.6);
    rimLight.position.set(0, -2, -5);
    scene.add(rimLight);

    // Ground grid
    const gridHelper = new THREE.GridHelper(8, 16, 0x222233, 0x1a1a2a);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    const storedParts = getStoredParts(modelId);
    const layers = getStoredLayers(modelId);
    setStoredLayersState(layers);

    if (storedParts.length > 0) {
      setHasMultiPart(true);
      const loader = new ModelPartLoader(scene, () => {
        setLayerUpdateKey(k => k + 1);
        modelMeshesRef.current = loader.getAllMeshes();
      });
      loader.init(storedParts);
      loader.loadAllVisible();
      partLoaderRef.current = loader;
      setTimeout(captureThumbnail, 1500);
    } else if (fileUrl) {
      setHasMultiPart(false);
      setGlbLoading(true);

      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        fileUrl,
        (gltf) => {
          const modelGroup = gltf.scene;
          scene.add(modelGroup);

          const meshes: THREE.Object3D[] = [];
          modelGroup.traverse((obj) => {
            if (obj instanceof THREE.Mesh) meshes.push(obj);
          });
          modelMeshesRef.current = meshes;

          // DIFF 5: Detect and setup GLTF animations
          if (gltf.animations && gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(modelGroup);
            mixerRef.current = mixer;
            clockRef.current.start();

            const infos: AnimationInfo[] = gltf.animations.map((clip: THREE.AnimationClip, i: number) => ({
              name: clip.name || `Animation ${i + 1}`,
              duration: clip.duration,
              index: i,
            }));
            setAnimationInfos(infos);
            setAnimDuration(infos[0]?.duration || 0);

            const actions = gltf.animations.map((clip: THREE.AnimationClip) => mixer.clipAction(clip));
            animActionsRef.current = actions;
            logger.info('ModelViewer3D', `Found ${infos.length} GLTF animation(s)`);
          }

          // Auto-fit camera to model bounding box
          const box = new THREE.Box3().setFromObject(modelGroup);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const distance = maxDim * 2;

          camera.position.set(
            center.x + distance * 0.5,
            center.y + distance * 0.3,
            center.z + distance * 0.5,
          );
          controls.target.copy(center);
          controls.minDistance = maxDim * 0.5;
          controls.maxDistance = maxDim * 5;
          controls.update();

          gridHelper.position.y = box.min.y - 0.1;

          setGlbLoading(false);
          logger.info('ModelViewer3D', `GLB loaded: ${fileUrl}`);
          setTimeout(captureThumbnail, 500);
        },
        undefined,
        (err) => {
          logger.error('ModelViewer3D', 'GLB load error:', err);
          setGlbLoading(false);
          const fallbackGroup = new THREE.Group();
          config.buildModel(fallbackGroup);
          scene.add(fallbackGroup);
          const meshes: THREE.Object3D[] = [];
          fallbackGroup.traverse((obj) => {
            if (obj instanceof THREE.Mesh) meshes.push(obj);
          });
          modelMeshesRef.current = meshes;
        },
      );
    } else {
      setHasMultiPart(false);
      const modelGroup = new THREE.Group();
      config.buildModel(modelGroup);
      scene.add(modelGroup);

      const meshes: THREE.Object3D[] = [];
      modelGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          meshes.push(obj);
        }
      });
      modelMeshesRef.current = meshes;
    }

    setSceneReady(true);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // DIFF 4: F3 Update animation mixer (with B2 throttle fix)
      if (mixerRef.current) {
        const delta = clockRef.current.getDelta();
        mixerRef.current.update(delta);
        // Throttle time state update to ~4fps (avoid 60fps React re-renders)
        const now = performance.now();
        if (now - lastAnimTimeUpdateRef.current > ANIM_TIME_THROTTLE_MS) {
          lastAnimTimeUpdateRef.current = now;
          const action = animActionsRef.current[currentAnimIndex];
          if (action) setAnimCurrentTime(action.time);
        }
      }

      // Call projection callbacks from PinSystem and StudentNotes3D
      frameCallbacksRef.current.forEach(cb => {
        try {
          cb();
        } catch (e) {
          logger.error('ModelViewer3D', 'Frame callback error:', e);
        }
      });
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ── WebGL context loss/restore handlers ──
    const canvas = renderer.domElement;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(animFrameRef.current);
      setSceneReady(false);
      setContextLost(true);
      logger.warn('ModelViewer3D', 'WebGL context lost');

      const now = Date.now();
      if (now - contextLossTimestampRef.current > CONTEXT_LOSS_WINDOW_MS) {
        contextLossCountRef.current = 0;
        contextLossTimestampRef.current = now;
      }
      contextLossCountRef.current++;
    };

    const handleContextRestored = () => {
      logger.info('ModelViewer3D', 'WebGL context restored — remounting scene');
      setContextLost(false);

      if (contextLossCountRef.current <= MAX_CONTEXT_LOSSES) {
        setSceneKey(k => k + 1);
      }
    };

    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    return () => {
      setSceneReady(false);
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      renderer.dispose();
      partLoaderRef.current?.dispose();
      partLoaderRef.current = null;
      // DIFF 6: Cleanup animation mixer
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      animActionsRef.current = [];
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => {
            disposeMaterialTextures(m);
            m.dispose();
          });
        }
      });
    };
  }, [modelId, fileUrl, config, sceneKey]);

  // ── Async API fetch: update parts/layers from backend ──
  useEffect(() => {
    if (!sceneReady || !sceneRef.current) return;
    let cancelled = false;

    (async () => {
      const [apiParts, apiLayers] = await Promise.all([
        fetchPartsFromAPI(modelId),
        fetchLayersFromAPI(modelId),
      ]);
      if (cancelled) return;

      setStoredLayersState(apiLayers);

      if (apiParts.length > 0 && sceneRef.current) {
        setHasMultiPart(true);
        const scene = sceneRef.current;

        if (partLoaderRef.current) {
          partLoaderRef.current.dispose();
        }

        const loader = new ModelPartLoader(scene, () => {
          setLayerUpdateKey(k => k + 1);
          modelMeshesRef.current = loader.getAllMeshes();
        });
        loader.init(apiParts);
        loader.loadAllVisible();
        partLoaderRef.current = loader;
      }
    })();

    return () => { cancelled = true; };
  }, [modelId, sceneReady, sceneKey]);

  // ── Keyboard shortcuts ──
  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    camera.position.set(...config.cameraPos);
    controls.target.set(0, 0.5, 0);
    controls.update();
  }, [config]);

  const focusModel = useCallback(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const meshes = modelMeshesRef.current;
    if (meshes.length === 0) return;

    const box = new THREE.Box3();
    meshes.forEach(mesh => box.expandByObject(mesh));
    if (box.isEmpty()) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    camera.position.set(
      center.x + distance * 0.5,
      center.y + distance * 0.3,
      center.z + distance * 0.5,
    );
    controls.target.copy(center);
    controls.update();
  }, []);

  // ── F3: Animation handlers (DIFF 7) ──
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (contextLost) return;

      switch (e.key.toLowerCase()) {
        case 'r':
          e.preventDefault();
          resetCamera();
          break;
        case 'f':
          e.preventDefault();
          focusModel();
          break;
        case 'l':
          if (hasMultiPart) {
            e.preventDefault();
            setShowLayerPanel(prev => !prev);
          }
          break;
        case 'p':
          e.preventDefault();
          if (mode === 'edit') {
            setShowPinEditor(prev => {
              if (!prev) handlePinsChanged();
              return !prev;
            });
          } else {
            setShowPins(prev => !prev);
          }
          break;
        case 'n':
          if (mode === 'view') {
            e.preventDefault();
            setShowNotes(prev => !prev);
          }
          break;
        case '?':
          setShowShortcutHint(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, hasMultiPart, contextLost, resetCamera, focusModel, handlePinsChanged]);

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* ── Pin System (handles markers + overlays) ── */}
      {/* DIFF 11: Pass topicId to PinSystem */}
      {sceneReady && showPins && (
        <PinSystem
          modelId={modelId}
          topicId={topicId}
          mode={mode}
          scene={sceneRef.current}
          camera={cameraRef.current}
          containerRef={containerRef}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
          refreshKey={pinRefreshKey}
        />
      )}

      {/* ── Student Notes (spatial + text) ── */}
      {sceneReady && mode === 'view' && showNotes && (
        <StudentNotes3D
          modelId={modelId}
          scene={sceneRef.current}
          camera={cameraRef.current}
          containerRef={containerRef}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
        />
      )}

      {/* ── Professor: Pin Editor toggle ── */}
      {mode === 'edit' && (
        <button
          onClick={() => { setShowPinEditor(!showPinEditor); if (!showPinEditor) handlePinsChanged(); }}
          className={clsx(
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
            showPinEditor
              ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
          )}
          style={{ left: 170 }}
        >
          <List size={12} />
          Panel Pins
        </button>
      )}

      {/* ── Professor: Pin Editor panel ── */}
      {mode === 'edit' && showPinEditor && (
        <PinEditor
          modelId={modelId}
          onPinsChanged={handlePinsChanged}
          camera={cameraRef.current}
          controls={controlsRef.current}
          onClose={() => setShowPinEditor(false)}
        />
      )}

      {/* ── Layer Panel toggle (both modes, only if multi-part) ── */}
      {hasMultiPart && (
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className={clsx(
            'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border',
            showLayerPanel
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10',
          )}
          style={{ left: mode === 'edit' ? 270 : 170 }}
        >
          <Layers size={12} />
          Capas
        </button>
      )}

      {/* ── Layer Panel ── */}
      {hasMultiPart && showLayerPanel && partLoaderRef.current && (
        <LayerPanel
          partLoader={partLoaderRef.current}
          layers={storedLayers}
          updateKey={layerUpdateKey}
          onClose={() => setShowLayerPanel(false)}
        />
      )}

      {/* ── F3: Animation Controls (DIFF 8) ── */}
      {sceneReady && animationInfos.length > 0 && (
        <AnimationControls
          animations={animationInfos}
          currentIndex={currentAnimIndex}
          isPlaying={isAnimPlaying}
          currentTime={animCurrentTime}
          duration={animDuration}
          speed={animSpeed}
          onPlay={handleAnimPlay}
          onPause={handleAnimPause}
          onSeek={handleAnimSeek}
          onSelectAnimation={handleAnimSelect}
          onSpeedChange={handleAnimSpeedChange}
          onReset={handleAnimReset}
        />
      )}

      {/* ── F4: Clipping Plane ── */}
      {sceneReady && (
        <ClippingPlaneControls
          renderer={rendererRef.current}
          scene={sceneRef.current}
          modelMeshes={modelMeshesRef.current}
          registerFrameCallback={registerFrameCallback}
        />
      )}

      {/* ── F5: Capture View (professor only) ── */}
      {mode === 'edit' && sceneReady && (
        <div className="absolute top-3 z-20" style={{ left: hasMultiPart ? 360 : 260 }}>
          <CaptureViewDialog
            modelId={modelId}
            modelName={modelName}
            topicId={topicId}
            renderer={rendererRef.current}
            scene={sceneRef.current}
            camera={cameraRef.current}
          />
        </div>
      )}

      {/* ── F6: Explode View (multi-part only) ── */}
      {hasMultiPart && sceneReady && partLoaderRef.current && (
        <div className="absolute bottom-12 right-3 z-20">
          <ExplodeControl
            partLoader={partLoaderRef.current}
            scene={sceneRef.current}
            modelMeshes={modelMeshesRef.current}
          />
        </div>
      )}

      {/* Model name watermark + shortcut hint */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3">
        <p className="text-[9px] text-gray-600 font-medium uppercase tracking-widest">{modelName}</p>
        <button
          onClick={() => setShowShortcutHint(prev => !prev)}
          className="flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
          title="Atajos de teclado (?)"
        >
          <Keyboard size={10} />
          <span>?</span>
        </button>
      </div>

      {/* ── F3: Keyboard shortcut hint overlay ── */}
      {showShortcutHint && (
        <div className="absolute bottom-12 left-3 z-30 p-3 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-[10px] space-y-1.5">
          <p className="text-gray-300 font-semibold mb-2">Atajos de teclado</p>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-gray-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">R</kbd>
            <span>Reset camara</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">F</kbd>
            <span>Enfocar modelo</span>
            {hasMultiPart && (<>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">L</kbd>
              <span>Capas</span>
            </>)}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">P</kbd>
            <span>{mode === 'edit' ? 'Panel Pins' : 'Mostrar/Ocultar Pins'}</span>
            {mode === 'view' && (<>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">N</kbd>
              <span>Mostrar/Ocultar Notas</span>
            </>)}
            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-center">Esc</kbd>
            <span>Volver</span>
          </div>
        </div>
      )}

      {/* ── GLB loading overlay ── */}
      {glbLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center space-y-2 p-5 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10">
            <Loader2 size={24} className="animate-spin text-teal-400 mx-auto" />
            <p className="text-[10px] text-gray-300">Cargando modelo 3D...</p>
            {fileUrl && (
              <p className="text-[8px] text-gray-600 max-w-[200px] truncate">{fileUrl.split('/').pop()}</p>
            )}
          </div>
        </div>
      )}

      {/* ── WebGL context loss overlay ── */}
      {contextLost && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-3 p-6 rounded-xl bg-zinc-900/90 border border-white/10 max-w-xs">
            <AlertTriangle size={28} className="mx-auto text-amber-400" />
            <h4 className="text-xs font-bold text-white">Error de GPU</h4>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              {contextLossCountRef.current > MAX_CONTEXT_LOSSES
                ? 'El contexto WebGL se ha perdido varias veces. Tu dispositivo puede no tener suficiente memoria de video.'
                : 'El contexto WebGL se ha perdido. Intentando recuperar...'}
            </p>
            {contextLossCountRef.current > MAX_CONTEXT_LOSSES ? (
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 mx-auto px-4 py-2 text-[10px] font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                Recargar pagina
              </button>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
                <Loader2 size={12} className="animate-spin" />
                Recuperando...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
