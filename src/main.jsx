import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './views/Scene.jsx';
import { loadMap } from './storage/loadMap.js';

// ?test=precision and ?test=camera open the test scenes of tasks 2.4 and 2.5
// instead of the map. They are loaded only when asked for, so they stay out
// of the map's own code.
const test = new URLSearchParams(location.search).get('test');
const TESTS = {
  precision: lazy(() => import('./views/PrecisionTest.jsx')),
  camera: lazy(() => import('./views/camera/CameraTest.jsx')),
};
const Test = TESTS[test];

if (!test) loadMap();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {Test ? (
      <Suspense fallback={null}>
        <Test />
      </Suspense>
    ) : (
      <Scene />
    )}
  </StrictMode>,
);
