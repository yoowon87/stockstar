import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "./_shared";
import {
  getCalendar,
  getCalendarNote,
  listCalendarNotes,
  monthStartEnd,
  saveCalendarNote,
  type CalendarDay,
} from "../services/themeApi";

export function ThemeCalendarPage() {
  const navigate = useNavigate();
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth());
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [noteDates, setNoteDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  function reload() {
    setLoading(true);
    const { start, end } = monthStartEnd(year, month);
    Promise.all([
      getCalendar(start, end).then((r) => setDays(r.days)).catch(() => setDays([])),
      listCalendarNotes(start, end)
        .then((r) => setNoteDates(new Set(r.notes.map((n) => n.date))))
        .catch(() => setNoteDates(new Set())),
    ]).finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    setSelectedDate(null);
  }, [year, month]);

  const cells = useMemo(
    () => buildMonthGrid(year, month, days, noteDates),
    [year, month, days, noteDates],
  );

  const selectedDay = days.find((d) => d.date === selectedDate);

  function navMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setYear(y);
    setMonth(m);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <PageHeader
        eyebrow="📅 THEME CALENDAR"
        title={`${year}년 ${month + 1}월`}
        subtitle="셀 클릭 시 우측에서 그날 1위 테마 + 메모 입력"
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

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="calendar-layout">
          {/* Left: month grid */}
          <div>
            {loading && (
              <div style={{ color: "var(--text-muted)", fontFamily: "Outfit", fontSize: 13, marginBottom: 8 }}>
                불러오는 중…
              </div>
            )}
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
          </div>

          {/* Right: note panel */}
          <NotePanel
            selectedDate={selectedDate}
            day={selectedDay ?? null}
            onViewFullDay={(date) => navigate(`/theme-history/${date}`)}
            onNoteSaved={() => {
              if (selectedDate) {
                setNoteDates((prev) => {
                  const next = new Set(prev);
                  next.add(selectedDate);
                  return next;
                });
              }
            }}
            onNoteCleared={() => {
              if (selectedDate) {
                setNoteDates((prev) => {
                  const next = new Set(prev);
                  next.delete(selectedDate);
                  return next;
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface Cell {
  date: string;
  dayNum: number;
  day: CalendarDay | null;
  hasNote: boolean;
}

function buildMonthGrid(
  year: number,
  month: number,
  days: CalendarDay[],
  noteDates: Set<string>,
): (Cell | null)[] {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
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
      hasNote: noteDates.has(dateStr),
    });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DayCell({
  cell,
  isSelected,
  onClick,
}: {
  cell: Cell | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  if (!cell) return <div style={{ aspectRatio: "1 / 1" }} />;
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
        cursor: "pointer",
        display: "flex",
        flexDirection: "column" as const,
        justifyContent: "space-between",
        textAlign: "left" as const,
        opacity: cell.day ? 1 : 0.45,
        position: "relative" as const,
      }}
    >
      <div className="flex items-center justify-between">
        <span
          style={{
            fontFamily: "Outfit",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--text-secondary)",
          }}
        >
          {cell.dayNum}
        </span>
        {cell.hasNote && (
          <span style={{ fontSize: 10 }} title="메모 있음">📝</span>
        )}
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

function NotePanel({
  selectedDate,
  day,
  onViewFullDay,
  onNoteSaved,
  onNoteCleared,
}: {
  selectedDate: string | null;
  day: CalendarDay | null;
  onViewFullDay: (date: string) => void;
  onNoteSaved: () => void;
  onNoteCleared: () => void;
}) {
  const [note, setNote] = useState("");
  const [originalNote, setOriginalNote] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedDate) {
      setNote("");
      setOriginalNote("");
      setUpdatedAt(null);
      return;
    }
    setLoading(true);
    setError("");
    setSavedFlash(false);
    getCalendarNote(selectedDate)
      .then((n) => {
        setNote(n.note);
        setOriginalNote(n.note);
        setUpdatedAt(n.updated_at);
      })
      .catch(() => {
        setNote("");
        setOriginalNote("");
        setUpdatedAt(null);
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  async function handleSave() {
    if (!selectedDate) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveCalendarNote(selectedDate, note);
      setUpdatedAt(saved.updated_at);
      setOriginalNote(saved.note);
      setSavedFlash(true);
      window.setTimeout(() => setSavedFlash(false), 2000);
      if (saved.note.trim()) onNoteSaved();
      else onNoteCleared();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  if (!selectedDate) {
    return (
      <div
        style={{
          padding: 20,
          borderRadius: 12,
          background: "rgba(18, 20, 28, 0.4)",
          border: "1px dashed var(--border-default)",
          fontFamily: "DM Sans",
          fontSize: 12,
          color: "var(--text-muted)",
          lineHeight: 1.6,
          height: "fit-content",
        }}
      >
        ← 좌측 달력의 셀을 클릭하면 이 자리에 그날 1위 테마와 메모 입력란이 나타납니다.
      </div>
    );
  }

  const dirty = note !== originalNote;

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 12,
        background: "rgba(18, 20, 28, 0.6)",
        border: "1px solid var(--border-default)",
        display: "flex",
        flexDirection: "column" as const,
        gap: 12,
        height: "fit-content",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 13, color: "var(--gold-bright)", letterSpacing: "0.1em" }}>
          📌 {selectedDate}
        </div>
        {day && (
          <button onClick={() => onViewFullDay(selectedDate)} style={{ ...navBtn, color: "var(--blue)" }}>
            전체 복기 →
          </button>
        )}
      </div>

      {day ? (
        <div>
          <div style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.15em" }}>
            그날 1위 테마
          </div>
          <div className="flex items-baseline gap-2 flex-wrap mt-1">
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>
              {day.theme_name}
            </span>
            <span style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--gold)" }}>{day.theme_code}</span>
            <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 16, color: day.score >= 0.6 ? "var(--up)" : "var(--text-secondary)" }}>
              {day.score.toFixed(2)}
            </span>
            {day.is_confirmed && (
              <span
                style={{
                  fontFamily: "Outfit",
                  fontSize: 9,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: "rgba(56, 217, 169, 0.15)",
                  border: "1px solid rgba(56, 217, 169, 0.4)",
                  color: "var(--up)",
                }}
              >
                ✅
              </span>
            )}
          </div>
          {day.leader_name && (
            <div style={{ fontFamily: "DM Sans", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              대장주 <b style={{ color: "var(--text-primary)" }}>{day.leader_name}</b>{" "}
              <span style={{ color: day.leader_change >= 0 ? "var(--up)" : "var(--down)" }}>
                {day.leader_change >= 0 ? "+" : ""}
                {day.leader_change.toFixed(2)}%
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)" }}>
          이 날짜의 daily snapshot은 없습니다 (장 마감 기록 없음).
        </div>
      )}

      <div>
        <div style={{ fontFamily: "Outfit", fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.15em", marginBottom: 4 }}>
          📝 메모
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="이날 시장에 대한 생각, 매매 결정 근거, 복기 등"
          rows={6}
          disabled={loading}
          style={{
            width: "100%",
            fontFamily: "DM Sans",
            fontSize: 13,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(8, 9, 13, 0.6)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            resize: "vertical",
            outline: "none",
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
          {updatedAt
            ? `마지막 저장: ${new Date(updatedAt).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })}`
            : "(아직 저장 안 됨)"}
        </div>
        <div className="flex items-center gap-2">
          {savedFlash && <span style={{ color: "var(--up)", fontFamily: "Outfit", fontSize: 11 }}>✓ 저장</span>}
          {error && <span style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 11 }}>{error}</span>}
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{
              fontFamily: "Outfit",
              fontSize: 11,
              fontWeight: 700,
              padding: "6px 14px",
              borderRadius: 8,
              background: dirty
                ? "linear-gradient(135deg, var(--gold), var(--gold-bright))"
                : "rgba(255,255,255,0.04)",
              color: dirty ? "var(--bg-deep)" : "var(--text-muted)",
              border: dirty ? "none" : "1px solid var(--border-subtle)",
              cursor: dirty ? "pointer" : "default",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend() {
  const stops = [0.1, 0.3, 0.5, 0.7, 0.9];
  return (
    <div className="flex items-center gap-2 mt-4 flex-wrap" style={{ fontFamily: "Outfit", fontSize: 10, color: "var(--text-muted)" }}>
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
        ✅ 강세 컨펌
      </span>
      <span style={{ marginLeft: 8 }}>📝 메모 있음</span>
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
