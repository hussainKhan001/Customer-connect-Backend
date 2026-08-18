import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

/* Account menu — click the avatar/name in the navbar to open a small
   profile card (avatar, name, role, email, online status) with a sign
   out action, instead of a bare inline badge + separate icon button. */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const { getThemeColor } = useTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setRect(triggerRef.current.getBoundingClientRect());
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

  if (!user) return null;
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 pl-1 sm:pl-2 sm:border-l border-gray-200 dark:border-gray-700 rounded-lg py-1 pr-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="relative flex-shrink-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold"
            style={{ backgroundColor: getThemeColor() }}
          >
            {initial}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 border-2 border-white dark:border-gray-800" />
        </span>
        <span className="hidden md:block leading-tight text-left">
          <span className="block text-xs font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[140px]">{user.name}</span>
          <span className="block text-[10px] font-medium truncate max-w-[140px]" style={{ color: getThemeColor() }}>{user.role}</span>
        </span>
      </button>

      {open && rect && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[10050] w-64 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden animate-fade-in-down"
          style={{ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) }}
        >
          <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
            <span className="relative flex-shrink-0">
              <span
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-base font-bold"
                style={{ backgroundColor: getThemeColor() }}
              >
                {initial}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-800" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</div>
              <div className="text-xs font-semibold truncate" style={{ color: getThemeColor() }}>{user.role}</div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
