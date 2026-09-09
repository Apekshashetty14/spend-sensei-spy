import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Panel, PageTitle } from "@/components/Chrome";
import { askEngine } from "@/lib/ai.functions";
import { buildSummary, useStore } from "@/lib/store";
import {
  CATEGORY_EMOJI,
  SAMPLE_CSV,
  byCategory,
  hiddenSpending,
  inMonth,
  inr,
  parseTransactions,
  total,
  whatChanged,
} from "@/lib/finance";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "AI Spending Scan — MoneyGuard AI" },
      {
        name: "description",
        content:
          "Upload or paste your transactions. MoneyGuard AI sorts them into categories and shows the hidden spending behind the totals.",
      },
      { property: "og:title", content: "AI Spending Scan — MoneyGuard AI" },
      {
        property: "og:description",
        content: "Transaction categorisation, hidden spending detection and AI insights.",
      },
    ],
  }),
  component: Scan;
});

function Scan() {
  const { txns, setTxns, resetToSample, usingSample } = useStore();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cmp = useMemo(() => whatChanged(txns), [txns]);
  const current = useMemo(
    () => (cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns),
    [txns, cmp.currentMonth],
  );
  const cats = useMemo(() => byCategory(current), [current]);
  const spend = total(current);
  const hidden = useMemo(() => hiddenSpending(current), [current]);

  function load(text: string) {
    const parsed = parseTransactions(text);
    if (parsed.length === 0) {
      setError("No transactions found. Each line needs a date, a name and an amount.");
      return;
    }
    setError(null);
    setTxns(parsed, false);
    setInsight(null);
  }

  async function explain(list = current) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await askEngine({
        data: {
          mode: "insight",
          question: "Summarise this month's spending and what it says about my habits.",
          context: buildSummary(list.length ? txns : txns),
        },
      });
      setInsight(res.text);
    } catch (err) {
      setInsight(err instanceof Error ? err.message : "The engine could not answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="AI spending detector" title="Scan your transactions" />

      <Panel label="Upload or paste" className="rise mx-5 mt-4">
        <div className="mt-3 flex gap-2">
          <label className="flex-1 cursor-pointer rounded-xl bg-brand py-2 text-center text-[12px] font-semibold text-cream">
            Choose file
            <input
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                load(await file.text());
              }}
            />
          </label>
          <button
            onClick={resetToSample}
            className="rounded-xl bg-cream px-3 py-2 text-[12px] font-semibold text-brand-deep"
          >
            Use sample
          </button>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={4}
          placeholder={SAMPLE_CSV}
          className="mt-3 w-full rounded-xl bg-cream p-3 font-mono text-[11px] outline-none placeholder:text-ink/35"
        />
        <button
          onClick={() => load(raw)}
          className="mt-2 w-full rounded-xl bg-brand-deep py-2 text-[12px] font-semibold text-cream"
        >
          Categorise these transactions
        </button>
        {error && <p className="mt-2 text-[11px] text-risk">{error}</p>}
        <p className="mt-2 font-mono text-[10px] text-ink/40">
          {usingSample ? "Sample statement loaded" : `${txns.length} of your transactions loaded`}
        </p>
      </Panel>

      <Panel label={`Categories · ${cmp.currentMonth ?? ""}`} className="mx-5 mt-3">
        <p className="mt-2 font-display text-[22px] font-semibold leading-none">{inr(spend)}</p>
        <div className="mt-3 space-y-2.5">
          {cats.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-ink/70">
                  {CATEGORY_EMOJI[c.category]} {c.category}
                </span>
                <span className="font-mono font-semibold">{inr(c.amount)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-cream">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${(c.amount / Math.max(spend, 1)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => void explain()}
          disabled={busy}
          className="mt-3 w-full rounded-xl bg-cream py-2 text-[12px] font-semibold text-brand-deep disabled:opacity-60"
        >
          {busy ? "Reading transactions…" : "Get AI insights"}
        </button>
        {insight && (
          <p className="mt-2 whitespace-pre-line text-[12px] leading-relaxed text-ink/70">
            {insight}
          </p>
        )}
      </Panel>

      <Panel label="Hidden spending detector" className="mx-5 mt-3">
        <div className="mt-3 space-y-2">
          {hidden.map((f) => (
            <div key={f.kind} className="rounded-xl bg-cream p-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-semibold">{f.title}</p>
                <p className="font-mono text-[12px] font-semibold text-risk">{inr(f.amount)}</p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/60">{f.detail}</p>
            </div>
          ))}
          {hidden.length === 0 && (
            <p className="text-[12px] text-ink/60">
              No repeating or duplicate-looking payments in this period.
            </p>
          )}
        </div>
      </Panel>

      <Panel label="Recent transactions" className="mx-5 mt-3">
        <div className="mt-3 space-y-2.5">
          {current
            .slice()
            .reverse()
            .slice(0, 12)
            .map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-cream text-sm">
                    {CATEGORY_EMOJI[t.category]}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium leading-tight">{t.merchant}</p>
                    <p className="font-mono text-[10px] text-ink/45">
                      {t.date} · {t.category}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-[13px] font-semibold">−{inr(t.amount)}</p>
              </div>
            ))}
        </div>
      </Panel>
    </div>
  );
}
