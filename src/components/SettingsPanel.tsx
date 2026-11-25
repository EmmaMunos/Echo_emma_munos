import React from 'react';
import { X } from 'lucide-react';
import type { DrawingSettings, SymmetryMode } from '../types/echo';

interface SettingsPanelProps {
  isOpen: boolean;
  settings: DrawingSettings;
  onUpdateSettings: (partial: Partial<DrawingSettings>) => void;
  onClose: () => void;
}

const SYMMETRY_OPTIONS: Array<{ value: SymmetryMode; label: string }> = [
  { value: 'libre', label: 'Libre' },
  { value: 'miroir', label: 'Miroir' },
  { value: 'radial', label: 'Radial' },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-label="Paramètres de génération"
      className="fixed bottom-[76px] left-1/2 -translate-x-1/2 z-30 w-[min(316px,calc(100vw-2rem))] rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 p-5 shadow-2xl"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium tracking-wide text-zinc-200">
          Paramètres
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer les paramètres"
          className="flex items-center justify-center w-7 h-7 -mr-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" strokeWidth={1.7} />
        </button>
      </div>

      <div className="space-y-4">
        {/* 1. Nombre d'échos (1 à 12) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="echo-count-slider" className="text-xs font-normal text-zinc-300">
              Échos
            </label>
            <span className="text-xs font-normal text-zinc-400 tabular-nums">
              {settings.echoCount}
            </span>
          </div>
          <input
            id="echo-count-slider"
            type="range"
            min={1}
            max={12}
            step={1}
            value={settings.echoCount}
            onChange={(e) => onUpdateSettings({ echoCount: Number(e.target.value) })}
            className="echo-slider"
          />
        </div>

        {/* 2. Épaisseur */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="line-width-slider" className="text-xs font-normal text-zinc-300">
              Épaisseur
            </label>
            <span className="text-xs font-normal text-zinc-400 tabular-nums">
              {settings.lineWidth} px
            </span>
          </div>
          <input
            id="line-width-slider"
            type="range"
            min={1}
            max={16}
            step={1}
            value={settings.lineWidth}
            onChange={(e) => onUpdateSettings({ lineWidth: Number(e.target.value) })}
            className="echo-slider"
          />
        </div>

        {/* 3. Mode de symétrie */}
        <div>
          <span className="block text-xs font-normal text-zinc-300 mb-2">
            Symétrie
          </span>
          <div
            role="radiogroup"
            aria-label="Mode de symétrie"
            className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.06]"
          >
            {SYMMETRY_OPTIONS.map((opt) => {
              const active = settings.symmetry === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onUpdateSettings({ symmetry: opt.value })}
                  className={`py-1.5 px-2 text-xs font-normal rounded-lg whitespace-nowrap transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer ${
                    active
                      ? 'bg-white/14 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Intensité lumineuse */}
        <div className="pt-1 border-t border-white/[0.07]">
          <div className="flex items-center justify-between mb-2 pt-2">
            <label htmlFor="luminance-slider" className="text-xs font-normal text-zinc-300">
              Intensité lumineuse
            </label>
            <span className="text-xs font-normal text-zinc-400 tabular-nums">
              {Math.round(settings.luminance * 100)} %
            </span>
          </div>
          <input
            id="luminance-slider"
            type="range"
            min={25}
            max={150}
            step={5}
            value={Math.round(settings.luminance * 100)}
            onChange={(e) =>
              onUpdateSettings({ luminance: Number(e.target.value) / 100 })
            }
            className="echo-slider"
          />
        </div>
      </div>
    </div>
  );
};
