// The GPU job queue (task B0.9), with plain generators (no GPU).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enqueue, runJobs, pendingJobs } from './jobs.js';

const drain = async (opts) => { for (let i = 0; i < 1000 && pendingJobs(); i++) { runJobs(opts); await Promise.resolve(); } };

test('a job runs a few steps a frame and finishes; one more frame after its last step', () => {
  const log = [];
  enqueue(function* () { for (let i = 0; i < 5; i++) { log.push(i); yield; } });
  assert.equal(runJobs({ maxSteps: 2 }), true);
  assert.deepEqual(log, [0, 1]);
  runJobs({ maxSteps: 2 });
  assert.deepEqual(log, [0, 1, 2, 3]);
  assert.equal(runJobs({ maxSteps: 2 }), true, 'a step ran: one more frame');
  assert.equal(pendingJobs(), 0);
  assert.equal(runJobs({ maxSteps: 2 }), false, 'nothing left: no more frames');
});

test('the time budget stops a frame early, but at least one step always runs', () => {
  let t = 0;
  const now = () => t;
  let n = 0;
  enqueue(function* () { for (;;) { n++; t += 10; if (n > 6) return; yield; } });
  runJobs({ maxSteps: 4, budgetMs: 6, now });
  assert.equal(n, 1, 'the first step took 10 ms of a 6 ms budget');
  runJobs({ maxSteps: 4, budgetMs: 100, now });
  assert.equal(n, 5);
  while (pendingJobs()) runJobs({ now });
});

test('higher priority runs first', () => {
  const log = [];
  enqueue(function* () { log.push('low'); yield; }, { priority: 0 });
  enqueue(function* () { log.push('high'); yield; }, { priority: 1 });
  runJobs({ maxSteps: 1 });
  assert.deepEqual(log, ['high']);
  while (pendingJobs()) runJobs();
});

test('a job waits for a promise without blocking others, and gets its value', async () => {
  const log = [];
  let release;
  enqueue(function* () { log.push('a1'); const v = yield new Promise((r) => { release = r; }); log.push(`a2:${v}`); });
  enqueue(function* () { log.push('b1'); yield; log.push('b2'); });
  runJobs({ maxSteps: 4 });
  assert.deepEqual(log, ['a1', 'b1', 'b2'], 'b runs while a waits');
  release(42);
  await drain();
  assert.deepEqual(log, ['a1', 'b1', 'b2', 'a2:42']);
});

test('a failing job is dropped and the others go on', async () => {
  const orig = console.error;
  console.error = () => {};
  try {
    const log = [];
    enqueue(function* () { yield; throw new Error('broken'); });
    enqueue(function* () { yield; log.push('ok'); });
    await drain();
    assert.deepEqual(log, ['ok']);
    assert.equal(pendingJobs(), 0);
  } finally {
    console.error = orig;
  }
});
