// The one camera rig and the things it can focus on, shared by the camera
// controls and every view that places objects relative to the camera.
//
// targets: id → { place, radiusKm, viewKm, minKm, parentId, pickable }
//   place     where the object is (see ../origin.js)
//   radiusKm  its size, for picking and for the smallest size on screen
//   viewKm    how far the camera stands after flying to it
//   minKm     how close the camera may come
//   parentId  the level above it; zooming out far enough goes there
//   pickable  false for things with nothing drawn (the Basin itself)
// Views register their objects here; the map data itself stays in the store.

export const view = {
  rig: null,
  targets: new Map(),
};
