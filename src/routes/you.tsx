import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Panel, PageTitle, ToneDot } from "@/components/Chrome";
import { useStore } from "@/lib/store";
import { healthScore, inMonth, inr, total, whatChanged } from "@/lib/finance";

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [
      { title: "Your Financial Health — MoneyGuard AI" },
      {
        name: "description",
        content:
          "See your financial health score explained band by band, plus your money challenge streak and badges.",
      },
      { property: "og:title", content: "Your Financial Health — MoneyGuard AI" },
      {
        property: "og:description",
        content: "A financial health score that teaches instead of just scoring.",
      },
    ],
  }),
  component: You,
});

const CHALLENGE = [
  { day: 1, task: "Identify needs vs wants in this week's spending" },
  { day: 2, task: "Find one recurring expense you forgot about" },
  { day: 3, task: "Create a savings goal with a real timeframe" },
  { day: 4, task: "Spot the warning signs in a suspicious money message" },
];

function You() {
  const { txns, badges, resetToSample, usingSample } = useStore();
  const health = useMemo(() => healthScore(txns), [txns]);
  const cmp = useMemo(() => whatChanged(txns), [txns]);
  const current = cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns;
  const done = Math.min(badges.length + 1, CHALLENGE.length);

  return (
    <div>
      <PageTitle kicker="Financial health" title="What your score is telling you" />

      <div className="rise mx-5 mt-4 rounded-2xl bg-brand-deep p-4 text-cream">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[44px] font-semibold leading-none">
            {health.score}
          </span>
          <span className="font-mono text-[12px] text-cream/50">/ 100</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream/15">
          <div
            className="h-full rounded-full bg-accent-gold"
            style={{ width: `${health.score}%` }}
          />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-cream/70">
          Built from your saving rate, how much sits in repeating payments, and how fast your
          spending is moving. It's a teaching signal, not a judgement.
        </p>
      </div>

      <Panel label="Score explained" className="mx-5 mt-3">
        <div className="mt-3 space-y-3">
          {health.bands.map((b) => (
            <div key={b.label} className="flex items-start gap-2.5">
              <ToneDot tone={b.tone} />
              <div>
                <p className="text-[12px] font-semibold">{b.label}</p>
                <p className="text-[11px] leading-relaxed text-ink/60">{b.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="Money challenge" className="mx-5 mt-3">
        <div className="mt-2 flex items-center justify-between">
          <p className="font-display text-[15px] font-semibold">Day {done} of 4</p>
          <span className="font-mono text-[10px] text-ink/45">⭐ {badges.length} badges</span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${(done / CHALLENGE.length) * 100}%` }}
          />
        </div>
        <div className="mt-3 space-y-2">
          {CHALLENGE.map((c) => (
            <div key={c.day} className="flex items-start gap-2.5 rounded-xl bg-cream p-3">
              <span className="font-mono text-[11px] font-semibold text-brand">D{c.day}</span>
              <p className="text-[12px] leading-relaxed">{c.task}</p>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="This month" className="mx-5 mt-3">
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Transactions</p>
            <p className="font-mono text-[14px] font-semibold">{current.length}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Spent</p>
            <p className="font-mono text-[14px] font-semibold">{inr(total(current))}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">vs last</p>
            <p
              className={`font-mono text-[14px] font-semibold ${cmp.pct >= 0 ? "text-risk" : "text-good"}`}
            >
              {cmp.pct >= 0 ? "+" : ""}
              {cmp.pct.toFixed(0)}%
            </p>
          </div>
        </div>
        {!usingSample && (
          <button
            onClick={resetToSample}
            className="mt-3 w-full rounded-xl bg-cream py-2 text-[12px] font-semibold text-brand-deep"
          >
            Switch back to sample data
          </button>
        )}
      </Panel>

      <Panel label="Future scope" className="mx-5 mt-3">
        <p className="mt-2 text-[11px] leading-relaxed text-ink/60">
          Bank statement sync, shared household goals, deeper investment literacy modules and a
          longer money challenge are next.
        </p>
      </Panel>
    </div>
  );
}
