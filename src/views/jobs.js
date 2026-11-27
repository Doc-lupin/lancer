// The GPU job queue (task B0.9): long work, mostly bakes, divided into small
// steps and run a few at a time each frame, so the view never stops for it.
//
// A job is a generator function. Each `yield` ends one step (one tile painted,
// say). Yield a Promise to wait for something (a read back from the GPU): the
// job sleeps until it settles, other jobs run meanwhile, and the yield returns
// its value (or, if it fails, throws its error into the job, which can catch
// it and go another way). runJobs() is called once a frame (Planet.jsx); it runs steps,
// highest priority first, until the frame's step count or time is used up,
// and always at least one step, so every job finishes.

const queue = [];

// Globes whose maps are all painted (Planet.jsx shows a globe only then).
export const readyGlobes = new Set();

export function enqueue(fn, { priority = 0, name = 'job' } = {}) {
  const job = { gen: fn(), priority, name, waiting: false, resume: undefined, error: undefined, done: false };
  queue.push(job);
  return job;
}

export const pendingJobs = () => queue.length;

// Run steps: at most `maxSteps`, and none after `budgetMs` (at least one).
// Returns true while work remains or a step ran this frame, so the caller
// asks for another frame (and the frame after the last step shows its result).
export function runJobs({ maxSteps = 4, budgetMs = 6, now = () => performance.now() } = {}) {
  const t0 = now();
  let steps = 0;
  queue.sort((a, b) => b.priority - a.priority);
  while (steps < maxSteps && (steps === 0 || now() - t0 < budgetMs)) {
    const job = queue.find((j) => !j.waiting);
    if (!job) break;
    let r;
    try {
      const { error } = job;
      job.error = undefined;
      r = error !== undefined ? job.gen.throw(error) : job.gen.next(job.resume);
    } catch (e) {
      console.error(`job ${job.name} failed:`, e);
      r = { done: true };
    }
    job.resume = undefined;
    steps++;
    if (r.done) {
      job.done = true;
      queue.splice(queue.indexOf(job), 1);
    } else if (r.value && typeof r.value.then === 'function') {
      job.waiting = true;
      r.value.then(
        (v) => { job.resume = v; job.waiting = false; },
        (e) => { job.error = e ?? new Error('rejected'); job.waiting = false; },
      );
    }
  }
  return queue.length > 0 || steps > 0;
}
