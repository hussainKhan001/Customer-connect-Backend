/* =====================================================================
   APP STATE — one store for the whole system. The raw base is held as
   state; every derived field is recomputed by enrich() whenever the
   base or the weights change, so moving a weight redraws the segments
   everywhere at once.
   ===================================================================== */
import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { RAW_BASE } from '../lib/generator.js';
import { enrich, DEFAULT_W } from '../lib/derived.js';
import { buildCustomer } from '../lib/intake.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [raw, setRaw] = useState(RAW_BASE);
  const [weights, setWeights] = useState(DEFAULT_W);

  const [view, setViewRaw] = useState('command');
  const [cid, setCid] = useState(null);
  const [tab, setTab] = useState('overview');
  const [sort, setSort] = useState({ k: '_total', dir: -1 });
  const [filters, setFilters] = useState({ seg: '', proj: '', ent: '', q: '', status: '' });
  const [stmtId, setStmtId] = useState(null);

  /* the only expensive computation in the app — memoised on its inputs */
  const base = useMemo(() => enrich(raw, weights), [raw, weights]);
  const byId = useCallback((id) => base.find((c) => c.id === id), [base]);

  const setView = useCallback((v) => {
    setViewRaw(v);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, []);

  /* click any owner anywhere → open their master record */
  const openCustomer = useCallback((id) => {
    setCid(id);
    setTab('overview');
    setView('master');
  }, [setView]);

  /* jump from a segment tile to the filtered owner base */
  const openSegment = useCallback((seg) => {
    setFilters((f) => ({ ...f, seg }));
    setView('base');
  }, [setView]);

  const openStatement = useCallback((id) => {
    setStmtId(id);
    setView('statement');
  }, [setView]);

  const toggleSort = useCallback((k) => {
    setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }));
  }, []);

  const clearFilters = useCallback(() => setFilters({ seg: '', proj: '', ent: '', q: '', status: '' }), []);

  /* intake writes straight into the in-memory base; the new record is
     scored and gated on the next render like any other */
  const addCustomer = useCallback((draft) => {
    const c = buildCustomer(draft);
    setRaw((prev) => [c, ...prev]);
    return c;
  }, []);

  const value = {
    base, byId, raw,
    weights, setWeights,
    view, setView,
    cid, setCid, tab, setTab,
    sort, toggleSort,
    filters, setFilters, clearFilters,
    stmtId, setStmtId,
    openCustomer, openSegment, openStatement, addCustomer,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
