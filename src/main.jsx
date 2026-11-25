import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './views/Scene.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Scene />
  </StrictMode>,
);
