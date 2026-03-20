import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import { NewsPage } from "./pages/NewsPage";
import { StockPage } from "./pages/StockPage";
import { StockDetailPage } from "./pages/StockDetailPage";
import { getDashboard } from "./services/api";
import { fetchMarketIndicators } from "./services/backendApi";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const navItems = [
  { to: "/", label: "🌍 Home", end: true },
  { to: "/news", label: "📰 News" },
  { to: "/stocks", label: "📈 Stock" },
];

export default function App() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [tickers, setTickers] = useState<Array<{ label: string; value: string; change: string }>>([]);

  const [tickerLoading, setTickerLoading] = useState(false);

  useEffect(() => {
    // Try real market data from backend first, fallback to Firebase mock
    setTickerLoading(true);
    fetchMarketIndicators()
      .then((data) => {
        if (data.length > 0) {
          setTickers(data);
        } else {
          return getDashboard().then((d) => setTickers(d.market_indicators ?? []));
        }
      })
      .finally(() => setTickerLoading(false));
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    function handleUpdateReady(event: Event) {
      setWaitingWorker((event as CustomEvent<ServiceWorker>).detail);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("stockstar-update-ready", handleUpdateReady as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("stockstar-update-ready", handleUpdateReady as EventListener);
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function handleApplyUpdate() {
    if (!waitingWorker) return;
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* 상단 네비게이션 */}
      <header className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white tracking-tight">StockStar</span>
          <nav className="flex gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {tickers.length > 0 && (
          <div className="hidden sm:flex items-center gap-3">
            {tickers.map((t) => (
              <div key={t.label} className="flex items-center gap-1 market-ticker">
                <span className="text-slate-500">{t.label}</span>
                <span className="text-slate-200">{t.value}</span>
                <span className={t.change.startsWith('-') ? 'text-red-400' : 'text-green-400'}>{t.change}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* 업데이트/설치 배너 */}
      {(installPrompt || waitingWorker) && (
        <div className="flex items-center justify-between px-5 py-2 bg-blue-900/60 border-b border-blue-700/40 text-sm flex-shrink-0">
          <span className="text-blue-200">
            {waitingWorker ? "새 버전이 준비됐습니다." : "홈 화면에 앱을 설치할 수 있습니다."}
          </span>
          {waitingWorker ? (
            <button onClick={handleApplyUpdate} className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 text-white">
              업데이트 적용
            </button>
          ) : (
            <button onClick={handleInstallApp} className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-400 text-white">
              설치
            </button>
          )}
        </div>
      )}

      {/* 메인 콘텐츠 (남은 공간 모두 차지) */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:newsId" element={<NewsPage />} />
          <Route path="/stocks" element={<StockPage />} />
          <Route path="/stocks/:symbol" element={<StockDetailPage />} />
        </Routes>
      </main>

      {/* 모바일 하단 네비게이션 */}
      <nav className="sm:hidden flex border-t border-slate-800 bg-slate-900 flex-shrink-0">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex-1 text-center py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-blue-400" : "text-slate-500"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
