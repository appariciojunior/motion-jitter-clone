import * as THREE from 'three';

// Scale a loaded model to a target world size and centre it on the origin by
// its bounding-box centre. Deterministic baseline; fine-alignment is left to
// the Model Control Offset X/Y (some assets have an off-centre visual mass).
// Returns half the fitted size (for camera framing).
export function fitAndCenter(model: THREE.Object3D, targetSize: number): number {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(...box.getSize(new THREE.Vector3()).toArray()) || 1;
  const s = targetSize / maxDim;
  model.scale.setScalar(s);
  model.position.copy(center).multiplyScalar(-s);   // bbox centre → origin
  return targetSize / 2;
}
