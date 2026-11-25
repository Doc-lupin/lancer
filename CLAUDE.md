# Working rules for this repo

See `docs/PLAN.md` for the plan and current phase.

- Libraries: Three.js, React, React Three Fiber, drei, Zustand. Build tool: Vite. Don't add others without asking.
- One small task at a time, tied to one function from the Functions table in `docs/PLAN.md`.
- Change only the files the task needs. Keep files small and in their folder: `src/data`, `src/views`, `src/interface`, `src/storage`.
- All map data goes through the single Zustand store. No component keeps its own copy.
- Follow the JSON schema in `data/schema/` for any data change.
- Don't start a phase until the previous phase's test passes.
- The zoom is continuous across all levels (no scene swaps). Use a floating origin and a logarithmic depth buffer for precision. Use instancing for stars and icons.
- Every map object has an origin tag (`canon` / `invented`); invented objects also end their name with "(WIP)" and GM notes are kept separate from player-visible notes.
