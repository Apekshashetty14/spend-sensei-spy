import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DEFAULT_GOALS,
  SAMPLE_TXNS,
  byCategory,
  healthScore,
  hiddenSpending,
  inMonth,
  inr,
  months,
  total,
  whatChanged,
  type Goal,
  type Txn,
} from "./finance";

type Store = {
  txns: Txn[];
  usingSample: boolean;
  setTxns: (t: Txn[], usingSample?: boolean) => void;
  resetToSample: () => void;
  goals: Goal[];
  addGoal: (g: Goal) => void;
  badges: string[];
  awardBadge: (b: string) => void;
  summary: string;
};

const Ctx = createContext<Store | null>(null);

const KEY = "moneyguard.state.v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [txns, setTxnsState] = useState<Txn[]>(SAMPLE_TXNS);
  const [usingSample, setUsingSample] = useState(true);
  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [badges, setBadges] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        txns?: Txn[];
        usingSample?: boolean;
        goals?: Goal[];
        badges?: string[];
      };
      if (parsed.txns?.length) setTxnsState(parsed.txns);
      if (typeof parsed.usingSample === "boolean") setUsingSample(parsed.usingSample);
      if (parsed.goals?.length) setGoals(parsed.goals);
      if (parsed.badges) setBadges(parsed.badges);
    } catch {
      /* first run */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ txns, usingSample, goals, badges }));
    } catch {
      /* storage unavailable */
    }
  }, [txns, usingSample, goals, badges]);

  const summary = useMemo(() => buildSummary(txns), [txns]);

  const value: Store = {
    txns,
    usingSample,
    setTxns: (t, sample = false) => {
      setTxnsState(t);
      setUsingSample(sample);
    },
    resetToSample: () => {
      setTxnsState(SAMPLE_TXNS);
      setUsingSample(true);
    },
    goals,
    addGoal: (g) => setGoals((prev) => [g, ...prev]),
    badges,
    awardBadge: (b) => setBadges((prev) => (prev.includes(b) ? prev : [...prev, b])),
    summary,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

/** Compact plain-text brief of the user's money, sent to the AI engine as context. */
export function buildSummary(txns: Txn[]): string {
  const ms = months(txns);
  const cmp = whatChanged(txns);
  const cur = cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns;
  const health = healthScore(txns);
  const lines: string[] = [];

  lines.push(`Months in data: ${ms.join(", ")}`);
  lines.push(
    `Current month ${cmp.currentMonth} total ${inr(cmp.currentTotal)}; previous month ${cmp.previousMonth} total ${inr(cmp.previousTotal)} (${cmp.pct >= 0 ? "+" : ""}${cmp.pct.toFixed(1)}%).`,
  );
  lines.push(
    "Current month by category: " +
      byCategory(cur)
        .map((c) => `${c.category} ${inr(c.amount)}`)
        .join(", "),
  );
  lines.push(
    "Category changes: " +
      cmp.changes
        .map(
          (c) =>
            `${c.category} ${inr(c.previous)} -> ${inr(c.current)} (${c.delta >= 0 ? "+" : ""}${c.delta.toFixed(0)})`,
        )
        .join(", "),
  );
  lines.push(
    "Hidden spending findings: " +
      (hiddenSpending(cur)
        .map((f) => `${f.title} ${inr(f.amount)} (${f.detail})`)
        .join("; ") || "none"),
  );
  lines.push(`Financial health score: ${health.score}/100.`);
  lines.push(`Transactions this month: ${cur.length}, total ${inr(total(cur))}.`);
  lines.push(
    "Transaction rows (date | merchant | category | amount): " +
      cur
        .slice(-40)
        .map((t) => `${t.date} | ${t.merchant} | ${t.category} | ${t.amount}`)
        .join(" ;; "),
  );

  return lines.join("\n");
}
