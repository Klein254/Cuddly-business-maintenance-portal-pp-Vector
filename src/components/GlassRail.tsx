import React from 'react';

export interface RailItem<T extends string> {
  id: T;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// "Good morning/afternoon/evening, <first name>" for the top of each workspace
export function greeting(name: string) {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${name.split(' ')[0]}`;
}

// Floating vertical tab rail on large screens (phones and tablets keep their tab bars)
export default function GlassRail<T extends string>({ items, active, onSelect }: {
  items: RailItem<T>[];
  active: T;
  onSelect: (id: T) => void;
}) {
  return (
    <nav className="hidden lg:flex fixed left-5 top-1/2 -translate-y-1/2 z-40 max-h-[calc(100vh-10rem)]">
      <div className="glass-pill rounded-full p-1.5 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`relative w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              active === id ? 'bg-white text-black shadow-lg' : 'text-stone-300 hover:text-white hover:bg-white/10'
            }`}
            aria-label={label}
            title={label}
          >
            <Icon className="h-[18px] w-[18px]" />
            {!!badge && badge > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
