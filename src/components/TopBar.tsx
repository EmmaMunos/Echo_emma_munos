import React from 'react';
import { Download, RotateCcw, Undo2 } from 'lucide-react';

interface TopBarProps {
  canUndo: boolean;
  hasStrokes: boolean;
  onUndo: () => void;
  onRequestClear: () => void;
  onExportPng: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  canUndo,
  hasStrokes,
  onUndo,
  onRequestClear,
  onExportPng,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 pointer-events-none">
      {/* Top-left wordmark */}
      <span className="text-lg font-light tracking-tight text-white/90 select-none">
        écho.
      </span>

      {/* Top-right minimalist action buttons */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Annuler (Ctrl+Z)"
          aria-label="Annuler la dernière action"
          className="group relative flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
        >
          <Undo2 className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <span className="pointer-events-none absolute top-full mt-2 right-0 px-2.5 py-1 rounded-md bg-[#161616] border border-white/10 text-[11px] font-normal text-zinc-200 whitespace-nowrap opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-lg">
            Annuler
          </span>
        </button>

        <button
          type="button"
          onClick={onRequestClear}
          disabled={!hasStrokes}
          title="Nouveau dessin"
          aria-label="Nouveau dessin"
          className="group relative flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
        >
          <RotateCcw className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <span className="pointer-events-none absolute top-full mt-2 right-0 px-2.5 py-1 rounded-md bg-[#161616] border border-white/10 text-[11px] font-normal text-zinc-200 whitespace-nowrap opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-lg">
            Nouveau dessin
          </span>
        </button>

        <button
          type="button"
          onClick={onExportPng}
          title="Enregistrer en PNG"
          aria-label="Enregistrer en PNG"
          className="group relative flex items-center justify-center w-10 h-10 rounded-full text-zinc-400 hover:text-white hover:bg-white/[0.06] active:scale-95 transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
        >
          <Download className="w-[18px] h-[18px]" strokeWidth={1.6} />
          <span className="pointer-events-none absolute top-full mt-2 right-0 px-2.5 py-1 rounded-md bg-[#161616] border border-white/10 text-[11px] font-normal text-zinc-200 whitespace-nowrap opacity-0 translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 shadow-lg">
            Enregistrer en PNG
          </span>
        </button>
      </div>
    </header>
  );
};
