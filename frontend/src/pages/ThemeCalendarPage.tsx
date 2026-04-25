import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  getCalendar,
  monthStartEnd,
  type CalendarDay,
} from "../services/themeApi";

export function ThemeCalendarPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth()); // 0-indexed
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const { start, end } = monthStartEnd(year, month);
    getCalendar(start, end)
      .then((r) => setDays(r.days))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [year, month]);

  const cells = useMemo(() => buildMonthGrid(year, month, days), [year, month, days]);
  const selected = days.find((d) => d.date === selectedDate);

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setYear(y);
    setMonth(m);
    setSelectedDate(null);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="📅 THEME CALENDAR"
        title={`${year}년 ${month + 1}월`}
        subtitle="셀 색상 강도 = 그날 1위 테마 점수 · 클릭 시 상세"
        right={
          <div className="flex items-center gap-2">
            <button onClick={() => navMonth(-1)} style={navBtn}>‹ 이전</button>
            <button onClick={() => { setYear(new Date().getFullYear()); setMonth(new Date().getMonth()); }} style={navBtn}>
              오늘
            </button>
            <button onClick={() => navMonth(1)} style={navBtn}>다음 ›</button>
            <button onClick={() => navigate("/theme-radar")} style={{ ...navBtn, color: "var(--gold-bright)" }}>
              🔥 Radar
            </button>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6 max-w-4xl mx-auto w-full">
        {loading && <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13 }}>불러오는 중…</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            marginBottom: 8,
          }}
        >
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center" as const,
                fontFamily: "Outfit",
                fontSize: 10,
                fontWeight: 700,
                color: "var(--text-muted)",
                padding: 4,
                letterSpacing: "0.1em",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {cells.map((cell, i) => (
            <DayCell
              key={i}
              cell={cell}
              isSelected={cell?.date === selectedDate}
              onClick={() => cell && setSelectedDate(cell.date)}
            />
          ))}
        </div>

        <Legend />

        {selected && (
          <DayDetailDrawer day={selected} onViewFullDay={() => navigate(`/theme-history/${selected.date}`)} />
        )}
      </div>
    </div>
  );
}

interface Cell {
  date: string;
  dayNum: number;
  day: CalendarDay | null;
  isOtherMonth: boolean;
}

function buildMonthGrid(year: number, month: number, days: CalendarDay[]): (Cell | null)[] {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=Sun
  const lastOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastOfMonth.getDate();

  const cells: (Cell | null)[] = [];

  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      date: dateStr,
      dayNum: d,
      day: dayMap.get(dateStr) ?? null,
      isOtherMonth: false,
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

function DayCell({ cell, isSelected, onClick }: { cell: Cell | null; isSelected: boolean; onClick: () => void }) {
  if (!cell) {
    return <div style={{ aspectRatio: "1 / 1" }} />;
  }
  const intensity = cell.day ? Math.min(cell.day.score, 1.0) : 0;
  const bg = cell.day
    ? `rgba(212, 165, 116, ${0.08 + intensity * 0.5})`
    : "rgba(255,255,255,0.02)";
  const border = isSelected
    ? "2px solid var(--gold-bright)"
    : cell.day?.is_confirmed
      ? "1px solid rgba(56, 217, 169, 0.45)"
      : "1px solid var(--border-subtle)";

  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: "1 / 1",
        padding: 6,
        borderRadius: 8,
        background: bg,
        border,
        cursor: cell.day ? "pointer" : "default",
        display: "flex",
        flexDirection: "column" as const,
        alignItems: "stretch",
        justifyContent: "space-between",
        textAlign: "left" as const,
        opacity: cell.day ? 1 : 0.45,
      }}
    >
      <div
        style={{
          fontFamily: "Outfit",
          fontSize: 10,
          fontWeight: 700,
          color: "var(--text-secondary)",
        }}
      >
        {cell.dayNum}
      </div>
      {cell.day && (
        <>
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 9,
              fontWeight: 700,
              color: "var(--gold-bright)",
              letterSpacing: "0.05em",
            }}
          >
            {cell.day.theme_code}
          </div>
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 9,
              color: "var(--text-muted)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {cell.day.theme_name}
          </div>
          <div
            style={{
              fontFamily: "Outfit",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-primary)",
              textAlign: "right" as const,
            }}
          >
            {cell.day.score.toFixed(2)}
          </div>
        </>
      )}
    </button>
  );
}

function Legend() {
  const stops = [0.1, 0.3, 0.5, 0.7, 0.9];
  return (
    <div className="flex items-center gap-2 mt-4" style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
      <span>강도:</span>
      {stops.map((s) => (
        <div
          key={s}
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            background: `rgba(212, 165, 116, ${0.08 + s * 0.5})`,
            border: "1px solid var(--border-subtle)",
          }}
        />
      ))}
      <span>약 → 강</span>
      <span style={{ marginLeft: 12 }}>
        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "transparent", border: "2px solid rgba(56, 217, 169, 0.7)", marginRight: 4 }} />
        ✅ 트리플 컨펌
      </span>
    </div>
  );
}

function DayDetailDrawer({ day, onViewFullDay }: { day: CalendarDay; onViewFullDay: () => void }) {
  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        background: "rgba(18, 20, 28, 0.6)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div
          style={{
            fontFamily: "Outfit",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--gold-bright)",
            letterSpacing: "0.1em",
          }}
        >
          📌 {day.date} 1위 테마
        </div>
        <button onClick={onViewFullDay} style={{ ...navBtn, color: "var(--blue)" }}>
          전체 복기 →
        </button>
      </div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>
          {day.theme_name}
        </span>
        <span style={{ fontFamily: "Outfit", fontSize: 11, color: "var(--gold)" }}>{day.theme_code}</span>
        <span
          style={{
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 18,
            color: day.score >= 0.6 ? "var(--up)" : "var(--text-secondary)",
          }}
        >
          {day.score.toFixed(2)}
        </span>
        {day.is_confirmed && (
          <span
            style={{
              fontFamily: "Outfit",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(56, 217, 169, 0.15)",
              border: "1px solid rgba(56, 217, 169, 0.45)",
              color: "var(--up)",
            }}
          >
            ✅ 컨펌
          </span>
        )}
      </div>
      {day.leader_name && (
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
          대장주: <b style={{ color: "var(--text-primary)" }}>{day.leader_name}</b>{" "}
          {day.leader_change >= 0 ? "+" : ""}
          {day.leader_change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = {
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
