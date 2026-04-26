import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function NewsSection({ title, subtitle, children }: Props) {
  return (
    <section
      style={{
        padding: 16,
        borderRadius: 12,
        border: "1px solid var(--border-default)",
        background: "rgba(18, 20, 28, 0.6)",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontFamily: "Outfit",
            fontWeight: 700,
            fontSize: 13,
            color: "var(--text-primary)",
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontFamily: "DM Sans",
              fontSize: 11,
              color: "var(--text-muted)",
              marginTop: 2,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </section>
  );
}
