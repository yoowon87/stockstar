import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";

import { PortfolioSidebar } from "./components/layout/PortfolioSidebar";
import { portfolioSummary } from "./data/mockInvestmentData";
import { DashboardPage } from "./pages/DashboardPage";
import { NewsPage } from "./pages/NewsPage";
import { StockDetailPage } from "./pages/StockDetailPage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const navItems = [
  { to: "/", label: "대시보드" },
  { to: "/news", label: "뉴스" },
  { to: "/stocks/000660.KS", label: "종목 상세" },
];

export default function App() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      const promptEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      setInstallPrompt(promptEvent);
    }

    function handleUpdateReady(event: Event) {
      const customEvent = event as CustomEvent<ServiceWorker>;
      setWaitingWorker(customEvent.detail);
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener(
      "stockstar-update-ready",
      handleUpdateReady as EventListener,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener(
        "stockstar-update-ready",
        handleUpdateReady as EventListener,
      );
    };
  }, []);

  async function handleInstallApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function handleApplyUpdate() {
    if (!waitingWorker) {
      return;
    }

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <div className="app-shell">
      <PortfolioSidebar portfolio={portfolioSummary} />
      <div className="workspace-shell">
        <header className="top-nav">
          <div>
            <p className="eyebrow">StockStar</p>
            <h2>개인 투자 리서치 대시보드</h2>
          </div>
          <nav className="nav-list nav-list-horizontal">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        {installPrompt || waitingWorker ? (
          <section className="app-banner">
            <div>
              <strong>
                {waitingWorker
                  ? "새 버전이 준비되었습니다."
                  : "홈 화면에 설치해서 앱처럼 사용할 수 있습니다."}
              </strong>
              <p className="muted">
                {waitingWorker
                  ? "업데이트를 적용하면 최신 화면과 캐시가 바로 반영됩니다."
                  : "PWA로 설치하면 어디서든 빠르게 열고 사용할 수 있습니다."}
              </p>
            </div>
            <div className="action-row">
              {installPrompt ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={handleInstallApp}
                >
                  앱 설치
                </button>
              ) : null}
              {waitingWorker ? (
                <button
                  className="primary-button"
                  type="button"
                  onClick={handleApplyUpdate}
                >
                  업데이트 적용
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:newsId" element={<NewsPage />} />
            <Route path="/stocks/:symbol" element={<StockDetailPage />} />
          </Routes>
        </main>

        <nav className="mobile-bottom-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "mobile-nav-link mobile-nav-link-active" : "mobile-nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
