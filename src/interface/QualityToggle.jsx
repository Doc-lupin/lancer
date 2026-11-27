// The quality button (task B0.6): each press steps the tier low → medium →
// high → ultra → low; the Q key does the same. The choice is kept in this
// browser (views/quality.js). Above the camera button.

import { useEffect } from 'react';
import { useMap } from '../data/store.js';
import { TIER_NAMES, saveTier } from '../views/quality.js';

const next = (t) => TIER_NAMES[(TIER_NAMES.indexOf(t) + 1) % TIER_NAMES.length];

export default function QualityToggle() {
  const quality = useMap((s) => s.quality);
  const setQuality = useMap((s) => s.setQuality);
  const step = () => {
    const t = next(useMap.getState().quality);
    saveTier(t);
    setQuality(t);
  };

  useEffect(() => {
    const key = (e) => {
      if (e.key.toLowerCase() !== 'q' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.closest?.('input, textarea, [contenteditable]')) return;
      step();
    };
    addEventListener('keydown', key);
    return () => removeEventListener('keydown', key);
  });

  return (
    <button
      type="button"
      data-quality={quality}
      aria-label={`Quality: ${quality}. Press for ${next(quality)}.`}
      title={`Quality: ${quality} (Q)`}
      onClick={step}
      style={{
        position: 'fixed', right: 'max(12px, env(safe-area-inset-right))', bottom: 'calc(max(12px, env(safe-area-inset-bottom)) + 108px)',
        minWidth: 44, minHeight: 44, padding: '0 16px', borderRadius: 22,
        border: '1px solid #3a4352', background: 'rgba(10, 14, 20, 0.75)', color: '#c4ccd8',
        font: '600 14px system-ui, sans-serif', cursor: 'pointer',
      }}
    >
      Quality <span style={{ fontWeight: 400, opacity: 0.85 }}>{quality}</span>
    </button>
  );
}
