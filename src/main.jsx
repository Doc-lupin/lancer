import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './views/Scene.jsx';
import { loadMap } from './storage/loadMap.js';

loadMap();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Scene />
  </StrictMode>,
);
