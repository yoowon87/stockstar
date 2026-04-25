import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import { StockChartModal } from "../components/StockChartModal";
import {
  formatKoreanAmount,
  getRadar,
  type RadarTheme,
  type ThemeStock,
} from "../services/themeApi";

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const CATEGORY_LABELS: Record<string, string> = {
  A: "반도체/AI",
  B: "AI/SW/로봇",
  C: "에너지/방산",
  D: "소재/조선",
  E: "금융/바이오",
};

export function ThemeRadarPage() {
  const navigate = useNavigate();
  const [themes, setThemes] = useState<RadarTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [topN, setTopN] = useState<number>(100);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);

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

  const visible = useMemo(
    () => (categoryFilter === "ALL" ? themes : themes.filter((t) => t.category === categoryFilter)),
    [themes, categoryFilter],
  );

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAllExpanded(open: boolean) {
    if (open) setExpandedIds(new Set(visible.map((t) => t.theme_id)));
    else setExpandedIds(new Set());
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="🔥 THEME RADAR"
        title="실시간 주도 테마"
        subtitle="5분마다 자동 갱신 · 강세 컨펌 = 평균 +1.5%↑ · 동반상승 60%↑ · 거래대금 1천억↑"
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={100}>전체 (37)</option>
              <option value={20}>TOP 20</option>
              <option value={10}>TOP 10</option>
              <option value={5}>TOP 5</option>
              <option value={3}>TOP 3</option>
            </select>
            <button onClick={() => navigate("/theme-calendar")} style={btnSecondaryStyle}>📅 캘린더</button>
            <button onClick={() => navigate("/theme-admin")} style={btnSecondaryStyle}>⚙️ 관리</button>
            <button onClick={reload} style={btnPrimaryStyle}>새로고침</button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <CategoryChip code="ALL" label="전체" active={categoryFilter === "ALL"} onClick={() => setCategoryFilter("ALL")} />
            {Object.entries(CATEGORY_LABELS).map(([code, label]) => (
              <CategoryChip
                key={code}
                code={code}
                label={`${code}. ${label}`}
                active={categoryFilter === code}
                onClick={() => setCategoryFilter(code)}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAllExpanded(true)} style={mutedBtn}>모두 펼침</button>
            <button onClick={() => setAllExpanded(false)} style={mutedBtn}>모두 접기</button>
          </div>
        </div>

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
            {lastUpdate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} ·{" "}
            {visible.length}개 표시
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

        {visible.length === 0 && !loading && !error && <EmptyState />}

        {visible.map((t, idx) => (
          <ThemeCard
            key={t.theme_id}
            theme={t}
            rank={categoryFilter === "ALL" ? idx + 1 : t.rank ?? idx + 1}
            expanded={expandedIds.has(t.theme_id)}
            onToggle={() => toggle(t.theme_id)}
            onSelectStock={(code, name) => setSelectedStock({ code, name })}
          />
        ))}
      </div>

      {selectedStock && (
        <StockChartModal
          stockCode={selectedStock.code}
          stockName={selectedStock.name}
          onClose={() => setSelectedStock(null)}
        />
      )}
    </div>
  );
}

function ThemeCard({
  theme,
  rank,
  expanded,
  onToggle,
  onSelectStock,
}: {
  theme: RadarTheme;
  rank: number;
  expanded: boolean;
  onToggle: () => void;
  onSelectStock: (code: string, name: string) => void;
}) {
  const navigate = useNavigate();
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const sortedStocks = [...theme.stocks].sort((a, b) => b.trade_amount - a.trade_amount);

  return (
    <div
      style={{
        borderRadius: 12,
        background: theme.is_confirmed
          ? "linear-gradient(135deg, rgba(56, 217, 169, 0.06), rgba(18, 20, 28, 0.6))"
          : "rgba(18, 20, 28, 0.6)",
        border: theme.is_confirmed
          ? "1px solid rgba(56, 217, 169, 0.35)"
          : "1px solid var(--border-default)",
        overflow: "hidden",
      }}
    >
      <button
        onClick={onToggle}
        className="w-full"
        style={{
          padding: "12px 16px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left" as const,
        }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span style={{ fontSize: 18, minWidth: 30 }}>{medal}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/theme-detail/${theme.code}`);
              }}
              style={{
                fontFamily: "Outfit",
                fontWeight: 700,
                fontSize: 15,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {theme.name}
            </span>
            <span
              style={{
                fontFamily: "Outfit",
                fontSize: 9,
                fontWeight: 600,
                color: "var(--gold)",
                background: "rgba(212, 165, 116, 0.08)",
                padding: "2px 6px",
                borderRadius: 4,
                letterSpacing: "0.05em",
              }}
            >
              {theme.code}
            </span>
            <ConfirmBadge confirmed={theme.is_confirmed} />
          </div>
          <div className="flex items-center gap-4">
            <InlineMetric label="거래대금" value={formatKoreanAmount(theme.total_amount)} />
            <InlineMetric
              label="평균"
              value={`${theme.avg_change >= 0 ? "+" : ""}${theme.avg_change.toFixed(2)}%`}
              color={theme.avg_change >= 0 ? "var(--up)" : "var(--down)"}
            />
            <InlineMetric
              label="동반상승"
              value={`${(theme.rising_ratio * 100).toFixed(0)}%`}
              color={theme.rising_ratio >= 0.6 ? "var(--up)" : "var(--text-secondary)"}
            />
            <div style={{ textAlign: "right" as const, minWidth: 50 }}>
              <div style={{ fontFamily: "Outfit", fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                점수
              </div>
              <div
                style={{
                  fontFamily: "Outfit",
                  fontWeight: 800,
                  fontSize: 18,
                  color: scoreColor(theme.score),
                  lineHeight: 1,
                }}
              >
                {theme.score.toFixed(2)}
              </div>
            </div>
            <span style={{ fontFamily: "Outfit", fontSize: 12, color: "var(--text-muted)" }}>
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
        {!expanded && theme.leader_name && (
          <div
            style={{
              marginTop: 6,
              fontFamily: "DM Sans",
              fontSize: 11,
              color: "var(--text-muted)",
              paddingLeft: 38,
            }}
          >
            대장주 <b style={{ color: "var(--gold-bright)" }}>{theme.leader_name}</b>{" "}
            <span style={{ color: theme.leader_change >= 0 ? "var(--up)" : "var(--down)" }}>
              {theme.leader_change >= 0 ? "+" : ""}
              {theme.leader_change.toFixed(2)}%
            </span>
          </div>
        )}
      </button>

      {expanded && sortedStocks.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <StockTable
            stocks={sortedStocks}
            leaderCode={theme.leader_code}
            onSelectStock={onSelectStock}
          />
        </div>
      )}
    </div>
  );
}

function StockTable({
  stocks,
  leaderCode,
  onSelectStock,
}: {
  stocks: ThemeStock[];
  leaderCode: string | null;
  onSelectStock: (code: string, name: string) => void;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "DM Sans", fontSize: 12 }}>
        <thead>
          <tr style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 10, letterSpacing: "0.08em" }}>
            <Th align="left">종목 (클릭 → 일봉 차트)</Th>
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
              <tr
                key={s.code}
                onClick={() => onSelectStock(s.code, s.name)}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212, 165, 116, 0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
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

function CategoryChip({
  code,
  label,
  active,
  onClick,
}: {
  code: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "Outfit",
        fontSize: 11,
        fontWeight: 700,
        padding: "5px 12px",
        borderRadius: 999,
        background: active ? "rgba(212, 165, 116, 0.15)" : "rgba(255,255,255,0.02)",
        border: active ? "1px solid rgba(212, 165, 116, 0.5)" : "1px solid var(--border-subtle)",
        color: active ? "var(--gold-bright)" : "var(--text-secondary)",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ConfirmBadge({ confirmed }: { confirmed: boolean }) {
  if (confirmed) {
    return (
      <span
        style={{
          fontFamily: "Outfit",
          fontSize: 9,
          fontWeight: 700,
          padding: "2px 8px",
          borderRadius: 999,
          background: "rgba(56, 217, 169, 0.15)",
          border: "1px solid rgba(56, 217, 169, 0.5)",
          color: "var(--up)",
          letterSpacing: "0.05em",
        }}
      >
        ✅ 강세
      </span>
    );
  }
  return null;
}

function InlineMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div style={{ textAlign: "right" as const, minWidth: 70 }}>
      <div style={{ fontFamily: "Outfit", fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "Outfit",
          fontWeight: 700,
          fontSize: 12,
          color: color ?? "var(--text-primary)",
          lineHeight: 1.2,
        }}
      >
        {value}
      </div>
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
      해당 카테고리에 표시할 테마가 없습니다.
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 11,
  padding: "6px 10px",
  borderRadius: 8,
  background: "rgba(18, 20, 28, 0.6)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
};

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

const mutedBtn: React.CSSProperties = {
  fontFamily: "Outfit",
  fontSize: 10,
  fontWeight: 600,
  padding: "4px 10px",
  borderRadius: 6,
  background: "transparent",
  border: "1px solid var(--border-subtle)",
  color: "var(--text-muted)",
  cursor: "pointer",
};
