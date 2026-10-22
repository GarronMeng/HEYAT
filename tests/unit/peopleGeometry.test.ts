import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { bindFigure, figureGeometry, JOINTS } from '../../src/render/figureRig';
import { peoplePoses } from '../../src/render/peoplePoses';
import { initialHotel } from '../../src/core/model';

describe('representative hotel people', () => {
  it('binds every role to valid joints with normalized weights and grounded proportions', () => {
    const material = new T.MeshLambertMaterial({ vertexColors: true });
    for (const role of [
      'reception',
      'porter',
      'housekeeping',
      'guest',
    ] as const) {
      const g = figureGeometry(role),
        rig = bindFigure(g, material);
      g.computeBoundingBox();
      expect(g.boundingBox!.min.y).toBeGreaterThanOrEqual(0);
      expect(g.boundingBox!.max.y).toBeGreaterThan(1.19);
      expect(g.boundingBox!.max.y).toBeLessThan(1.3);
      expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThan(0.38);
      const indices = g.getAttribute('skinIndex'),
        weights = g.getAttribute('skinWeight');
      for (let i = 0; i < indices.count; i++) {
        expect(indices.getX(i)).toBeLessThan(JOINTS.length);
        expect(
          weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i),
        ).toBe(1);
      }
      rig.bones[5]!.rotation.x = -0.7;
      rig.mesh.updateMatrixWorld(true);
      rig.mesh.skeleton.update();
      expect(
        rig.mesh
          .applyBoneTransform(0, new T.Vector3())
          .toArray()
          .every(Number.isFinite),
      ).toBe(true);
      rig.mesh.skeleton.dispose();
      g.dispose();
    }
    material.dispose();
  });
  it('bounds visible people at six and reads cleaning/reservation without mutating a save', () => {
    const state = initialHotel();
    state.rooms[0]!.status = 'CLEANING';
    state.rooms[1]!.status = 'RESERVED';
    const before = JSON.stringify(state),
      poses = peoplePoses(state, 10);
    expect(poses).toHaveLength(6);
    expect(poses[3]!.action).toBe('clean');
    expect(poses[4]!.action).toBe('walk');
    expect(poses[3]!.y).toBe(2.64);
    expect(JSON.stringify(state)).toBe(before);
    state.rooms[0]!.status = 'AVAILABLE';
    state.rooms[1]!.status = 'LOCKED';
    expect(peoplePoses(state, 10)[3]!.action).toBe('idle');
  });
});
