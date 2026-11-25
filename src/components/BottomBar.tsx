import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ECHO_PALETTE } from '../utils/echoRenderer';

interface BottomBarProps {
  selectedColor: string;
  lineWidth: number;
  activePopover: 'none' | 'thickness' | 'settings';
  onSelectColor: (hex: string) => void;
  onChangeLineWidth: (width: number) => void;
  onToggleThickness: () => void;
  onToggleSettings: () => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  selectedColor,
  lineWidth,
  activePopover,
  onSelectColor,
  onChangeLineWidth,
  onToggleThickness,
  onToggleSettings,
}) => {
  const dotPreviewSize = Math.max(4, Math.min(14, 2 + lineWidth * 0.75));

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
      {/* Compact thickness popover shown only when thickness button is clicked */}
      {activePopover === 'thickness' && (
        <div
          role="dialog"
          aria-label="Épaisseur du trait"
          className="mb-3 w-56 rounded-2xl bg-[#121212]/95 backdrop-blur-xl border border-white/10 px-4 py-3.5 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-normal text-zinc-300">Épaisseur</span>
            <span className="text-xs font-normal text-zinc-400 tabular-nums">
              {lineWidth} px
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={16}
            step={1}
            value={lineWidth}
            onChange={(e) => onChangeLineWidth(Number(e.target.value))}
            aria-label="Épaisseur du trait"
            className="echo-slider"
          />
        </div>
      )}

      {/* Main compact floating bottom bar */}
      <nav
        aria-label="Outils de dessin"
        className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 py-1.5 rounded-full bg-[#121212]/90 backdrop-blur-xl border border-white/10 shadow-2xl max-w-[calc(100vw-1.5rem)]"
      >
        {/* 7 luminous color swatches */}
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Couleur du trait">
          {ECHO_PALETTE.map((swatch) => {
            const isSelected = selectedColor.toLowerCase() === swatch.hex.toLowerCase();
            return (
              <button
                key={swatch.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={swatch.label}
                title={swatch.label}
                onClick={() => onSelectColor(swatch.hex)}
                className="group relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/[0.06] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded-full transition-transform duration-150 ${
                    isSelected
                      ? 'scale-110 ring-2 ring-white/80 ring-offset-2 ring-offset-[#121212]'
                      : 'opacity-80 group-hover:opacity-100 group-hover:scale-105'
                  }`}
                  style={{ backgroundColor: swatch.hex }}
                />
              </button>
            );
          })}
        </div>

        <div aria-hidden="true" className="h-4 w-px bg-white/10 mx-1" />

        {/* Stroke thickness toggle button */}
        <button
          type="button"
          onClick={onToggleThickness}
          aria-expanded={activePopover === 'thickness'}
          aria-label="Épaisseur du trait"
          title="Épaisseur du trait"
          className={`group relative flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer ${
            activePopover === 'thickness'
              ? 'bg-white/12 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <span
            aria-hidden="true"
            className="rounded-full transition-all duration-150"
            style={{
              width: `${dotPreviewSize}px`,
              height: `${dotPreviewSize}px`,
              backgroundColor: selectedColor,
            }}
          />
          <span className="pointer-events-none absolute bottom-full mb-2.5 px-2.5 py-1 rounded-md bg-[#161616] border border-white/10 text-[11px] font-normal text-zinc-200 whitespace-nowrap opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-lg">
            Épaisseur
          </span>
        </button>

        {/* Generation settings toggle button */}
        <button
          type="button"
          onClick={onToggleSettings}
          aria-expanded={activePopover === 'settings'}
          aria-label="Paramètres de génération"
          title="Paramètres de génération"
          className={`group relative flex items-center justify-center w-9 h-9 rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer ${
            activePopover === 'settings'
              ? 'bg-white/12 text-white'
              : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.6} />
          <span className="pointer-events-none absolute bottom-full mb-2.5 px-2.5 py-1 rounded-md bg-[#161616] border border-white/10 text-[11px] font-normal text-zinc-200 whitespace-nowrap opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-lg">
            Paramètres
          </span>
        </button>
      </nav>
    </div>
  );
};
