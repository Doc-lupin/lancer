// The camera button (task 2.11, at the GM's request): Orbit, circling the
// focus, or Free, moving through space. The F key does the same. In free
// mode a short line says how to move: keys on a computer, gestures on a
// touch screen. In orbit mode the same line, for the first few seconds after
// the map opens, says how to go in and back out.

import { useEffect, useState } from 'react';
import { useMap } from '../data/store.js';

const ORBIT_HINT_MS = 9000;

const touch = () => matchMedia('(pointer: coarse)').matches;

export default function CameraToggle() {
  const mode = useMap((s) => s.cameraMode);
  const setMode = useMap((s) => s.setCameraMode);
  const free = mode === 'free';
  const [orbitHint, setOrbitHint] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setOrbitHint(false), ORBIT_HINT_MS);
    return () => clearTimeout(t);
  }, []);
  const right = 'max(12px, env(safe-area-inset-right))';
  const bottom = 'calc(max(12px, env(safe-area-inset-bottom)) + 54px)'; // above the Lanes button
  return (
    <>
      <button
        type="button"
        data-camera={mode}
        aria-label={`Camera: ${mode}. Press for ${free ? 'orbit' : 'free'}.`}
        title={`Camera: ${mode} (F)`}
        onClick={() => setMode(free ? 'orbit' : 'free')}
        style={{
          position: 'fixed', right, bottom, minWidth: 44, minHeight: 44, padding: '0 16px', borderRadius: 22,
          border: `1px solid ${free ? '#e8c87a' : '#3a4352'}`,
          background: free ? 'rgba(232, 200, 122, 0.14)' : 'rgba(10, 14, 20, 0.75)',
          color: free ? '#f3dfae' : '#c4ccd8', font: '600 14px system-ui, sans-serif', cursor: 'pointer',
        }}
      >
        {free ? 'Free' : 'Orbit'}
      </button>
      <p
          data-hint={free ? 'free' : 'orbit'}
          style={{
            opacity: free || orbitHint ? 1 : 0, transition: 'opacity 0.6s ease-out',
            position: 'fixed', left: 'max(12px, env(safe-area-inset-left))', bottom: 'max(12px, env(safe-area-inset-bottom))',
            right: 'calc(max(12px, env(safe-area-inset-right)) + 120px)', margin: 0, pointerEvents: 'none',
            color: '#aab3c0', font: '12px/1.4 system-ui, sans-serif', textShadow: '0 0 3px #000, 0 0 6px #000',
          }}
        >
          {free
            ? touch()
              ? 'Drag to look around · pinch to move · tap something to fly there'
              : 'Drag to look · W A S D or arrows to move · Q E down, up · Shift faster · wheel forward, back · F to orbit'
            : touch()
              ? 'Tap a name or star to fly in · double-tap empty space to go back out · pinch to zoom'
              : 'Click a name or star to fly in · double-click empty space or Esc to go back out · wheel to zoom'}
        </p>
    </>
  );
}
