// The lanes button (tasks 2.7, 2.11): each press steps lanes from faint to
// bright (lanes mode, with labels) to off and back to faint. The L key does
// the same.

import { useEffect } from 'react';
import { useMap } from '../data/store.js';

const NEXT = { faint: 'bright', bright: 'off', off: 'faint' };
const LOOK = {
  faint: { border: '#3a4352', background: 'rgba(10, 14, 20, 0.75)', color: '#c4ccd8' },
  bright: { border: '#79e3d2', background: 'rgba(121, 227, 210, 0.16)', color: '#bff3ea' },
  off: { border: '#2a303a', background: 'rgba(10, 14, 20, 0.75)', color: '#7d8593' },
};

export default function LanesToggle() {
  const lanes = useMap((s) => s.lanes);
  const setLanes = useMap((s) => s.setLanes);

  useEffect(() => {
    const key = (e) => {
      if (e.key.toLowerCase() !== 'l' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      setLanes(NEXT[useMap.getState().lanes]);
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  }, [setLanes]);

  const look = LOOK[lanes];
  return (
    <button
      type="button"
      data-lanes={lanes}
      aria-label={`Lanes: ${lanes}. Press for ${NEXT[lanes]}.`}
      title={`Lanes: ${lanes} (L)`}
      onClick={() => setLanes(NEXT[lanes])}
      style={{
        position: 'fixed', right: 'max(12px, env(safe-area-inset-right))', bottom: 'max(12px, env(safe-area-inset-bottom))',
        minWidth: 44, minHeight: 44, padding: '0 16px', borderRadius: 22,
        border: `1px solid ${look.border}`, background: look.background, color: look.color,
        font: '600 14px system-ui, sans-serif', cursor: 'pointer',
      }}
    >
      Lanes <span style={{ fontWeight: 400, opacity: 0.85 }}>{lanes}</span>
    </button>
  );
}
