import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

/* Custom dropdown — never a native <select>, per the Nexora style guide.
   Trigger + portal-rendered popup positioned via getBoundingClientRect()
   so it's never clipped by a scrolling ancestor. */
export default function ThemedSelect({
  value,
  onChange,
  options, // [{ value, label }]
  placeholder = 'Select…',
  className = '',
  alwaysShowSearch = false,
}) {
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const [flipUp, setFlipUp] = useState(false);
  const [q, setQ] = useState('');
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const showSearch = alwaysShowSearch || options.length > 8;
  const filtered = q
    ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()))
    : options;
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const r = triggerRef.current.getBoundingClientRect();
    setRect(r);
    setFlipUp(window.innerHeight - r.bottom < 250 && r.top > 250);
    setQ('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (triggerRef.current?.contains(e.target) || popupRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <div className={className}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 h-10 border rounded-xl shadow-sm hover:shadow-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 transition-all duration-200"
        style={open ? { boxShadow: `0 0 0 2px ${getThemeColor()}` } : undefined}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/60 rounded-2xl shadow-lg overflow-hidden animate-fade-in-down"
          style={{
            left: rect.left,
            width: rect.width,
            ...(flipUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
          }}
        >
          {showSearch && (
            <div className="relative p-2 border-b border-gray-200 dark:border-gray-700">
              <Search className="w-3.5 h-3.5 absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" style={{ left: '1.1rem' }} />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full pl-8 pr-2 py-1.5 text-sm border rounded bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">No matches</div>
            )}
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors duration-150"
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: getThemeColor() }} />}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
