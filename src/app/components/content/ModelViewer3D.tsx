import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import clsx from 'clsx';
import { getModel3DPins, getModel3DNotes, createModel3DNote, deleteModel3DNote } from '@/app/services/models3dApi';
import type { Model3DPin, Model3DNote } from '@/app/services/models3dApi';
import { Loader2, StickyNote, Plus, Trash2, X, Send } from 'lucide-react';

// ── Annotation Point Type (from backend pins) ──
export interface AnnotationPoint {
  id: string;
  label: string;
  description: string;
  position: [number, number, number]; // x, y, z in 3D space
  color?: string;
  pinType?: string;
}

// ── Model Data by topic (procedural fallback) ──
const MODEL_CONFIGS: Record<string, {
  buildModel: (scene: THREE.Scene) => void;
  cameraPos: [number, number, number];
}> = {
  'shoulder-joint-3d': { cameraPos: [4, 3, 5], buildModel: (scene) => buildShoulderModel(scene) },
  'arm-muscles-3d': { cameraPos: [3, 2, 5], buildModel: (scene) => buildArmModel(scene) },
  'heart-3d': { cameraPos: [4, 2, 5], buildModel: (scene) => buildHeartModel(scene) },
};

// ── Default fallback for any model ──
const DEFAULT_CONFIG = {
  cameraPos: [4, 3, 5] as [number, number, number],
  buildModel: (scene: THREE.Scene) => { buildGenericBone(scene); },
};

// ══════════════════════════════════════════════
// ── Model Builders ──
// ══════════════════════════════════════════════

function createBoneMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xf5e6d3,
    roughness: 0.6,
    metalness: 0.05,
    clearcoat: 0.1,
    clearcoatRoughness: 0.4,
  });
}

function createMuscleMaterial(color = 0xcc4444) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.7,
    metalness: 0.02,
    clearcoat: 0.3,
    clearcoatRoughness: 0.6,
  });
}

function createCartillageMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0xb8d4e3,
    roughness: 0.4,
    metalness: 0.0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    transparent: true,
    opacity: 0.85,
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
    cartMat
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
  const scapGeo = new THREE.ExtrudeGeometry(scapShape, { depth: 0.15, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 });
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
  const veinMat = new THREE.MeshPhysicalMaterial({ color: 0x4466cc, roughness: 0.5, metalness: 0.05, clearcoat: 0.3 });

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
interface ModelViewer3DProps {
  modelId: string;
  modelName: string;
}

export function ModelViewer3D({ modelId, modelName }: ModelViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);

  // Backend data
  const [pins, setPins] = useState<Model3DPin[]>([]);
  const [notes, setNotes] = useState<Model3DNote[]>([]);
  const [pinsLoading, setPinsLoading] = useState(true);

  // Derived annotations from backend pins
  const annotations: AnnotationPoint[] = pins.map(pin => ({
    id: pin.id,
    label: pin.label || 'Pin',
    description: pin.description || '',
    position: [pin.geometry.x, pin.geometry.y, pin.geometry.z],
    color: pin.color || '#60a5fa',
    pinType: pin.pin_type,
  }));

  const [annotations2D, setAnnotations2D] = useState<{ id: string; x: number; y: number; visible: boolean; annotation: AnnotationPoint }[]>([]);
  const [activeAnnotation, setActiveAnnotation] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Fetch pins and notes from backend
  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setPinsLoading(true);
      try {
        const [pinsRes, notesRes] = await Promise.allSettled([
          getModel3DPins(modelId),
          getModel3DNotes(modelId),
        ]);
        if (cancelled) return;
        if (pinsRes.status === 'fulfilled') {
          setPins(pinsRes.value?.items || []);
        }
        if (notesRes.status === 'fulfilled') {
          setNotes(notesRes.value?.items || []);
        }
      } catch (err) {
        console.error('[ModelViewer3D] Error fetching data:', err);
      } finally {
        if (!cancelled) setPinsLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [modelId]);

  // Use procedural config if available, otherwise default
  const config = MODEL_CONFIGS[modelId] || DEFAULT_CONFIG;

  const projectAnnotations = useCallback(() => {
    if (!cameraRef.current || !containerRef.current || annotations.length === 0) return;
    const camera = cameraRef.current;
    const rect = containerRef.current.getBoundingClientRect();

    const projected = annotations.map(ann => {
      const vec = new THREE.Vector3(...ann.position);
      vec.project(camera);
      const x = (vec.x * 0.5 + 0.5) * rect.width;
      const y = (-vec.y * 0.5 + 0.5) * rect.height;
      const visible = vec.z < 1;
      return { id: ann.id, x, y, visible, annotation: ann };
    });

    setAnnotations2D(projected);
  }, [annotations]);

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

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
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

    // Build procedural model
    config.buildModel(scene);

    // Animation loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      projectAnnotations();
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

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    };
  }, [modelId, config, projectAnnotations]);

  // Add note
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const created = await createModel3DNote({ model_id: modelId, note: newNote.trim() });
      setNotes(prev => [...prev, created]);
      setNewNote('');
    } catch (err) {
      console.error('[ModelViewer3D] Error adding note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteModel3DNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('[ModelViewer3D] Error deleting note:', err);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Three.js canvas container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay for pins */}
      {pinsLoading && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm text-[10px] text-gray-300">
          <Loader2 size={12} className="animate-spin" />
          Carregando pins...
        </div>
      )}

      {/* Annotation toggle */}
      <button
        onClick={() => setShowAnnotations(!showAnnotations)}
        className={clsx(
          "absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border",
          showAnnotations
            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
            : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
        )}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        {showAnnotations ? 'Ocultar Pontos' : 'Mostrar Pontos'}
        {annotations.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[9px]">{annotations.length}</span>
        )}
      </button>

      {/* Notes toggle */}
      <button
        onClick={() => setShowNotes(!showNotes)}
        className={clsx(
          "absolute top-3 left-[170px] z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all backdrop-blur-sm border",
          showNotes
            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
            : "bg-white/5 text-gray-500 border-white/10 hover:bg-white/10"
        )}
      >
        <StickyNote size={12} />
        Notas
        {notes.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-[9px]">{notes.length}</span>
        )}
      </button>

      {/* Annotation points */}
      {showAnnotations && annotations2D.map(({ id, x, y, visible, annotation }) => (
        visible && (
          <div
            key={id}
            className="absolute z-10 pointer-events-auto"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Ping animation */}
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{
                backgroundColor: annotation.color || '#60a5fa',
                width: 14,
                height: 14,
                left: -7,
                top: -7,
              }}
            />
            {/* Dot */}
            <button
              onClick={() => setActiveAnnotation(activeAnnotation === id ? null : id)}
              className="relative w-3.5 h-3.5 rounded-full border-2 border-white/80 shadow-lg cursor-pointer hover:scale-150 transition-transform"
              style={{ backgroundColor: annotation.color || '#60a5fa' }}
            />

            {/* Tooltip */}
            {activeAnnotation === id && (
              <div
                className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-xl rounded-lg border border-white/15 p-3 min-w-[200px] max-w-[260px] shadow-2xl z-30"
                style={{ borderLeftColor: annotation.color || '#60a5fa', borderLeftWidth: 3 }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: annotation.color || '#60a5fa' }} />
                  <h4 className="text-xs font-bold text-white">{annotation.label}</h4>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed">{annotation.description}</p>
                {annotation.pinType && (
                  <span className="mt-1.5 inline-block text-[8px] text-gray-500 uppercase tracking-wider">{annotation.pinType}</span>
                )}
              </div>
            )}
          </div>
        )
      ))}

      {/* Notes panel */}
      {showNotes && (
        <div className="absolute top-12 right-3 z-20 w-72 max-h-[60vh] bg-black/85 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <StickyNote size={12} className="text-amber-400" />
              Minhas Notas
            </h4>
            <button onClick={() => setShowNotes(false)} className="text-gray-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
            {notes.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <StickyNote size={20} className="mx-auto mb-2 opacity-40" />
                <p className="text-[10px]">Nenhuma nota ainda.</p>
              </div>
            )}
            {notes.map((note) => (
              <div key={note.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <p className="text-[11px] text-gray-300 flex-1 leading-relaxed">{note.note}</p>
                <button
                  onClick={() => handleDeleteNote(note.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all shrink-0"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>

          {/* Add note */}
          <div className="p-2 border-t border-white/10">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                placeholder="Escrever nota..."
                disabled={savingNote}
                className="flex-1 px-2.5 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 disabled:opacity-50"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className={clsx(
                  "flex items-center justify-center px-2 py-1.5 rounded-lg transition-all",
                  !newNote.trim() || savingNote
                    ? "bg-white/5 text-gray-600 cursor-not-allowed"
                    : "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                )}
              >
                {savingNote ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Model name watermark */}
      <div className="absolute bottom-3 left-3 z-10">
        <p className="text-[9px] text-gray-600 font-medium uppercase tracking-widest">{modelName}</p>
      </div>
    </div>
  );
}
