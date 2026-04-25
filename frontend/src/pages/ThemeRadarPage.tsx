import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  formatKoreanAmount,
  getRadar,
  type RadarTheme,
  type ThemeStock,
  type ThemeNewsItem,
} from "../services/themeApi";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export function ThemeRadarPage() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<RadarTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [topN, setTopN] = useState(5);

  function reload() {
    setError("");
    getRadar(topN)
      .then((r) => {
        setThemes(r.themes);
        setLastUpdate(new Date());
      })
      .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    const id = window.setInterval(reload, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [topN]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="🔥 THEME RADAR"
        title="실시간 주도 테마 TOP"
        subtitle="5분마다 자동 갱신 · 트리플 컨펌 = 점수 + 대장주 + 뉴스"
        right={
          <div className="flex items-center gap-2">
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              style={{
                fontFamily: "Outfit",
                fontSize: 11,
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(18, 20, 28, 0.6)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <option value={3}>TOP 3</option>
              <option value={5}>TOP 5</option>
              <option value={10}>TOP 10</option>
            </select>
            <button
              onClick={() => navigate("/theme-calendar")}
              style={btnSecondaryStyle}
            >
              📅 캘린더
            </button>
            <button
              onClick={() => navigate("/theme-admin")}
              style={btnSecondaryStyle}
            >
              ⚙️ 관리
            </button>
            <button onClick={reload} style={btnPrimaryStyle}>
              새로고침
            </button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-4">
        {lastUpdate && (
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 11,
              color: "var(--text-muted)",
              textAlign: "right" as const,
            }}
          >
            마지막 업데이트:{" "}
            {lastUpdate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
        )}

        {loading && themes.length === 0 && (
          <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>
            테마 점수 계산 중…
          </div>
        )}

        {error && (
          <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 13 }}>{error}</div>
        )}

        {themes.length === 0 && !loading && !error && (
          <EmptyState />
        )}

        {themes.map((t, idx) => (
          <ThemeCard key={t.theme_id} theme={t} rank={idx + 1} />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({ theme, rank }: { theme: RadarTheme; rank: number }) {
  const navigate = useNavigate();
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const sortedStocks = [...theme.stocks].sort((a, b) => b.trade_amount - a.trade_amount);

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: theme.is_confirmed
          ? "linear-gradient(135deg, rgba(56, 217, 169, 0.06), rgba(18, 20, 28, 0.6))"
          : "rgba(18, 20, 28, 0.6)",
        border: theme.is_confirmed
          ? "1px solid rgba(56, 217, 169, 0.35)"
          : "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <span style={{ fontSize: 22 }}>{medal}</span>
          <button
            onClick={() => navigate(`/theme-detail/${theme.code}`)}
            style={{
              fontFamily: "Outfit",
              fontWeight: 700,
              fontSize: 18,
              color: "var(--text-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {theme.name}
          </button>
          <span
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--gold)",
              background: "rgba(212, 165, 116, 0.08)",
              padding: "2px 8px",
              borderRadius: 6,
              letterSpacing: "0.05em",
            }}
          >
            {theme.code}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TripleConfirmBadge confirmed={theme.is_confirmed} />
          <div style={{ textAlign: "right" as const }}>
            <div style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
              점수
            </div>
            <div
              style={{
                fontFamily: "Outfit",
                fontWeight: 800,
                fontSize: 22,
                color: scoreColor(theme.score),
              }}
            >
              {theme.score.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      <div
        className="grid gap-3 mb-3"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
      >
        <Metric
          label="거래대금"
          value={formatKoreanAmount(theme.total_amount)}
          color="var(--text-primary)"
        />
        <Metric
          label="평균 등락"
          value={`${theme.avg_change >= 0 ? "+" : ""}${theme.avg_change.toFixed(2)}%`}
          color={theme.avg_change >= 0 ? "var(--up)" : "var(--down)"}
        />
        <Metric
          label="동반 상승"
          value={`${(theme.rising_ratio * 100).toFixed(0)}%`}
          color={theme.rising_ratio >= 0.6 ? "var(--up)" : "var(--text-secondary)"}
        />
        <Metric
          label="뉴스 24h"
          value={`${theme.news_count_24h}건`}
          color={theme.news_count_24h > 0 ? "var(--gold-bright)" : "var(--text-muted)"}
        />
      </div>

      {sortedStocks.length > 0 && <StockTable stocks={sortedStocks} leaderCode={theme.leader_code} />}

      {theme.news.length > 0 && (
        <div className="mt-3">
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 700,
              color: "var(--gold)",
              letterSpacing: "0.15em",
              marginBottom: 6,
            }}
          >
            📰 뉴스 {theme.news.length}건
          </div>
          <NewsList news={theme.news} />
        </div>
      )}
    </div>
  );
}

function StockTable({ stocks, leaderCode }: { stocks: ThemeStock[]; leaderCode: string | null }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Sans", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 10, letterSpacing: "0.08em" }}>
            <Th align="left">종목</Th>
            <Th align="right">현재가</Th>
            <Th align="right">등락</Th>
            <Th align="right">거래대금</Th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s) => {
            const isLeader = s.code === leaderCode;
            const changeColor = s.change_pct >= 0 ? "var(--up)" : "var(--down)";
            return (
              <tr key={s.code}>
                <td style={cellStyle(isLeader)}>
                  {isLeader && <span style={{ marginRight: 6, color: "var(--gold-bright)" }}>★</span>}
                  <span style={{ fontWeight: isLeader ? 700 : 500 }}>{s.name}</span>
                  <span style={{ marginLeft: 8, fontSize: 10, color: "var(--text-muted)" }}>{s.code}</span>
                </td>
                <td style={{ ...cellStyle(false), textAlign: "right" }}>
                  {s.price ? s.price.toLocaleString("ko-KR") : "—"}
                </td>
                <td style={{ ...cellStyle(false), textAlign: "right", color: changeColor, fontWeight: 600 }}>
                  {s.change_pct >= 0 ? "+" : ""}
                  {s.change_pct.toFixed(2)}%
                </td>
                <td style={{ ...cellStyle(false), textAlign: "right", color: "var(--text-secondary)" }}>
                  {formatKoreanAmount(s.trade_amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewsList({ news }: { news: ThemeNewsItem[] }) {
  return (
    <div className="space-y-1">
      {news.map((n, i) => (
        <a
          key={i}
          href={n.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            fontFamily: "DM Sans",
            fontSize: 12,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            textDecoration: "none",
            padding: "4px 0",
          }}
        >
          • {n.title}
          {n.source && <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>({n.source})</span>}
        </a>
      ))}
    </div>
  );
}

function TripleConfirmBadge({ confirmed }: { confirmed: boolean }) {
  if (confirmed) {
    return (
      <span
        style={{
          fontFamily: "Outfit",
          fontSize: 11,
          fontWeight: 700,
          padding: "4px 12px",
          borderRadius: 999,
          background: "rgba(56, 217, 169, 0.15)",
          border: "1px solid rgba(56, 217, 169, 0.5)",
          color: "var(--up)",
          letterSpacing: "0.05em",
        }}
      >
        ✅ 트리플 컨펌
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: "Outfit",
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 10px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border-subtle)",
        color: "var(--text-muted)",
        letterSpacing: "0.05em",
      }}
    >
      ⏳ 미컨펌
    </span>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 8,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align: "left" | "right" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "6px 8px",
        borderBottom: "1px solid var(--border-subtle)",
        fontWeight: 600,
      }}
    >
      {children}
    </th>
  );
}

function cellStyle(isLeader: boolean) {
  return {
    padding: "6px 8px",
    borderBottom: "1px solid var(--border-subtle)",
    color: isLeader ? "var(--gold-bright)" : "var(--text-primary)",
  };
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "var(--up)";
  if (score >= 0.6) return "var(--gold-bright)";
  if (score >= 0.4) return "var(--blue)";
  return "var(--text-secondary)";
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 40,
        borderRadius: 12,
        border: "1px dashed var(--border-default)",
        background: "rgba(212, 165, 116, 0.03)",
        textAlign: "center" as const,
        fontFamily: "DM Sans",
        fontSize: 13,
        color: "var(--text-muted)",
        lineHeight: 1.7,
      }}
    >
      아직 실시간 점수 데이터가 없습니다.
      <br />
      <span style={{ fontSize: 11 }}>
        cron이 처음 실행될 때까지 기다리거나, <code>/api/cron/poll-stocks</code> 와{" "}
        <code>/api/cron/score-themes</code>를 수동으로 호출하세요.
      </span>
    </div>
  );
}

const btnSecondaryStyle: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 600,
  padding: "6px 12px",
  borderRadius: 8,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid var(--border-default)",
  color: "var(--text-secondary)",
  cursor: "pointer",
};

const btnPrimaryStyle: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  fontWeight: 700,
  padding: "6px 14px",
  borderRadius: 8,
  background: "linear-gradient(135deg, var(--gold), var(--gold-bright))",
  color: "var(--bg-deep)",
  border: "none",
  cursor: "pointer",
};
