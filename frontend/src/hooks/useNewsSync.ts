import { useEffect } from "react";

const SYNC_KEY = "stockstar_news_updated";

/** Signal other tabs/pages that news was refreshed */
export function notifyNewsUpdate() {
  localStorage.setItem(SYNC_KEY, Date.now().toString());
}

/** Listen for news updates from other pages and call onUpdate */
export function useNewsSync(onUpdate: () => void) {
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === SYNC_KEY) {
        onUpdate();
      }
    }
    // Also listen within same tab via custom event
    function handleCustom() {
      onUpdate();
    }
    window.addEventListener("storage", handleStorage);
    window.addEventListener("stockstar-news-updated", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("stockstar-news-updated", handleCustom);
    };
  }, [onUpdate]);
}

/** Notify both cross-tab and same-tab listeners */
export function broadcastNewsUpdate() {
  notifyNewsUpdate();
  window.dispatchEvent(new Event("stockstar-news-updated"));
}
