import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Server-side "load more" pagination for lists that grow unbounded.
 *
 * fetchPage(offset, limit) must resolve to { items, total?, meta? }.
 *  - total: known row count → enables an accurate hasMore; otherwise a page-full heuristic is used.
 *  - meta:  any extra payload from the last fetch (e.g. cash aggregates) exposed as `meta`.
 */
export function usePagedList(fetchPage, deps = [], { pageSize = 15 } = {}) {
  const [state, setState] = useState({ items: [], total: null, meta: null, loading: true, loadingMore: false, error: null });
  const itemsRef = useRef([]);
  itemsRef.current = state.items;
  const fnRef = useRef(fetchPage);
  fnRef.current = fetchPage;

  const load = useCallback(async (append) => {
    const offset = append ? itemsRef.current.length : 0;
    setState((s) => ({ ...s, loading: !append, loadingMore: append, error: null }));
    try {
      const { items = [], total = null, meta = null } = await fnRef.current(offset, pageSize);
      setState((s) => {
        const merged = append ? [...s.items, ...items] : items;
        return { items: merged, total, meta, loading: false, loadingMore: false, error: null };
      });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, loadingMore: false, error }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize, ...deps]);

  useEffect(() => { load(false); }, [load]);

  const hasMore = state.total != null
    ? state.items.length < state.total
    : state.items.length > 0 && state.items.length % pageSize === 0;

  return { ...state, hasMore, loadMore: () => load(true), reload: () => load(false) };
}
