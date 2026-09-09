import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AskPanel } from "@/components/AskPanel";
import { Panel } from "@/components/Chrome";
import { askEngine } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import {
  MONTHLY_SAVINGS,
  OPENING_BALANCE,
  goalPlan,
  healthScore,
  hiddenSpending,
  inMonth,
  inr,
  projectSavings,
  total,
  weeklySeries,
  whatChanged,
} from "@/lib/finance";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoneyGuard AI — Understand your money habits" },
      {
        name: "description",
        content:
          "MoneyGuard AI reads your spending, finds hidden costs, explains what changed and teaches better money habits.",
      },
      { property: "og:title", content: "MoneyGuard AI — Understand your money habits" },
      {
        property: "og:description",
        content:
          "Spending analysis, hidden cost detection, a financial health score and a what-if savings simulator.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { txns, goals, usingSample, summary } = useStore();
  const cmp = useMemo(() => whatChanged(txns), [txns]);
  const current = useMemo(
    () => (cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns),
    [txns, cmp.currentMonth],
  );
  const health = useMemo(() => healthScore(txns), [txns]);
  const hidden = useMemo(() => hiddenSpending(current), [current]);
  const series = useMemo(() => weeklySeries(current), [current]);
  const peak = Math.max(...series, 1);
  const spent = total(current);
  const hiddenTotal = hidden.reduce((s, f) => s + f.amount, 0);
  const goal = goals[0];
  const goalPct = goal ? Math.round(goalPlan(goal).progress * 100) : 0;

  const [monthly, setMonthly] = useState(1000);
  const projection = projectSavings(monthly, 9);
  const projPeak = Math.max(...projection, 1);

  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  async function explainChange() {
    if (explaining) return;
    setExplaining(true);
    try {
      const res = await askEngine({
        data: {
          mode: "insight",
          question: "Explain what changed this month and the behaviour behind it.",
          context: summary,
        },
      });
      setExplanation(res.text);
    } catch (err) {
      setExplanation(err instanceof Error ? err.message : "The engine could not answer.");
    } finally {
      setExplaining(false);
    }
  }

  return (
    <div>
      <AskPanel />

      {usingSample && (
        <p className="mx-5 mt-3 font-mono text-[10px] uppercase tracking-[0.15em] text-ink/40">
          Showing sample data · upload yours in Scan
        </p>
      )}

      {/* Health + balance */}
      <div className="rise2 mx-5 mt-4 grid grid-cols-3 gap-3">
        <div className="col-span-1 rounded-2xl bg-brand-deep p-3.5 text-cream">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-cream/50">Health</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-[30px] font-semibold leading-none">
              {health.score}
            </span>
            <span className="font-mono text-[11px] text-cream/50">/100</span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-cream/15">
            <div
              className="h-full rounded-full bg-accent-gold"
              style={{ width: `${health.score}%` }}
            />
          </div>
          <p className="mt-2 text-[10px] leading-tight text-cream/60">{health.bands[0].label}</p>
        </div>
        <div className="col-span-2 rounded-2xl bg-paper p-3.5 ring-1 ring-line">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/45">
                Balance
              </p>
              <p className="mt-0.5 font-display text-[22px] font-semibold leading-none">
                {inr(OPENING_BALANCE - spent + MONTHLY_SAVINGS)}
              </p>
            </div>
            <span className="rounded-full bg-good/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-good">
              sample
            </span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Spent</p>
              <p className="font-mono text-[13px] font-semibold">{inr(spent)}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Saved</p>
              <p className="font-mono text-[13px] font-semibold text-good">{inr(MONTHLY_SAVINGS)}</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Goal</p>
              <p className="font-mono text-[13px] font-semibold text-accent-gold">{goalPct}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spending graph + hidden spend */}
      <div className="rise3 mx-5 mt-3 grid grid-cols-2 gap-3">
        <Panel
          label="Spending"
          right={<p className="font-mono text-[10px] text-ink/40">6 wk</p>}
        >
          <div className="mt-3 flex h-[74px] items-end gap-1.5">
            {series.map((v, i) => {
              const h = Math.max((v / peak) * 100, 6);
              const tone =
                i === series.length - 1
                  ? "bg-risk"
                  : i === series.length - 2
                    ? "bg-accent-gold"
                    : "bg-brand/30";
              return (
                <div key={i} className="flex flex-1 flex-col justify-end">
                  <div className={`rounded-md ${tone}`} style={{ height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[8px] text-ink/40">
            <span>W1</span>
            <span>W2</span>
            <span>W3</span>
            <span>W4</span>
            <span>W5</span>
            <span>Now</span>
          </div>
        </Panel>

        <Panel label="Hidden spend" right={<span className="size-1.5 rounded-full bg-risk" />}>
          <p className="mt-2 font-mono text-[15px] font-semibold">{inr(hiddenTotal)}</p>
          <p className="text-[10px] leading-tight text-ink/55">Recurring &amp; micro-orders</p>
          <div className="mt-2.5 space-y-1.5">
            {hidden.slice(0, 2).map((f) => (
              <div key={f.kind} className="flex items-center justify-between text-[11px]">
                <span className="text-ink/70">{f.title}</span>
                <span className="font-mono font-semibold">{inr(f.amount)}</span>
              </div>
            ))}
            {hidden.length === 0 && (
              <p className="text-[11px] text-ink/55">Nothing hidden found yet.</p>
            )}
          </div>
        </Panel>
      </div>

      {/* What changed */}
      <Panel
        label="What changed"
        className="rise3 mx-5 mt-3"
        right={
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${
              cmp.pct >= 0 ? "bg-risk/10 text-risk" : "bg-good/10 text-good"
            }`}
          >
            {cmp.pct >= 0 ? "+" : ""}
            {cmp.pct.toFixed(0)}% total
          </span>
        }
      >
        <div className="mt-3 space-y-2.5">
          {cmp.changes.slice(0, 3).map((c) => {
            const width = Math.min(Math.abs(c.pct), 100);
            const tone = c.delta > 0 ? "bg-risk" : c.delta < 0 ? "bg-good" : "bg-warn";
            return (
              <div key={c.category}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="text-ink/70">{c.category}</span>
                  <span className="font-mono text-ink/55">
                    {inr(c.previous)}{" "}
                    <span className={c.delta > 0 ? "text-risk" : "text-good"}>
                      → {inr(c.current)}
                    </span>
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-cream">
                  <div
                    className={`h-full rounded-full ${tone}`}
                    style={{ width: `${Math.max(width, 8)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          onClick={() => void explainChange()}
          disabled={explaining}
          className="mt-3 w-full rounded-xl bg-cream py-2 text-[12px] font-semibold text-brand-deep disabled:opacity-60"
        >
          {explaining ? "Reading your months…" : "Explain this with AI"}
        </button>
        {explanation && (
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-ink/70">
            {explanation}
          </p>
        )}
      </Panel>

      {/* What if */}
      <div className="mx-5 mt-3 rounded-2xl bg-brand-deep p-4 text-cream">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-cream/50">What if</p>
          <span className="font-mono text-[10px] text-cream/60">9-mo projection</span>
        </div>
        <p className="mt-2 font-display text-[22px] font-semibold leading-tight">
          Save {inr(monthly)} / month
        </p>
        <div className="mt-3 flex h-[60px] items-end gap-1.5">
          {projection.map((v, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-md ${i === projection.length - 1 ? "bg-accent-gold" : "bg-cream/40"}`}
              style={{ height: `${(v / projPeak) * 100}%` }}
            />
          ))}
        </div>
        <input
          type="range"
          min={200}
          max={5000}
          step={100}
          value={monthly}
          onChange={(e) => setMonthly(Number(e.target.value))}
          aria-label="Monthly saving amount"
          className="mt-3 w-full accent-accent-gold"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="font-mono text-[11px] text-cream/70">
            After 9 months:{" "}
            <span className="font-semibold text-accent-gold">
              {inr(projection[projection.length - 1])}
            </span>
          </p>
          <span className="font-mono text-[10px] text-cream/50">projection, not a promise</span>
        </div>
      </div>
    </div>
  );
}
