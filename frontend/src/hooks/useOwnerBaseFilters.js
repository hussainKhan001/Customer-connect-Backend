import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/* Owner Base's search/sort/filter state — page-local (nothing else
   reads it), so it lives here instead of AppContext. Seeds `seg` once
   from the URL's ?seg= query param on mount (written by
   useAppNavigation's openSegment) since <Routes> always mounts a
   fresh OwnerBase instance on navigation — no stale-seed edge case,
   no need to keep re-syncing from the URL afterward. */
export function useOwnerBaseFilters() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    seg: searchParams.get('seg') || '', proj: '', ent: '', q: '', status: '',
  }));
  const [sort, setSort] = useState({ k: '_total', dir: -1 });

  const toggleSort = (k) => setSort((s) => (s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }));
  const clearFilters = () => setFilters({ seg: '', proj: '', ent: '', q: '', status: '' });

  return { filters, setFilters, sort, toggleSort, clearFilters };
}
