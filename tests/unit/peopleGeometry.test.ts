import { describe, expect, it } from 'vitest';
import * as T from 'three';
import { bindFigure, figureGeometry, JOINTS } from '../../src/render/figureRig';
import { peoplePoses, serviceRoute } from '../../src/render/peoplePoses';
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
      expect(g.boundingBox!.max.x - g.boundingBox!.min.x).toBeLessThan(0.72);
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
  it('keeps six grounded lobby intents without mutating a save', () => {
    const state = initialHotel();
    state.rooms[0]!.status = 'CLEANING';
    state.rooms[1]!.status = 'RESERVED';
    const before = JSON.stringify(state),
      poses = peoplePoses(state, 10);
    expect(poses).toHaveLength(6);
    expect(poses[3]!.action).toBe('wait');
    expect(poses[4]!.action).toBe('wait');
    expect(poses[3]!.y).toBe(0.25);
    expect(JSON.stringify(state)).toBe(before);
    state.rooms[0]!.status = 'AVAILABLE';
    state.rooms[1]!.status = 'LOCKED';
    expect(peoplePoses(state, 10)[3]!.action).toBe('wait');
  });
  it('keeps the service route continuous, grounded and clear of the reception counter', () => {
    let previous = serviceRoute(0);
    let walking = 0,
      waiting = 0;
    for (let t = 0.05; t < 150; t += 0.05) {
      const p = serviceRoute(t);
      expect(Math.hypot(p.x - previous.x, p.z - previous.z)).toBeLessThan(
        0.055,
      );
      expect(p.y).toBe(0.25);
      expect(p.x > -2.1 && p.x < 1.8 && p.z < 0.2).toBe(false);
      expect(p.distance!).toBeGreaterThanOrEqual(previous.distance! - 0.00001);
      if (p.action === 'walk') walking++;
      else {
        waiting++;
        expect(p.speed).toBe(0);
      }
      previous = p;
    }
    expect(walking).toBeGreaterThan(100);
    expect(waiting).toBeGreaterThan(100);
  });
});
