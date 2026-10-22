import type { HotelState } from '../core/model';
export type Action = 'idle' | 'walk' | 'reception' | 'clean';
export interface PersonPose {
  x: number;
  y: number;
  z: number;
  facing: number;
  action: Action;
}
/** Six representative people, independent of simulation population. Read-only visual sampling. */
export function peoplePoses(state: HotelState, time: number): PersonPose[] {
  const cleaner = state.rooms.find((r) => r.status === 'CLEANING');
  const guest =
    state.rooms.find((r) => r.status === 'RESERVED') ??
    state.rooms.find((r) => r.status === 'OCCUPIED');
  const roomPose = (
    room: NonNullable<typeof guest>,
    action: Action,
  ): PersonPose => ({
    x: -4.05 + room.slot * 2.7 + 0.65,
    y: 2.64 + (room.floor - 1) * 2.25,
    z:
      room.status === 'RESERVED'
        ? 1.8 -
          Math.min(1, Math.max(0, (state.time - room.changedAt) / 2)) * 0.3
        : 1.5,
    facing: -0.5,
    action,
  });
  const walking = Math.sin(time * 0.2);
  return [
    {
      x: -0.8,
      y: 0.25,
      z: -1.08,
      facing: 0,
      action: state.queue.length ? 'reception' : 'idle',
    },
    {
      x: 0.7,
      y: 0.25,
      z: -1.08,
      facing: -0.2,
      action: state.rooms.some((r) => r.status === 'RESERVED')
        ? 'reception'
        : 'idle',
    },
    {
      x: 4.65,
      y: 0.25,
      z: 0.7 + walking * 0.9,
      facing: Math.cos(time * 0.2) > 0 ? 0 : Math.PI,
      action: 'walk',
    },
    cleaner
      ? roomPose(cleaner, 'clean')
      : { x: 3.6, y: 0.25, z: -0.65, facing: -0.4, action: 'idle' },
    guest
      ? roomPose(guest, guest.status === 'RESERVED' ? 'walk' : 'idle')
      : { x: -1.1, y: 0.25, z: 1.5, facing: 0.4, action: 'idle' },
    {
      x: 1.95,
      y: 0.25,
      z: 0.7,
      facing: -0.8,
      action: 'idle',
    },
  ];
}
