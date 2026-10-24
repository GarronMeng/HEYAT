import type { HotelState, Room } from '../core/model';
import { peoplePoses, serviceRoute, type PersonPose } from './peoplePoses';
import type { Action } from './peoplePoses';

type Point = readonly [number, number, number];
interface Stop {
  at: Point;
  hold?: number;
  action?: Action;
}
interface Journey {
  stops: Stop[];
  step: number;
  hold: number;
}
const HOME: Record<number, Point> = {
  3: [4.5, 0.25, -0.45],
  4: [-0.85, 0.25, 0.7],
};
export const LIFT = { x: 6.35, z: 1.45 };
export const MAX_VISUAL_DELTA = 0.1;
export const WALK_SPEED = 0.95;

function itinerary(room: Room, actor: number): Stop[] {
  const home = HOME[actor]!;
  const y = 2.64 + (room.floor - 1) * 2.25;
  const x = -4.05 + room.slot * 2.7 + 0.65;
  const path: Point[] = [
    home,
    [home[0], 0.25, 2.65],
    [LIFT.x, 0.25, 2.65],
    [LIFT.x, 0.25, LIFT.z],
    [LIFT.x, y, LIFT.z],
    [LIFT.x, y, 2.05],
    [x, y, 2.05],
    [x, y, 1.5],
  ];
  return [
    ...path.slice(1).map((at) => ({ at })),
    {
      at: path[path.length - 1]!,
      hold: actor === 3 ? 3 : 2,
      action: actor === 3 ? 'clean' : 'wait',
    },
    ...path
      .slice(0, -1)
      .reverse()
      .map((at) => ({ at })),
    { at: home, hold: 1, action: 'wait' },
  ];
}

/** Six persistent representatives; this observer never changes business state. */
export class PeopleMotion {
  private poses: PersonPose[];
  private journeys = new Map<number, Journey>();
  private seen = new Set<string>();
  private lastSimulation: number;
  private clock = 0;
  private samples: { at: number; poses: PersonPose[] }[] = [];
  private nextSample = 0;
  private maxStep = 0;
  private frames = 0;

  constructor(state: HotelState) {
    this.poses = peoplePoses(state, 0);
    this.lastSimulation = state.time;
  }
  get time() {
    return this.clock;
  }
  update(state: HotelState, realSeconds: number, active = true): PersonPose[] {
    if (state.time < this.lastSimulation) this.seen.clear();
    this.lastSimulation = state.time;
    const dt = active
      ? Math.min(MAX_VISUAL_DELTA, Math.max(0, realSeconds))
      : 0;
    // Freeze transforms, footfall and gestures together, including mid-stride.
    if (!dt) return this.snapshot();
    this.clock += dt;
    const lobby = peoplePoses(state, this.clock);
    for (const i of [0, 1]) this.poses[i]!.action = lobby[i]!.action;
    const porter = serviceRoute(this.clock);
    this.move(2, [porter.x, porter.y, porter.z], dt, porter.action);
    const waiting = lobby[5]!;
    this.move(5, [waiting.x, waiting.y, waiting.z], dt, 'wait');

    for (const i of [3, 4]) {
      let journey = this.journeys.get(i);
      if (!journey) {
        const room = state.rooms.find(
          (r) =>
            (i === 3
              ? r.status === 'CLEANING'
              : r.status === 'RESERVED' || r.status === 'OCCUPIED') &&
            !this.seen.has(this.taskKey(r, i)),
        );
        if (room) {
          this.seen.add(this.taskKey(room, i));
          if (this.seen.size > 128)
            this.seen.delete(this.seen.values().next().value!);
          journey = { stops: itinerary(room, i), step: 0, hold: 0 };
          this.journeys.set(i, journey);
        }
      }
      if (!journey) {
        this.poses[i]!.action = 'wait';
        this.poses[i]!.speed = 0;
        continue;
      }
      const stop = journey.stops[journey.step]!;
      const arrived = this.move(i, stop.at, dt, stop.action ?? 'wait');
      if (arrived) {
        journey.hold += dt;
        this.poses[i]!.action = stop.action ?? 'wait';
        this.poses[i]!.speed = 0;
        if (journey.hold >= (stop.hold ?? 0)) {
          journey.step++;
          journey.hold = 0;
          if (journey.step >= journey.stops.length) this.journeys.delete(i);
        }
      }
    }
    this.frames++;
    if (this.clock >= this.nextSample) {
      this.samples.push({ at: this.clock, poses: this.snapshot() });
      this.samples = this.samples.slice(-120);
      this.nextSample = this.clock + 0.5;
    }
    return this.snapshot();
  }
  private taskKey(room: Room, actor: number) {
    return actor === 3
      ? `clean:${room.id}:${room.changedAt}`
      : `guest:${room.order?.id}`;
  }
  private move(actor: number, to: Point, dt: number, resting: Action) {
    const p = this.poses[actor]!;
    const dx = to[0] - p.x,
      dy = to[1] - p.y,
      dz = to[2] - p.z;
    const distance = Math.hypot(dx, dy, dz);
    const step = Math.min(distance, WALK_SPEED * dt);
    p.riding = Math.abs(dy) > 0.000001;
    if (step > 0.0000001) {
      p.x += (dx / distance) * step;
      p.y += (dy / distance) * step;
      p.z += (dz / distance) * step;
      if (Math.hypot(dx, dz) > 0.000001) {
        const target = Math.atan2(dx, dz);
        const turn = Math.atan2(
          Math.sin(target - p.facing),
          Math.cos(target - p.facing),
        );
        p.facing += Math.max(-dt * 4, Math.min(dt * 4, turn));
      }
      p.distance = (p.distance ?? 0) + (p.riding ? 0 : step);
      p.speed = p.riding ? 0 : step / dt;
      p.action = p.riding ? 'wait' : 'walk';
      this.maxStep = Math.max(this.maxStep, step);
    } else {
      p.speed = 0;
      p.action = resting;
    }
    return distance - step < 0.000001;
  }
  private snapshot() {
    return this.poses.map((p) => ({ ...p }));
  }
  report() {
    return {
      clock: this.clock,
      frames: this.frames,
      maxStep: this.maxStep,
      maxAllowedStep: WALK_SPEED * MAX_VISUAL_DELTA,
      pool: 6,
      activeJourneys: this.journeys.size,
      history: this.seen.size,
      poses: this.snapshot(),
      samples: structuredClone(this.samples),
    };
  }
}
