/** Read-only scaffold. HYA-004 will define the actual simulation schema/commands. */
export interface GameState {
  readonly schemaVersion: 1;
  readonly phase: 'not-started';
}

export function createInitialState(): Readonly<GameState> {
  return Object.freeze({ schemaVersion: 1, phase: 'not-started' });
}
