import { NavLink, Route, Routes } from "react-router-dom";

import { PortfolioSidebar } from "./components/layout/PortfolioSidebar";
import { portfolioSummary } from "./data/mockInvestmentData";
import { DashboardPage } from "./pages/DashboardPage";
import { NewsPage } from "./pages/NewsPage";
import { StockDetailPage } from "./pages/StockDetailPage";

const navItems = [
  { to: "/", label: "대시보드" },
  { to: "/news", label: "뉴스" },
  { to: "/stocks/000660.KS", label: "종목 상세" },
];

export default function App() {
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
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/news" element={<NewsPage />} />
            <Route path="/news/:newsId" element={<NewsPage />} />
            <Route path="/stocks/:symbol" element={<StockDetailPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
