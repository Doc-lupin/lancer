// The lanes mode switch (task 2.7): a button in the corner, or the L key.

import { useEffect } from 'react';
import { useMap } from '../data/store.js';

export default function LanesToggle() {
  const lanesMode = useMap((s) => s.lanesMode);
  const setLanesMode = useMap((s) => s.setLanesMode);

  useEffect(() => {
    const key = (e) => {
      if (e.key.toLowerCase() !== 'l' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      setLanesMode(!useMap.getState().lanesMode);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [setLanesMode]);

  return (
    <button
      type="button"
      aria-pressed={lanesMode}
      title="Lanes mode (L)"
      onClick={() => setLanesMode(!lanesMode)}
      style={{
        position: 'fixed', right: 'max(12px, env(safe-area-inset-right))', bottom: 'max(12px, env(safe-area-inset-bottom))',
        minWidth: 44, minHeight: 44, padding: '0 16px', borderRadius: 22,
        border: `1px solid ${lanesMode ? '#79e3d2' : '#3a4352'}`,
        background: lanesMode ? 'rgba(121, 227, 210, 0.16)' : 'rgba(10, 14, 20, 0.75)',
        color: lanesMode ? '#bff3ea' : '#c4ccd8', font: '600 14px system-ui, sans-serif', cursor: 'pointer',
      }}
    >
      Lanes
    </button>
  );
}
