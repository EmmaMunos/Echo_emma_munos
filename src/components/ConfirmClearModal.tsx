import React from 'react';

interface ConfirmClearModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmClearModal: React.FC<ConfirmClearModalProps> = ({
  isOpen,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-xs rounded-2xl bg-[#121212] border border-white/10 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="clear-modal-title" className="text-sm font-medium text-white">
          Nouveau dessin
        </h2>
        <p className="mt-2 text-xs font-light leading-relaxed text-zinc-400">
          Effacer la composition actuelle et repartir d&apos;une toile vierge ?
        </p>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-normal text-zinc-300 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-medium text-[#080808] bg-zinc-100 hover:bg-white rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 cursor-pointer"
          >
            Effacer
          </button>
        </div>
      </div>
    </div>
  );
};
