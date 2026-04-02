// ============================================================
// Axon — StudentNotes3D
//
// Student personal notes with optional 3D positioning.
// - "Agregar nota" button → click model → raycast → input at position
// - Notes without position appear in a sidebar list
// - Notes with position show as small markers in 3D
// - CRUD via model-3d-notes API (scopeToUser)
//
// PERFORMANCE (Paso 1★):
//   - Overlay positions updated imperatively via DOM refs (no setState per frame)
//   - Reuses module-level _tempVec3 to avoid GC pressure
//   - Registers projection callback via registerFrameCallback (no DOM hacking)
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import {
  StickyNote, Trash2, X, Send, Loader2, MapPin, Pencil, Check,
} from 'lucide-react';
import clsx from 'clsx';
import { useNoteData } from '@/app/hooks/useNoteData';

// ── Reusable temp object (module-level, zero GC pressure) ──
const _tempVec3 = new THREE.Vector3();

interface StudentNotes3DProps {
  modelId: string;
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  modelMeshes: THREE.Object3D[];
  /** Register a callback to be called every animation frame (from ModelViewer3D) */
  registerFrameCallback: (cb: () => void) => () => void;
}

// Small sphere material for spatial notes
const NOTE_MARKER_COLOR = 0xfbbf24; // amber
const NOTE_MARKER_RADIUS = 0.06;

// ── Shared geometry singleton (same pattern as PinMarker3D) ──
// All note markers use identical sphere geometry.
// Created once on first use, shared across all markers.
// Never disposed — lifetime = app lifetime (negligible memory).
let _sharedNoteGeo: THREE.SphereGeometry | null = null;
function getSharedNoteGeo(): THREE.SphereGeometry {
  if (!_sharedNoteGeo) {
    _sharedNoteGeo = new THREE.SphereGeometry(NOTE_MARKER_RADIUS, 12, 12);
  }
  return _sharedNoteGeo;
}

export function StudentNotes3D({ modelId, scene, camera, containerRef, modelMeshes, registerFrameCallback }: StudentNotes3DProps) {
  // M5 audit: note data layer extracted to shared hook
  const { notes, loading, addNote, editNote, deleteNote } = useNoteData(modelId);

  const [showPanel, setShowPanel] = useState(false);
  const [showMarkers, setShowMarkers] = useState(true);

  // Add note state (placement is 3D-specific, stays here)
  const [isPlacing, setIsPlacing] = useState(false);
  const [placementPoint, setPlacementPoint] = useState<THREE.Vector3 | null>(null);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // 3D marker meshes
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());

  // ── Imperative overlay positioning (PERFORMANCE: no setState per frame) ──
  const noteOverlayRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Sync spatial note markers to scene ──
  useEffect(() => {
    if (!scene || !showMarkers) return;

    const markers = markersRef.current;

    // Remove old markers
    markers.forEach((mesh, id) => {
      if (!notes.find(n => n.id === id && n.geometry)) {
        scene.remove(mesh);
        // Dispose material only — geometry is shared static, never disposed per-marker
        (mesh.material as THREE.Material).dispose();
        markers.delete(id);
      }
    });

    // Add/update markers
    notes.forEach(note => {
      if (!note.geometry) return;
      if (markers.has(note.id)) return;

      const mat = new THREE.MeshStandardMaterial({
        color: NOTE_MARKER_COLOR,
        emissive: NOTE_MARKER_COLOR,
        emissiveIntensity: 0.3,
        roughness: 0.4,
      });
      const mesh = new THREE.Mesh(getSharedNoteGeo(), mat);
      mesh.position.set(note.geometry.x, note.geometry.y, note.geometry.z);
      mesh.userData = { noteId: note.id, isNoteMarker: true };
      scene.add(mesh);
      markers.set(note.id, mesh);
    });

    return () => {
      markers.forEach((mesh) => {
        scene.remove(mesh);
        // Dispose material only — geometry is shared static, never disposed per-marker
        (mesh.material as THREE.Material).dispose();
      });
      markers.clear();
    };
  }, [scene, notes, showMarkers]);

  // ── Project spatial notes to 2D (imperatively via DOM refs) ──
  // PERFORMANCE: No setState here. Positions updated via style.transform directly.
  const projectNotes = useCallback(() => {
    if (!camera || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    notes.forEach(note => {
      if (!note.geometry) return;

      _tempVec3.set(note.geometry.x, note.geometry.y, note.geometry.z);
      _tempVec3.project(camera);

      const x = (_tempVec3.x * 0.5 + 0.5) * rect.width;
      const y = (-_tempVec3.y * 0.5 + 0.5) * rect.height;
      const visible = _tempVec3.z < 1;

      const el = noteOverlayRefs.current.get(note.id);
      if (el) {
        el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        el.style.display = visible ? '' : 'none';
      }
    });
  }, [camera, containerRef, notes]);

  // ── Register projectNotes with parent animation loop ──
  useEffect(() => {
    return registerFrameCallback(projectNotes);
  }, [registerFrameCallback, projectNotes]);

  // ── Click handler for placing spatial notes ──
  const handlePlacementClick = useCallback((e: MouseEvent) => {
    if (!isPlacing || !camera || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );

    raycasterRef.current.setFromCamera(ndc, camera);
    const hits = raycasterRef.current.intersectObjects(modelMeshes, true);

    if (hits.length > 0) {
      setPlacementPoint(hits[0].point.clone());
      setIsPlacing(false);
    }
  }, [isPlacing, camera, containerRef, modelMeshes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isPlacing) return;

    el.addEventListener('click', handlePlacementClick);
    el.style.cursor = 'crosshair';

    return () => {
      el.removeEventListener('click', handlePlacementClick);
      el.style.cursor = '';
    };
  }, [isPlacing, handlePlacementClick, containerRef]);

  // ── Add note ──
  const handleAddNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setSaving(true);
    const geometry = placementPoint
      ? {
          x: parseFloat(placementPoint.x.toFixed(4)),
          y: parseFloat(placementPoint.y.toFixed(4)),
          z: parseFloat(placementPoint.z.toFixed(4)),
        }
      : undefined;
    const result = await addNote({ note: newNote.trim(), geometry });
    if (result) {
      setNewNote('');
      setPlacementPoint(null);
    }
    setSaving(false);
  }, [newNote, placementPoint, addNote]);

  // ── Delete note ──
  const handleDeleteNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId);
  }, [deleteNote]);

  // ── Edit note ──
  const handleEditNote = useCallback(async (noteId: string) => {
    if (!editNoteText.trim()) return;
    const success = await editNote(noteId, editNoteText.trim());
    if (success) {
      setEditingNoteId(null);
      setEditNoteText('');
    }
    // On failure: user stays in edit mode with their text preserved
  }, [editNoteText, editNote]);

  const spatialNotes = notes.filter(n => n.geometry);
  const textOnlyNotes = notes.filter(n => !n.geometry);

  // ── Ref callback for note overlay divs ──
  const setNoteOverlayRef = useCallback((noteId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      noteOverlayRefs.current.set(noteId, el);
    } else {
      noteOverlayRefs.current.delete(noteId);
    }
  }, []);

  return (
    <>
      {/* ── Toggle button ── */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className={clsx(
          'absolute top-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
          showPanel
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            : 'bg-white/5 text-gray-500 border-white/10 hover:bg-white/10',
        )}
        style={{ left: 170 }}
      >
        <StickyNote size={12} />
        Mis Notas
        {notes.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/30 text-[9px]">{notes.length}</span>
        )}
      </button>

      {/* ── Spatial note markers (small amber labels) — imperative positioning ── */}
      {showMarkers && spatialNotes.map(note => (
        <div
          key={note.id}
          ref={setNoteOverlayRef(note.id)}
          className="absolute left-0 top-0 z-10 pointer-events-none"
          style={{ display: 'none' /* initial hidden, projectNotes will show */ }}
        >
          <div className="pointer-events-auto px-2 py-1 rounded-md bg-amber-500/20 text-[8px] text-amber-300 border border-amber-500/20 max-w-[140px] truncate cursor-default">
            {note.note}
          </div>
        </div>
      ))}

      {/* ── Notes panel ── */}
      {showPanel && (
        <div className="absolute top-12 right-3 z-20 w-72 max-h-[65vh] bg-zinc-900 rounded-xl border border-white/10 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <StickyNote size={12} className="text-amber-400" />
              Mis Notas ({notes.length})
            </h4>
            <div className="flex items-center gap-1">
              {/* Toggle spatial markers */}
              <button
                onClick={() => setShowMarkers(!showMarkers)}
                className={clsx(
                  'p-1 rounded transition-colors',
                  showMarkers ? 'text-amber-400' : 'text-gray-600',
                )}
                title={showMarkers ? 'Ocultar marcadores' : 'Mostrar marcadores'}
              >
                <MapPin size={12} />
              </button>
              <button onClick={() => setShowPanel(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 size={16} className="animate-spin text-gray-500" />
            </div>
          )}

          {/* Notes list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {!loading && notes.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <StickyNote size={20} className="mx-auto mb-2 opacity-40" />
                <p className="text-[10px]">Sin notas aun.</p>
                <p className="text-[9px] text-gray-600 mt-1">Escribe una nota o coloca una en el modelo.</p>
              </div>
            )}

            {notes.map(note => (
              <div key={note.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <span className={clsx(
                  'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                  note.geometry ? 'bg-amber-400' : 'bg-gray-500',
                )} />

                {editingNoteId === note.id ? (
                  // ── Edit mode ──
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editNoteText}
                      onChange={(e) => setEditNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditNote(note.id);
                        if (e.key === 'Escape') { setEditingNoteId(null); setEditNoteText(''); }
                      }}
                      autoFocus
                      className="flex-1 px-2 py-1 text-[11px] bg-white/5 border border-amber-500/30 rounded text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30"
                    />
                    <button
                      onClick={() => handleEditNote(note.id)}
                      disabled={!editNoteText.trim()}
                      className="p-0.5 text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-30"
                    >
                      <Check size={11} />
                    </button>
                    <button
                      onClick={() => { setEditingNoteId(null); setEditNoteText(''); }}
                      className="p-0.5 text-gray-500 hover:text-white transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  // ── View mode ──
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-300 leading-relaxed break-words">{note.note}</p>
                      {note.geometry && (
                        <span className="text-[8px] text-amber-600 mt-0.5 inline-block">
                          <MapPin size={8} className="inline mr-0.5" />
                          Espacial
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => { setEditingNoteId(note.id); setEditNoteText(note.note); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-amber-400 transition-all shrink-0"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Placement mode indicator */}
          {isPlacing && (
            <div className="px-3 py-2 border-t border-amber-500/20 bg-amber-500/10">
              <div className="flex items-center gap-2">
                <MapPin size={12} className="text-amber-400 animate-pulse" />
                <p className="text-[10px] text-amber-300">Click en el modelo para posicionar la nota</p>
                <button
                  onClick={() => setIsPlacing(false)}
                  className="ml-auto text-[9px] text-amber-400 hover:text-amber-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Placement point preview */}
          {placementPoint && (
            <div className="px-3 py-1.5 border-t border-white/5">
              <div className="flex items-center gap-2">
                <MapPin size={10} className="text-amber-400" />
                <span className="text-[9px] text-amber-400 font-mono">
                  ({placementPoint.x.toFixed(2)}, {placementPoint.y.toFixed(2)}, {placementPoint.z.toFixed(2)})
                </span>
                <button
                  onClick={() => setPlacementPoint(null)}
                  className="ml-auto text-gray-500 hover:text-white"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Add note input */}
          <div className="p-2 border-t border-white/10">
            <div className="flex gap-1.5 mb-1.5">
              <button
                onClick={() => { setIsPlacing(!isPlacing); setPlacementPoint(null); }}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-medium transition-all border',
                  isPlacing
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : 'bg-white/5 text-gray-500 border-white/10 hover:text-white',
                )}
                title="Colocar nota en el modelo"
              >
                <MapPin size={10} />
                {isPlacing ? 'Colocando...' : 'Espacial'}
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                placeholder={placementPoint ? 'Nota para este punto...' : 'Escribir nota...'}
                disabled={saving}
                className="flex-1 px-2.5 py-1.5 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/30 disabled:opacity-50"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || saving}
                className={clsx(
                  'flex items-center justify-center px-2 py-1.5 rounded-lg transition-all',
                  !newNote.trim() || saving
                    ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                    : 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
                )}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}