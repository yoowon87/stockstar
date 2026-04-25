import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "./_shared";
import { formatKoreanAmount, getHistory, type DailyTheme } from "../services/themeApi";

export function ThemeHistoryPage() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [themes, setThemes] = useState<DailyTheme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    getHistory(date, 20)
      .then((r) => setThemes(r.themes))
      .catch(() => setThemes([]))
      .finally(() => setLoading(false));
  }, [date]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow={`📜 ${date} 복기`}
        title="그날의 테마 랭킹"
        subtitle="장 마감 시점 daily snapshot 기준"
        right={
          <button onClick={() => navigate("/theme-calendar")} style={backBtn}>
            ← 캘린더
          </button>
        }
      />
      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-4xl mx-auto w-full space-y-3">
        {loading && <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>}
        {!loading && themes.length === 0 && (
          <div
            style={{
              padding: 32,
              borderRadius: 12,
              border: "1px dashed var(--border-default)",
              background: "rgba(212, 165, 116, 0.03)",
              textAlign: "center" as const,
              color: "var(--text-muted)",
              fontFamily: "DM Sans",
              fontSize: 13,
            }}
          >
            해당 날짜의 daily snapshot이 없습니다.
          </div>
        )}
        {themes.map((t) => (
          <div
            key={t.theme_code}
            style={{
              padding: 14,
              borderRadius: 10,
              background: t.is_confirmed
                ? "linear-gradient(135deg, rgba(56, 217, 169, 0.05), rgba(18,20,28,0.6))"
                : "rgba(18, 20, 28, 0.6)",
              border: t.is_confirmed
                ? "1px solid rgba(56, 217, 169, 0.3)"
                : "1px solid var(--border-default)",
            }}
          >
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: "Outfit",
                    fontWeight: 800,
                    fontSize: 18,
                    color: t.rank <= 3 ? "var(--gold-bright)" : "var(--text-secondary)",
                  }}
                >
                  #{t.rank}
                </span>
                <button
                  onClick={() => navigate(`/theme-detail/${t.theme_code}`)}
                  style={{
                    fontFamily: "Outfit",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text-primary)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {t.theme_name}
                </button>
                <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)" }}>{t.theme_code}</span>
                {t.is_confirmed && (
                  <span
                    style={{
                      fontFamily: "Outfit",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 999,
                      background: "rgba(56, 217, 169, 0.12)",
                      border: "1px solid rgba(56, 217, 169, 0.4)",
                      color: "var(--up)",
                    }}
                  >
                    ✅
                  </span>
                )}
              </div>
              <div style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 18, color: "var(--text-primary)" }}>
                {t.score.toFixed(2)}
              </div>
            </div>
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)" }}>
              거래대금 {formatKoreanAmount(t.total_amount)} · 평균{" "}
              <span style={{ color: t.avg_change >= 0 ? "var(--up)" : "var(--down)" }}>
                {t.avg_change >= 0 ? "+" : ""}
                {t.avg_change.toFixed(2)}%
              </span>{" "}
              · 동반상승 {(t.rising_ratio * 100).toFixed(0)}%
              {t.leader_name && (
                <>
                  {" · "}대장주 <b style={{ color: "var(--gold-bright)" }}>{t.leader_name}</b> {t.leader_change >= 0 ? "+" : ""}
                  {t.leader_change.toFixed(2)}%
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const backBtn: React.CSSProperties = {
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
