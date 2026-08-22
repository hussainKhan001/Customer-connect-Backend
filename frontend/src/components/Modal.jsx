/* Shared chrome for every form-in-a-popup (EditProfileModal and the
   operational-edit modals it preceded) — portal + backdrop + header
   with a close-X + scrollable body slot + footer slot for buttons.
   Extracted once several near-identical modals started needing it,
   rather than duplicating the portal/backdrop boilerplate per modal. */
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ title, subtitle, onClose, children, footer, maxWidth = 'max-w-2xl' }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[10040] flex items-start sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full ${maxWidth} my-8 animate-fade-in-down`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto custom-scrollbar">{children}</div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-700">{footer}</div>
      </div>
    </div>,
    document.body
  );
}
