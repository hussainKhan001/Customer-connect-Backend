import { useState, useEffect, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { useApp } from './context/AppContext.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { Skeleton } from './components/Ui.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Sidebar from './components/Sidebar.jsx';
import UserMenu from './components/UserMenu.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import Login from './pages/Login.jsx';
import { fmtD, TODAY } from './utils/core.js';
import { PAGES, pageById } from './constants/navigation.js';

const MasterPage = pageById('master').Component;
const StatementPage = pageById('statement').Component;

/* Full-shell placeholder for the two top-level loading states (session
   restore, first data fetch) — shaped like the real sidebar+header+
   content layout instead of centered text, so the first thing anyone
   sees isn't a blank "Loading…". */
function ShellSkeleton() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="hidden lg:flex w-56 h-[calc(100vh-8px)] my-1 ml-1 flex-col gap-2 p-3 rounded-2xl bg-white/60 dark:bg-gray-800/60">
        <Skeleton className="h-8 w-full rounded-xl" />
        {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded-lg" />)}
      </div>
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <Skeleton className="h-6 w-56" />
        <PageSkeleton />
      </div>
    </div>
  );
}

/* Lighter placeholder for React.lazy()'s <Suspense> boundary — just the
   content area, since the sidebar/header are already on screen by the
   time a route's chunk is still loading. */
function PageSkeleton() {
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

export default function App() {
  const { user, authLoading } = useAuth();
  const { base, loading, loadError, live } = useApp();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* header title/desc, keyed on the first path segment (the "page
     identity") */
  const pageId = location.pathname.split('/').filter(Boolean)[0] || 'command';
  const page = pageById(pageId) ?? PAGES[0];

  /* scroll to top on every navigation — including switching the
     selected owner/tab within Customer Master or Portfolio Statement,
     not just a page-to-page move — so picking a different owner from
     a scrolled-down page doesn't leave the new one scrolled too. */
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) setMobileOpen((o) => !o);
    else setCollapsed((c) => !c);
  };

  if (authLoading) return <ShellSkeleton />;

  if (!user) return <Login />;

  if (loading) return <ShellSkeleton />;

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 px-6">
        <div className="max-w-md text-center">
          <div className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1.5">Could not reach the API</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {loadError} — confirm the backend is running (<code className="font-mono">npm run server</code> or{' '}
            <code className="font-mono">npm run dev:all</code>) and MongoDB is reachable.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 print:h-auto print:overflow-visible">
      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} collapsed={collapsed} />
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-y-auto custom-scrollbar print:overflow-visible">
        <div className="print:hidden sticky top-0 z-20 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-b border-gray-100/80 dark:border-gray-700/50 shadow-sm px-4 sm:px-6 py-2">
          <div className="flex items-center gap-3 flex-wrap max-w-[1800px] mx-auto">
            <button
              onClick={toggleSidebar}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 active:scale-95"
              title="Toggle sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">{page.title}</h1>
              <p className="hidden sm:block text-[10.5px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 max-w-xl truncate">{page.desc}</p>
            </div>
            <div className="flex-1" />
            <div
              className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500"
              title={live ? 'Realtime sync connected — MongoDB changes appear here automatically' : 'Realtime sync disconnected — reconnecting…'}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              {live ? 'Live' : 'Offline'}
            </div>
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationBell />
            <div className="hidden md:block text-[10px] text-gray-400 dark:text-gray-500 text-right leading-tight">
              As on <b className="text-gray-600 dark:text-gray-300">{fmtD(TODAY)}</b><br />
              Sample data · {base.length} owners
            </div>
            <UserMenu />
          </div>
        </div>
        <div className="p-4 sm:p-6 pb-16 max-w-[1800px] w-full mx-auto">
          <ErrorBoundary>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<Navigate to="/command" replace />} />
                {PAGES.filter((p) => p.id !== 'master' && p.id !== 'statement').map((p) => (
                  <Route key={p.id} path={p.path} element={<p.Component />} />
                ))}
                <Route path="master" element={<MasterPage />} />
                <Route path="master/:id" element={<MasterPage />} />
                <Route path="master/:id/:tab" element={<MasterPage />} />
                <Route path="statement" element={<StatementPage />} />
                <Route path="statement/:id" element={<StatementPage />} />
                <Route path="*" element={<Navigate to="/command" replace />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
