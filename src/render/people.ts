import * as T from 'three';
import type { HotelState } from '../core/model';
import { bindFigure, figureGeometry, type Role } from './figureRig';
import { animateFigure } from './peopleAnimation';
import { peoplePoses } from './peoplePoses';

function createDistantSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#28394d';
  ctx.fillRect(19, 46, 26, 48);
  ctx.fillRect(20, 92, 9, 30);
  ctx.fillRect(35, 92, 9, 30);
  ctx.fillRect(12, 50, 7, 41);
  ctx.fillRect(45, 50, 7, 41);
  ctx.fillStyle = '#cfaa87';
  ctx.beginPath();
  ctx.ellipse(32, 30, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#332b2b';
  ctx.fillRect(20, 16, 24, 8);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  return {
    texture,
    material: new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  };
}

export function createPeople() {
  const group = new T.Group();
  const roles: Role[] = [
    'reception',
    'reception',
    'porter',
    'housekeeping',
    'guest',
    'guest',
  ];
  const variants = [0, 1, 0, 0, 0, 1];
  const geometry = new Map(
    roles.map((role, i) => [
      `${role}:${variants[i]}`,
      figureGeometry(role, variants[i]),
    ]),
  );
  const material = new T.MeshLambertMaterial({ vertexColors: true });
  const sprite = createDistantSprite();
  const actors = roles.map((role, i) => {
    const lod = new T.LOD();
    const rig = bindFigure(geometry.get(`${role}:${variants[i]}`)!, material);
    lod.addLevel(rig.mesh, 0);
    // Reuse the same coloured silhouette for a readable unanimated middle LOD.
    lod.addLevel(
      new T.Mesh(geometry.get(`${role}:${variants[i]}`)!, material),
      32,
    );
    const far = new T.Sprite(sprite.material);
    far.position.y = 0.6;
    far.scale.set(0.43, 1.22, 1);
    lod.addLevel(far, 46);
    group.add(lod);
    return { lod, ...rig };
  });
  return {
    group,
    dispose() {
      actors.forEach((actor) => actor.mesh.skeleton.dispose());
      geometry.forEach((g) => g.dispose());
      material.dispose();
      sprite.texture.dispose();
      sprite.material.dispose();
    },
    update(state: HotelState, time: number) {
      const poses = peoplePoses(state, time);
      actors.forEach((actor, i) => {
        const pose = poses[i]!;
        actor.lod.position.set(pose.x, pose.y, pose.z);
        actor.lod.rotation.y = pose.facing;
        actor.lod.scale.setScalar([1, 0.96, 1.04, 0.96, 1.02, 0.96][i]!);
        animateFigure(actor.bones, pose, time, i);
        // Orthographic zoom changes apparent size without changing camera distance.
        // Renderer sets this world-units-per-pixel hint rather than relying only on distance.
        const simplified = group.userData.simple === true;
        actor.lod.levels[1]!.distance = simplified ? 0 : 32;
        actor.lod.levels[0]!.distance = 0;
      });
    },
  };
}
