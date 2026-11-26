// Whether anything on screen can bloom this frame (task B0.5). Stars set
// `stars` when one is near enough for its core to pass white (Stars.jsx);
// globes set `lava` while a glowing globe shows (Planet.jsx). Both run before
// the composer draws; Output.jsx skips bloom's passes when neither is set, so
// the Basin and the regions pay nothing for it.

export const BLOOM = { stars: false, lava: false };
