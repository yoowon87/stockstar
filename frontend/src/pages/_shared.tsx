import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div
      className="px-6 pt-5 pb-4 flex items-end justify-between gap-4"
      style={{ borderBottom: "1px solid var(--border-default)" }}
    >
      <div>
        <div
          style={{
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--gold)",
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
        <div style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 22, color: "var(--text-primary)" }}>{title}</div>
        {subtitle && (
          <div style={{ fontFamily: "DM Sans", fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{subtitle}</div>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}

export function PhasePlaceholder({ phase, detail }: { phase: string; detail: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center mx-auto"
      style={{
        maxWidth: 520,
        padding: 40,
        border: "1px dashed var(--border-default)",
        borderRadius: 16,
        background: "rgba(212, 165, 116, 0.03)",
      }}
    >
      <div
        style={{
          fontFamily: "Outfit",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.18em",
          color: "var(--gold)",
          marginBottom: 8,
        }}
      >
        {phase}
      </div>
      <div style={{ fontFamily: "DM Sans", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {detail}
      </div>
    </div>
  );
}
