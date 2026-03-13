// ============================================================
// Axon — LinePinMarker & AreaPinMarker (3D geometry markers)
//
// Implements pin_type 'line' and 'area' that were defined in
// the DB CHECK constraint but never implemented in the UI.
//
// Line: Two points connected by a line with distance label.
//   - Stored as geometry (point A) + normal (point B) — repurposes
//     the existing normal field as second endpoint.
//   - Renders: line segment + spheres at endpoints + distance text
//
// Area: N-point polygon on model surface.
//   - Stored as geometry (centroid) + description (JSON of vertices)
//   - Renders: polygon mesh + outline + area text
//
// These are managed alongside point pins in PinMarkerManager.
// ============================================================

import * as THREE from 'three';

// ── Shared geometries ──
let _sphereGeoSmall: THREE.SphereGeometry | null = null;
function getSmallSphere(): THREE.SphereGeometry {
  if (!_sphereGeoSmall) _sphereGeoSmall = new THREE.SphereGeometry(0.04, 8, 8);
  return _sphereGeoSmall;
}

// ── Line Pin ──

export interface LinePinData {
  id: string;
  pointA: THREE.Vector3;
  pointB: THREE.Vector3;
  color: string;
  label?: string;
}

/**
 * Create a line pin visualization: two spheres + connecting line + distance label
 */
export function createLinePinGroup(data: LinePinData): THREE.Group {
  const group = new THREE.Group();
  group.userData = { pinId: data.id, isPinMarker: true, pinType: 'line' };

  const colorHex = parseInt(data.color.replace('#', ''), 16) || 0xa78bfa;
  const mat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: 0x000000,
    roughness: 0.3,
    metalness: 0.2,
  });

  // Endpoint spheres
  const sphereA = new THREE.Mesh(getSmallSphere(), mat.clone());
  sphereA.position.copy(data.pointA);
  sphereA.userData = { pinId: data.id, isPinMarker: true };
  group.add(sphereA);

  const sphereB = new THREE.Mesh(getSmallSphere(), mat.clone());
  sphereB.position.copy(data.pointB);
  sphereB.userData = { pinId: data.id, isPinMarker: true };
  group.add(sphereB);

  // Line segment
  const lineGeo = new THREE.BufferGeometry().setFromPoints([data.pointA, data.pointB]);
  const lineMat = new THREE.LineBasicMaterial({
    color: colorHex,
    linewidth: 2,
    transparent: true,
    opacity: 0.8,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  group.add(line);

  // Midpoint marker (for label positioning)
  const midpoint = new THREE.Vector3().lerpVectors(data.pointA, data.pointB, 0.5);
  const midSphere = new THREE.Mesh(getSmallSphere(), mat.clone());
  midSphere.position.copy(midpoint);
  midSphere.scale.setScalar(0.5);
  midSphere.userData = { pinId: data.id, isPinMarker: true, isMidpoint: true };
  group.add(midSphere);

  return group;
}

/**
 * Calculate distance between two points in model units
 */
export function calculateDistance(a: THREE.Vector3, b: THREE.Vector3): number {
  return a.distanceTo(b);
}

/**
 * Format distance for display
 */
export function formatDistance(dist: number): string {
  if (dist < 0.01) return `${(dist * 1000).toFixed(1)} mm`;
  if (dist < 1) return `${(dist * 100).toFixed(1)} cm`;
  return `${dist.toFixed(2)} u`;
}

// ── Area Pin ──

export interface AreaPinData {
  id: string;
  vertices: THREE.Vector3[];
  centroid: THREE.Vector3;
  color: string;
  label?: string;
}

/**
 * Create an area pin visualization: polygon mesh + outline
 */
export function createAreaPinGroup(data: AreaPinData): THREE.Group {
  const group = new THREE.Group();
  group.userData = { pinId: data.id, isPinMarker: true, pinType: 'area' };

  if (data.vertices.length < 3) return group;

  const colorHex = parseInt(data.color.replace('#', ''), 16) || 0x34d399;

  // Create polygon from vertices using triangulation
  // Simple fan triangulation from centroid
  const positions: number[] = [];
  const centroid = data.centroid;

  for (let i = 0; i < data.vertices.length; i++) {
    const a = data.vertices[i];
    const b = data.vertices[(i + 1) % data.vertices.length];

    positions.push(centroid.x, centroid.y, centroid.z);
    positions.push(a.x, a.y, a.z);
    positions.push(b.x, b.y, b.z);
  }

  const polyGeo = new THREE.BufferGeometry();
  polyGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  polyGeo.computeVertexNormals();

  const polyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const polyMesh = new THREE.Mesh(polyGeo, polyMat);
  polyMesh.userData = { pinId: data.id, isPinMarker: true };
  polyMesh.renderOrder = 1;
  group.add(polyMesh);

  // Outline
  const outlinePoints = [...data.vertices, data.vertices[0]]; // close the loop
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePoints);
  const outlineMat = new THREE.LineBasicMaterial({
    color: colorHex,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
  });
  const outline = new THREE.Line(outlineGeo, outlineMat);
  group.add(outline);

  // Vertex markers
  const sphereMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.3,
    metalness: 0.2,
  });
  data.vertices.forEach((v, i) => {
    const sphere = new THREE.Mesh(getSmallSphere(), sphereMat.clone());
    sphere.position.copy(v);
    sphere.userData = { pinId: data.id, isPinMarker: true, vertexIndex: i };
    group.add(sphere);
  });

  // Centroid marker
  const centroidSphere = new THREE.Mesh(getSmallSphere(), sphereMat.clone());
  centroidSphere.position.copy(centroid);
  centroidSphere.scale.setScalar(1.5);
  centroidSphere.userData = { pinId: data.id, isPinMarker: true, isCentroid: true };
  group.add(centroidSphere);

  return group;
}

/**
 * Calculate area of a 3D polygon (using cross product method)
 */
export function calculateArea(vertices: THREE.Vector3[]): number {
  if (vertices.length < 3) return 0;

  const n = vertices.length;
  const normal = new THREE.Vector3();

  // Newell's method for 3D polygon normal + area
  for (let i = 0; i < n; i++) {
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];

    normal.x += (curr.y - next.y) * (curr.z + next.z);
    normal.y += (curr.z - next.z) * (curr.x + next.x);
    normal.z += (curr.x - next.x) * (curr.y + next.y);
  }

  return normal.length() / 2;
}

/**
 * Format area for display
 */
export function formatArea(area: number): string {
  if (area < 0.0001) return `${(area * 1000000).toFixed(1)} mm2`;
  if (area < 1) return `${(area * 10000).toFixed(1)} cm2`;
  return `${area.toFixed(3)} u2`;
}