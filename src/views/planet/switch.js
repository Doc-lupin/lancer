// Decision BQ1 (docs/PHASE_B0.md): the procedural worlds of this folder are
// off by default until bakes no longer hold the view (B0.9, B0.10) and their
// per-frame CPU work fits the budget. Until then planets use the Phase 2
// globe painted by ../procedural.js. Turn them on in development builds with
// ?worlds=wip in the address; built apps never use them.

export const WIP_WORLDS = Boolean(import.meta.env?.DEV)
  && typeof location !== 'undefined'
  && new URLSearchParams(location.search).get('worlds') === 'wip';
