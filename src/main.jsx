import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './views/Scene.jsx';
import { loadMap } from './storage/loadMap.js';

// ?test=precision opens the precision test scene (task 2.4) instead of the map.
// It is loaded only when asked for, so it stays out of the map's own code.
const test = new URLSearchParams(location.search).get('test');
const PrecisionTest = lazy(() => import('./views/PrecisionTest.jsx'));

if (!test) loadMap();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {test === 'precision' ? (
      <Suspense fallback={null}>
        <PrecisionTest />
      </Suspense>
    ) : (
      <Scene />
    )}
  </StrictMode>,
);
