import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between px-5 pt-5">
      <Link to="/" className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-brand text-cream shadow-sm">
          <span className="font-display text-lg leading-none">M</span>
        </div>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold tracking-tight">
            MoneyGuard<span className="text-accent-gold"> AI</span>
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/45">
            Financial Copilot
          </p>
        </div>
      </Link>
      <div className="flex items-center gap-2">
        <div className="grid size-9 place-items-center rounded-full bg-cream font-mono text-[11px] font-semibold text-brand ring-1 ring-line">
          AR
        </div>
      </div>
    </header>
  );
}

const NAV = [
  { to: "/", icon: "◎", label: "Home" },
  { to: "/goals", icon: "🎯", label: "Goals" },
  { to: "/scan", icon: "🔍", label: "Scan" },
  { to: "/learn", icon: "📚", label: "Learn" },
  { to: "/you", icon: "👤", label: "You" },
] as const;

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 mt-4 flex items-center justify-between border-t border-line bg-paper/90 px-6 pt-3 pb-5 backdrop-blur">
      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          className="flex flex-col items-center gap-1 text-ink/40 [&.active]:text-brand"
        >
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="font-mono text-[9px]">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function Panel({
  label,
  right,
  children,
  className = "",
}: {
  label?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl bg-paper p-3.5 ring-1 ring-line ${className}`}>
      {(label || right) && (
        <div className="flex items-center justify-between">
          {label && (
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/45">{label}</p>
          )}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mx-5 mt-5">
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold">{kicker}</p>
      <h1 className="font-display text-[24px] font-semibold leading-tight">{title}</h1>
    </div>
  );
}

export function ToneDot({ tone }: { tone: "good" | "watch" | "risk" }) {
  const cls = tone === "good" ? "bg-good" : tone === "watch" ? "bg-warn" : "bg-risk";
  return <span className={`mt-1.5 size-2 shrink-0 rounded-full ${cls}`} />;
}
