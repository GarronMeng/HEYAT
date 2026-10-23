import type { HotelState } from '../core/model';
export type Action = 'idle' | 'walk' | 'reception' | 'clean' | 'greet' | 'wait';
export interface PersonPose {
  x: number;
  y: number;
  z: number;
  facing: number;
  action: Action;
  /** Metres travelled drive footfall; speed drives stride, never a free-running walk. */
  distance?: number;
  speed?: number;
}
type Stop = readonly [x: number, z: number, hold: number];
// Open lobby aisle: stay in front of the desk, then round its right end to the lift.
export const PORTER_ROUTE: readonly Stop[] = [
  [-3.9, 3.05, 3],
  [-1.4, 2.5, 1],
  [2.65, 2.5, 2],
  [3.15, 0.6, 1],
  [3.8, -1.2, 4],
  [3.15, 0.6, 0],
  [2.65, 2.5, 0],
  [-1.4, 2.5, 0],
];
const angle = (x: number, z: number) => Math.atan2(x, z);
/** Closed waypoint route, eased starts/stops and turns during the stationary hold. */
export function serviceRoute(time: number): PersonPose {
  const speed = 0.65;
  const durations = PORTER_ROUTE.map((a, i) => {
    const b = PORTER_ROUTE[(i + 1) % PORTER_ROUTE.length]!;
    return Math.hypot(b[0] - a[0], b[1] - a[1]) / speed + a[2];
  });
  const total = durations.reduce((a, b) => a + b, 0);
  const cycles = Math.floor(Math.max(0, time) / total);
  let t = Math.max(0, time) % total;
  let travelled =
    cycles *
    PORTER_ROUTE.reduce((d, a, i) => {
      const b = PORTER_ROUTE[(i + 1) % PORTER_ROUTE.length]!;
      return d + Math.hypot(b[0] - a[0], b[1] - a[1]);
    }, 0);
  for (let i = 0; i < PORTER_ROUTE.length; i++) {
    const a = PORTER_ROUTE[i]!,
      b = PORTER_ROUTE[(i + 1) % PORTER_ROUTE.length]!;
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (t <= durations[i]!) {
      const facing = angle(b[0] - a[0], b[1] - a[1]);
      if (t < a[2]) {
        const prev =
          PORTER_ROUTE[(i + PORTER_ROUTE.length - 1) % PORTER_ROUTE.length]!;
        const incoming = angle(a[0] - prev[0], a[1] - prev[1]);
        const delta = Math.atan2(
          Math.sin(facing - incoming),
          Math.cos(facing - incoming),
        );
        return {
          x: a[0],
          y: 0.25,
          z: a[1],
          facing: incoming + delta * Math.min(1, t / 0.7),
          action: 'greet',
          speed: 0,
          distance: travelled,
        };
      }
      const u = (t - a[2]) / (length / speed);
      const eased = u * u * (3 - 2 * u);
      return {
        x: a[0] + (b[0] - a[0]) * eased,
        y: 0.25,
        z: a[1] + (b[1] - a[1]) * eased,
        facing,
        action: 'walk',
        distance: travelled + length * eased,
        speed: speed * 6 * u * (1 - u),
      };
    }
    t -= durations[i]!;
    travelled += length;
  }
  throw new Error('Unreachable service route');
}
/** Six read-only representatives, not extra orders or an independent population simulator. */
export function peoplePoses(state: HotelState, time: number): PersonPose[] {
  const cleaner = state.rooms.find((r) => r.status === 'CLEANING');
  const reserved = state.rooms.find((r) => r.status === 'RESERVED');
  const occupied = state.rooms.find((r) => r.status === 'OCCUPIED');
  const roomPose = (
    room: NonNullable<typeof occupied>,
    action: Action,
  ): PersonPose => ({
    x: -4.05 + room.slot * 2.7 + 0.65,
    y: 2.64 + (room.floor - 1) * 2.25,
    z: 1.5,
    facing: -0.45,
    action,
  });
  // Floor handoff is a cut to the room doorway; no flying through ceilings.
  const guest =
    occupied && !reserved
      ? roomPose(occupied, 'wait')
      : { x: -0.85, y: 0.25, z: 0.7, facing: Math.PI, action: 'wait' as const };
  if (occupied && !reserved) {
    const elapsed = Math.max(0, state.time - occupied.changedAt);
    const distance = Math.min(0.45, elapsed * 0.3);
    guest.z = 1.95 - distance;
    guest.facing = Math.PI;
    guest.distance = distance;
    guest.speed = distance < 0.45 ? 0.3 : 0;
    guest.action = distance < 0.45 ? 'walk' : 'wait';
  }
  return [
    {
      x: -0.8,
      y: 0.25,
      z: -1.08,
      facing: 0,
      action: reserved || state.queue.length ? 'reception' : 'idle',
    },
    {
      x: 0.7,
      y: 0.25,
      z: -1.08,
      facing: -0.15,
      action: reserved ? 'greet' : 'reception',
    },
    serviceRoute(time),
    cleaner
      ? roomPose(cleaner, 'clean')
      : { x: 4.5, y: 0.25, z: -0.45, facing: -0.7, action: 'idle' },
    guest,
    {
      x: state.queue.length > 1 ? -0.3 : 1.75,
      y: 0.25,
      z: state.queue.length > 1 ? 1.7 : 0.85,
      facing: state.queue.length > 1 ? Math.PI : -0.8,
      action: 'wait',
    },
  ];
}
