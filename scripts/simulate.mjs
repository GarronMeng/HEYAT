import ts from 'typescript';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const directory = mkdtempSync(join(tmpdir(), 'heyat-sim-'));
try {
  for (const file of readdirSync('src/core').filter((file) =>
    file.endsWith('.ts'),
  )) {
    const source = readFileSync(join('src/core', file), 'utf8');
    writeFileSync(
      join(directory, file.replace('.ts', '.js')),
      ts.transpileModule(source, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.CommonJS,
        },
      }).outputText,
    );
  }
  const require = createRequire(join(directory, 'entry.cjs'));
  const { HotelSimulation } = require('./simulation.js');
  const { initialHotel, roomCount, assertHotel } = require('./model.js');
  const { upgradeReason, upgradeCost } = require('./progression.js');
  const policies = {
    capacity: [
      'autodesk',
      'autoclean',
      'room',
      'price',
      'bed',
      'luxury',
      'floor',
      'brand',
      'desk',
      'clean',
      'marketing',
      'vip',
    ],
    revenue: [
      'autodesk',
      'autoclean',
      'price',
      'bed',
      'luxury',
      'room',
      'floor',
      'brand',
      'clean',
      'desk',
      'vip',
      'marketing',
    ],
    service: [
      'autodesk',
      'autoclean',
      'room',
      'floor',
      'brand',
      'clean',
      'price',
      'bed',
      'luxury',
      'desk',
      'marketing',
      'vip',
    ],
  };
  const results = [];
  for (const [policy, priority] of Object.entries(policies)) {
    const sim = new HotelSimulation(initialHotel(1731));
    const milestones = {},
      samples = [];
    for (let second = 0; second < 1800; second++) {
      sim.command({ type: 'CHECK_IN' });
      sim.command({ type: 'CLEAN' });
      const state = sim.snapshot();
      const id = priority.find(
        (id) =>
          !upgradeReason(state, id) && upgradeCost(state, id) <= state.cash,
      );
      if (id) {
        const result = sim.command({ type: 'BUY', id });
        if (result.ok && milestones[id] === undefined) milestones[id] = second;
      }
      sim.advance(1);
      const next = sim.snapshot();
      assertHotel(next);
      if (second % 30 === 0)
        samples.push({
          time: next.time,
          cash: next.cash,
          revenue: next.revenue,
          rooms: roomCount(next),
        });
      if (next.won) break;
    }
    const state = sim.snapshot();
    results.push({
      policy,
      seed: 1731,
      won: state.won,
      wonAt: state.wonAt,
      milestones,
      completed: state.completed,
      revenue: state.revenue,
      samples,
    });
  }
  if (process.argv.includes('--save')) {
    const file = resolve('docs/ECONOMY_BASELINE.json');
    writeFileSync(file, JSON.stringify(results, null, 2) + '\n');
  }
  console.log(
    JSON.stringify(
      results.map(({ samples, ...summary }) => ({
        ...summary,
        sampleCount: samples.length,
      })),
      null,
      2,
    ),
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}
