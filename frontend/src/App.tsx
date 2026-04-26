import { useEffect, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";

import { HomePage } from "./pages/HomePage";
import { NewsPage } from "./pages/NewsPage";
import { NewsHubPage } from "./pages/NewsHubPage";
import { NoteListPage } from "./pages/NoteListPage";
import { NoteNewPage } from "./pages/NoteNewPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { JournalPage } from "./pages/JournalPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { EdgePage } from "./pages/EdgePage";
import { ReviewPage } from "./pages/ReviewPage";
import { ThemeRadarPage } from "./pages/ThemeRadarPage";
import { ThemeCalendarPage } from "./pages/ThemeCalendarPage";
import { ThemeDetailPage } from "./pages/ThemeDetailPage";
import { ThemeHistoryPage } from "./pages/ThemeHistoryPage";
import { ThemeAdminPage } from "./pages/ThemeAdminPage";
import { fetchMarketIndicators } from "./services/backendApi";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const navItems = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/theme-radar", label: "Radar", icon: "radar", accent: true },
  { to: "/news", label: "News", icon: "news" },
  { to: "/notes", label: "Vault", icon: "vault" },
  { to: "/journal", label: "Journal", icon: "journal" },
  { to: "/portfolio", label: "Portfolio", icon: "pie" },
  { to: "/edge", label: "Edge", icon: "target" },
  { to: "/review", label: "Review", icon: "calendar" },
];

function NavIcon({ type, size = 14 }: { type: string; size?: number }) {
  const s = size;
  switch (type) {
    case "home":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 7 L8 2 L14 7 V13 a1 1 0 0 1 -1 1 H3 a1 1 0 0 1 -1 -1 Z" />
          <path d="M6.5 14 V10 h3 V14" />
        </svg>
      );
    case "journal":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="2" width="10" height="12" rx="1.2" />
          <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
          <line x1="5.5" y1="8" x2="10.5" y2="8" />
          <line x1="5.5" y1="10.5" x2="9" y2="10.5" />
        </svg>
      );
    case "pie":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 2 V8 H14" />
        </svg>
      );
    case "target":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <circle cx="8" cy="8" r="3" />
          <circle cx="8" cy="8" r="0.6" fill="currentColor" />
        </svg>
      );
    case "calendar":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="11" rx="1.2" />
          <line x1="2" y1="6.5" x2="14" y2="6.5" />
          <line x1="5" y1="1.5" x2="5" y2="4" />
          <line x1="11" y1="1.5" x2="11" y2="4" />
          <polyline points="5.8,10.5 7.2,11.8 10.2,9" />
        </svg>
      );
    case "radar":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <circle cx="8" cy="8" r="6.5" strokeDasharray="2 2" />
          <circle cx="8" cy="8" r="3.5" strokeDasharray="2 2" />
          <line x1="8" y1="8" x2="13" y2="4" />
          <circle cx="8" cy="8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "news":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="12" height="12" rx="1.5" />
          <line x1="4.5" y1="5" x2="11.5" y2="5" />
          <line x1="4.5" y1="8" x2="11.5" y2="8" />
          <line x1="4.5" y1="11" x2="9" y2="11" />
        </svg>
      );
    case "vault":
      return (
        <svg width={s} height={s} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="12" height="11" rx="1.2" />
          <path d="M5 6 h6" />
          <path d="M5 9 h4" />
          <circle cx="11" cy="9" r="1.2" />
          <path d="M11 7.5 v0.3 M11 10.5 v0.3 M9.5 9 h0.3 M12.5 9 h0.3" strokeWidth="1" />
        </svg>
      );
    default:
      return null;
  }
}

export default function App() {
  const location = useLocation();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [tickers, setTickers] = useState<Array<{ label: string; value: string; change: string }>>([]);
  const [tickerLoading, setTickerLoading] = useState(false);

  useEffect(() => {
    setTickerLoading(true);
    fetchMarketIndicators()
      .then((data) => {
        if (data.length > 0) setTickers(data);
      })
      .catch(() => {})
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
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      {/* ── Premium Header ── */}
      <header
        className="flex items-center justify-between px-5 py-2 flex-shrink-0"
        style={{
          background: "rgba(12, 14, 20, 0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
                boxShadow: "0 2px 8px rgba(212, 165, 116, 0.3)",
              }}
            >
              <span className="text-[10px] font-black" style={{ color: "var(--bg-deep)", fontFamily: "Outfit" }}>S</span>
            </div>
            <span
              className="text-sm font-bold tracking-tight"
              style={{ fontFamily: "Outfit", color: "var(--text-primary)" }}
            >
              Stock<span style={{ color: "var(--gold)" }}>Star</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all duration-200 font-medium ${
                    isActive
                      ? ""
                      : ""
                  }`
                }
                style={({ isActive }) => ({
                  fontFamily: "Outfit",
                  color: isActive ? "var(--gold-bright)" : "var(--text-secondary)",
                  background: isActive ? "rgba(212, 165, 116, 0.1)" : "transparent",
                  border: isActive
                    ? "1px solid rgba(212, 165, 116, 0.2)"
                    : "1px solid transparent",
                })}
              >
                <NavIcon type={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Market Tickers */}
        {tickers.length > 0 && (
          <div className="hidden sm:flex items-center gap-4">
            {tickers.map((t) => (
              <div key={t.label} className="flex items-center gap-1.5 market-ticker">
                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{t.label}</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{t.value}</span>
                <span
                  style={{
                    color: t.change.startsWith("-") ? "var(--down)" : "var(--up)",
                    fontWeight: 600,
                  }}
                >
                  {t.change}
                </span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Update/Install Banner ── */}
      {(installPrompt || waitingWorker) && (
        <div
          className="flex items-center justify-between px-5 py-2 text-sm flex-shrink-0"
          style={{
            background: "rgba(212, 165, 116, 0.08)",
            borderBottom: "1px solid rgba(212, 165, 116, 0.15)",
          }}
        >
          <span style={{ color: "var(--gold-bright)", fontFamily: "DM Sans" }}>
            {waitingWorker ? "새 버전이 준비됐습니다." : "홈 화면에 앱을 설치할 수 있습니다."}
          </span>
          {waitingWorker ? (
            <button
              onClick={handleApplyUpdate}
              className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
                color: "var(--bg-deep)",
                fontFamily: "Outfit",
              }}
            >
              업데이트 적용
            </button>
          ) : (
            <button
              onClick={handleInstallApp}
              className="text-xs px-3 py-1 rounded-lg font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
                color: "var(--bg-deep)",
                fontFamily: "Outfit",
              }}
            >
              설치
            </button>
          )}
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/edge" element={<EdgePage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/news" element={<NewsHubPage />} />
          <Route path="/news/:newsId" element={<NewsPage />} />
          <Route path="/notes" element={<NoteListPage />} />
          <Route path="/notes/new" element={<NoteNewPage />} />
          <Route path="/notes/:id" element={<NoteDetailPage />} />
          <Route path="/theme-radar" element={<ThemeRadarPage />} />
          <Route path="/theme-calendar" element={<ThemeCalendarPage />} />
          <Route path="/theme-detail/:code" element={<ThemeDetailPage />} />
          <Route path="/theme-history/:date" element={<ThemeHistoryPage />} />
          <Route path="/theme-admin" element={<ThemeAdminPage />} />
        </Routes>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="sm:hidden flex flex-shrink-0"
        style={{
          background: "rgba(8, 9, 13, 0.96)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        {navItems.map((item) => {
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors"
              style={{
                color: isActive ? "var(--gold)" : "var(--text-muted)",
                fontFamily: "Outfit",
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <NavIcon type={item.icon} size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
