import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel, PageTitle } from "@/components/Chrome";
import { askEngine } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { goalPlan, inr, type Goal } from "@/lib/finance";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Money Goals — MoneyGuard AI" },
      {
        name: "description",
        content:
          "Set an education, laptop, emergency or future goal and get an educational savings plan built from your own spending.",
      },
      { property: "og:title", content: "Money Goals — MoneyGuard AI" },
      {
        property: "og:description",
        content: "Goal planning with monthly and weekly savings targets, explained by AI.",
      },
    ],
  }),
  component: Goals,
});

const PRESETS = [
  { emoji: "🎓", name: "Education" },
  { emoji: "💻", name: "Laptop" },
  { emoji: "🏠", name: "Future goal" },
  { emoji: "🆘", name: "Emergency savings" },
];

function Goals() {
  const { goals, addGoal, summary } = useStore();
  const [preset, setPreset] = useState(PRESETS[0]);
  const [target, setTarget] = useState(30000);
  const [monthsLeft, setMonthsLeft] = useState(6);
  const [plan, setPlan] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const draft: Goal = {
    id: "draft",
    emoji: preset.emoji,
    name: preset.name,
    target,
    saved: 0,
    monthsLeft,
  };
  const math = goalPlan(draft);

  async function buildPlan() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await askEngine({
        data: {
          mode: "goal",
          question: `Goal: ${preset.name}. Target ${inr(target)} in ${monthsLeft} months. Needed per month: ${inr(math.perMonth)}.`,
          context: summary,
        },
      });
      setPlan(res.text);
    } catch (err) {
      setPlan(err instanceof Error ? err.message : "The engine could not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="Money goals" title="Plan a goal you can actually reach" />

      <Panel label="New goal" className="rise mx-5 mt-4">
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => setPreset(p)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 ring-line ${
                p.name === preset.name ? "bg-brand text-cream" : "bg-paper text-ink/70"
              }`}
            >
              {p.emoji} {p.name}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/45">Target</p>
              <p className="font-mono text-[13px] font-semibold">{inr(target)}</p>
            </div>
            <input
              type="range"
              min={2000}
              max={200000}
              step={1000}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              aria-label="Goal target amount"
              className="mt-1 w-full accent-brand"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink/45">
                Timeframe
              </p>
              <p className="font-mono text-[13px] font-semibold">{monthsLeft} months</p>
            </div>
            <input
              type="range"
              min={1}
              max={36}
              value={monthsLeft}
              onChange={(e) => setMonthsLeft(Number(e.target.value))}
              aria-label="Goal timeframe in months"
              className="mt-1 w-full accent-brand"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Per month</p>
            <p className="font-mono text-[13px] font-semibold">{inr(math.perMonth)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Per week</p>
            <p className="font-mono text-[13px] font-semibold">{inr(math.perWeek)}</p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wide text-ink/45">Per day</p>
            <p className="font-mono text-[13px] font-semibold">{inr(math.perDay)}</p>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => void buildPlan()}
            disabled={busy}
            className="flex-1 rounded-xl bg-brand py-2 text-[12px] font-semibold text-cream disabled:opacity-60"
          >
            {busy ? "Building plan…" : "Build AI savings plan"}
          </button>
          <button
            onClick={() =>
              addGoal({ ...draft, id: `g-${Date.now()}`, name: `${preset.name} goal` })
            }
            className="rounded-xl bg-cream px-3 py-2 text-[12px] font-semibold text-brand-deep"
          >
            Save goal
          </button>
        </div>

        {plan && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-cream p-3 text-[12px] leading-relaxed">
            {plan}
          </p>
        )}
      </Panel>

      <div className="mx-5 mt-3 space-y-3">
        {goals.map((g) => {
          const p = goalPlan(g);
          return (
            <Panel key={g.id}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-[16px] font-semibold leading-tight">
                    {g.emoji} {g.name}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink/45">
                    {inr(g.saved)} of {inr(g.target)} · {g.monthsLeft} months left
                  </p>
                </div>
                <span className="font-mono text-[13px] font-semibold text-accent-gold">
                  {Math.round(p.progress * 100)}%
                </span>
              </div>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${p.progress * 100}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-ink/60">
                Keep aside {inr(p.perMonth)} a month ({inr(p.perWeek)} a week) to finish on time.
              </p>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
