import { useEffect, useState } from "react";
import { clearToken, getToken, setToken, verifyToken } from "./auth";

type Status = "checking" | "needs-password" | "ok";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("checking");
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const existing = getToken();
    if (!existing) {
      setStatus("needs-password");
      return;
    }
    verifyToken(existing).then((ok) => {
      if (ok) setStatus("ok");
      else {
        clearToken();
        setStatus("needs-password");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setSubmitting(true);
    setError("");
    const ok = await verifyToken(input.trim());
    if (ok) {
      setToken(input.trim());
      setStatus("ok");
    } else {
      setError("비밀번호가 일치하지 않습니다.");
    }
    setSubmitting(false);
  }

  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-deep)",
          color: "var(--text-muted)",
          fontFamily: "Outfit",
          fontSize: 13,
        }}
      >
        확인 중…
      </div>
    );
  }

  if (status === "needs-password") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-deep)",
          padding: 20,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            width: "100%",
            maxWidth: 360,
            padding: 28,
            borderRadius: 16,
            background: "rgba(18, 20, 28, 0.7)",
            border: "1px solid var(--border-default)",
            display: "flex",
            flexDirection: "column" as const,
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "Outfit",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: "var(--gold)",
                marginBottom: 6,
              }}
            >
              STOCKSTAR · PRIVATE
            </div>
            <div
              style={{
                fontFamily: "Outfit",
                fontWeight: 700,
                fontSize: 20,
                color: "var(--text-primary)",
              }}
            >
              비밀번호를 입력하세요
            </div>
            <div style={{ fontFamily: "DM Sans", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              한 번 입력하면 이 기기에서는 다시 묻지 않습니다.
            </div>
          </div>

          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            style={{
              fontFamily: "DM Sans",
              fontSize: 14,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(8, 9, 13, 0.6)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />

          {error && (
            <div style={{ color: "var(--down)", fontFamily: "DM Sans", fontSize: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting || !input.trim()}
            style={{
              fontFamily: "Outfit",
              fontSize: 13,
              fontWeight: 700,
              padding: "10px 16px",
              borderRadius: 10,
              background:
                submitting || !input.trim()
                  ? "rgba(255,255,255,0.06)"
                  : "linear-gradient(135deg, var(--gold), var(--gold-bright))",
              color: submitting || !input.trim() ? "var(--text-muted)" : "var(--bg-deep)",
              border: "none",
              cursor: submitting || !input.trim() ? "default" : "pointer",
            }}
          >
            {submitting ? "확인 중…" : "들어가기"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
