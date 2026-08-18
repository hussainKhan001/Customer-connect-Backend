import { createContext, useContext, useEffect, useRef, useState } from 'react';

const ThemeContext = createContext(null);

const THEME_COLOR = '#f97316';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const applied = useRef(false);
  if (!applied.current && typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', getInitialTheme() === 'dark');
    applied.current = true;
  }

  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  const getThemeColor = () => THEME_COLOR;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, getThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
