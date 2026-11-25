# Working rules for this repo

See `docs/PLAN.md` for the plan and current phase.

- Libraries: Three.js, React, React Three Fiber, drei, Zustand. Don't add others without asking.
- One small task at a time, tied to one function from the Functions table in `docs/PLAN.md`.
- Change only the files the task needs. Keep files small and in their folder: `src/data`, `src/views`, `src/interface`, `src/storage`.
- All map data goes through the single Zustand store. No component keeps its own copy.
- Follow the JSON schema in `data/schema/` for any data change.
- Don't start a phase until the previous phase's test passes.
- Use a separate scene per view level and instancing for stars and icons (see Risks in the plan).
