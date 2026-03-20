import { useState, useCallback } from 'react';

const MEMO_KEY = 'stockstar_memos';

function loadAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(MEMO_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveAll(memos: Record<string, string>) {
  localStorage.setItem(MEMO_KEY, JSON.stringify(memos));
}

/**
 * Hook for per-item user memos.
 * key format: "news:news-1" or "stock:NVDA"
 */
export function useUserMemo(key: string) {
  const [memo, setMemoState] = useState<string>(() => loadAll()[key] ?? '');

  const setMemo = useCallback((value: string) => {
    setMemoState(value);
    const all = loadAll();
    if (value.trim()) {
      all[key] = value;
    } else {
      delete all[key];
    }
    saveAll(all);
  }, [key]);

  return [memo, setMemo] as const;
}
