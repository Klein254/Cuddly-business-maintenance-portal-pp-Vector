import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Shuffle, Check } from 'lucide-react';

// Maintenance & supply photos behind the glass panels (see public/backgrounds/CREDITS.md)
export const BACKGROUNDS = [
  { file: 'electrician.jpg', label: 'Electrical' },
  { file: 'warehouse.jpg', label: 'Warehouse' },
  { file: 'power-lines.jpg', label: 'Power Lines' },
  { file: 'tool-wall.jpg', label: 'Tool Wall' },
  { file: 'plumbing.jpg', label: 'Plumbing' },
  { file: 'tool-supply.jpg', label: 'Tool Supply' },
  { file: 'panel-testing.jpg', label: 'Panel Testing' },
  { file: 'switchboard.jpg', label: 'Switchboard' },
];

const ROTATE_MS = 12000;
const CHOICE_KEY = 'vector.background';

// null = rotate through all photos, otherwise the index of the photo kept on screen
export function useBackgroundChoice() {
  const [choice, setChoiceState] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(CHOICE_KEY);
      const idx = saved === null ? NaN : Number(saved);
      return idx >= 0 && idx < BACKGROUNDS.length ? idx : null;
    } catch (e) { return null; }
  });

  const setChoice = (idx: number | null) => {
    setChoiceState(idx);
    try {
      if (idx === null) localStorage.removeItem(CHOICE_KEY);
      else localStorage.setItem(CHOICE_KEY, String(idx));
    } catch (e) {}
  };

  return [choice, setChoice] as const;
}

export function GlassBackground({ choice }: { choice: number | null }) {
  const [rotating, setRotating] = useState(0);

  useEffect(() => {
    if (choice !== null) return;
    const timer = setInterval(() => setRotating(i => (i + 1) % BACKGROUNDS.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, [choice]);

  const shown = choice ?? rotating;

  return (
    <div className="glass-bg fixed inset-0 -z-10 overflow-hidden bg-stone-950" aria-hidden="true">
      {BACKGROUNDS.map((bg, i) => (
        <img
          key={bg.file}
          src={`/backgrounds/${bg.file}`}
          alt=""
          decoding="async"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ease-in-out ${i === shown ? 'opacity-100 glass-bg-zoom' : 'opacity-0'}`}
        />
      ))}
      {/* Darken the photo so the glass panels and text stay readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70" />
    </div>
  );
}

export function BackgroundPicker({ choice, onChoose }: { choice: number | null; onChoose: (idx: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="glass-pill w-9 h-9 rounded-full flex items-center justify-center text-stone-300 hover:text-white transition-colors cursor-pointer"
        title="Change background"
      >
        <ImageIcon className="h-4 w-4" />
      </button>

      {open && (
        <div className="glass-panel absolute left-0 top-11 z-50 w-72 rounded-2xl p-3 animate-enter">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <span className="text-xs font-bold text-white">Background</span>
            <button
              onClick={() => onChoose(null)}
              className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${choice === null ? 'bg-white text-black' : 'text-stone-300 hover:text-white hover:bg-white/10'}`}
            >
              <Shuffle className="h-3 w-3" />
              Rotate all
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {BACKGROUNDS.map((bg, i) => (
              <button
                key={bg.file}
                onClick={() => onChoose(i)}
                title={bg.label}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${choice === i ? 'border-white' : 'border-transparent hover:border-white/40'}`}
              >
                <img src={`/backgrounds/${bg.file}`} alt={bg.label} className="w-full h-full object-cover" />
                {choice === i && (
                  <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-stone-400 mt-2.5 px-0.5">
            {choice === null ? 'Photos change every few seconds.' : `Showing "${BACKGROUNDS[choice].label}". Pick "Rotate all" to cycle again.`}
          </p>
        </div>
      )}
    </div>
  );
}
