export type Category =
  | "Food"
  | "Travel"
  | "Shopping"
  | "Bills"
  | "Education"
  | "Other";

export const CATEGORY_EMOJI: Record<Category, string> = {
  Food: "🍔",
  Travel: "🚌",
  Shopping: "🛍️",
  Bills: "📱",
  Education: "📚",
  Other: "✳️",
};

export type Txn = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  merchant: string;
  amount: number; // positive = spend
  category: Category;
};

const RULES: Array<[RegExp, Category]> = [
  [/zomato|swiggy|cafe|restaurant|pizza|dominos|canteen|chai|bakery|food|mess/i, "Food"],
  [/uber|ola|metro|bus|irctc|train|fuel|petrol|rapido|flight/i, "Travel"],
  [/amazon|flipkart|myntra|store|mall|nykaa|shop|decathlon/i, "Shopping"],
  [/jio|airtel|electricity|recharge|netflix|spotify|prime|rent|wifi|broadband|gas|insurance/i, "Bills"],
  [/course|udemy|coursera|book|stationery|college|tuition|exam|library/i, "Education"],
];

export function categorize(merchant: string): Category {
  for (const [re, cat] of RULES) if (re.test(merchant)) return cat;
  return "Other";
}

export function inr(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

/* ---------------- sample data: two months of a student's spending ---------------- */

function mk(date: string, merchant: string, amount: number): Txn {
  return {
    id: `${date}-${merchant}-${amount}-${Math.random().toString(36).slice(2, 7)}`,
    date,
    merchant,
    amount,
    category: categorize(merchant),
  };
}

export const SAMPLE_TXNS: Txn[] = [
  // previous month
  mk("2026-08-02", "Jio Recharge", 299),
  mk("2026-08-03", "Swiggy order", 240),
  mk("2026-08-04", "Metro card top-up", 300),
  mk("2026-08-05", "Netflix", 199),
  mk("2026-08-06", "Campus canteen", 120),
  mk("2026-08-08", "Amazon order", 1450),
  mk("2026-08-10", "Zomato order", 310),
  mk("2026-08-12", "Coursera course", 1899),
  mk("2026-08-14", "Electricity bill", 1240),
  mk("2026-08-15", "Spotify", 119),
  mk("2026-08-16", "Ola ride", 180),
  mk("2026-08-18", "Stationery store", 340),
  mk("2026-08-20", "Swiggy order", 260),
  mk("2026-08-22", "Myntra order", 2100),
  mk("2026-08-24", "Chai point", 90),
  mk("2026-08-25", "Rent share", 4500),
  mk("2026-08-27", "Bus pass", 450),
  mk("2026-08-28", "Zomato order", 280),
  mk("2026-08-29", "Library fine", 60),
  mk("2026-08-30", "Bakery", 150),

  // current month — food and shopping drift upward
  mk("2026-09-01", "Jio Recharge", 299),
  mk("2026-09-02", "Swiggy order", 320),
  mk("2026-09-02", "Chai point", 80),
  mk("2026-09-03", "Netflix", 199),
  mk("2026-09-03", "Zomato order", 265),
  mk("2026-09-04", "Metro card top-up", 300),
  mk("2026-09-04", "Chai point", 80),
  mk("2026-09-05", "Swiggy order", 410),
  mk("2026-09-05", "Amazon order", 1290),
  mk("2026-09-06", "Chai point", 90),
  mk("2026-09-07", "Zomato order", 385),
  mk("2026-09-07", "Rapido ride", 140),
  mk("2026-09-08", "Spotify", 119),
  mk("2026-09-08", "Campus canteen", 160),
  mk("2026-09-09", "Swiggy order", 455),
  mk("2026-09-09", "Amazon order", 1290),
  mk("2026-09-10", "Chai point", 85),
  mk("2026-09-11", "Electricity bill", 1180),
  mk("2026-09-11", "Zomato order", 340),
  mk("2026-09-12", "Myntra order", 2650),
  mk("2026-09-13", "Chai point", 95),
  mk("2026-09-13", "Swiggy order", 375),
  mk("2026-09-14", "Prime Video", 179),
  mk("2026-09-15", "Rent share", 4500),
  mk("2026-09-15", "Udemy course", 649),
  mk("2026-09-16", "Ola ride", 220),
  mk("2026-09-16", "Chai point", 80),
  mk("2026-09-17", "Zomato order", 295),
  mk("2026-09-18", "Decathlon store", 1780),
  mk("2026-09-18", "Bakery", 165),
];

export const OPENING_BALANCE = 128450;
export const MONTHLY_SAVINGS = 12000;

/* ---------------- the engine ---------------- */

export function monthKey(d: string) {
  return d.slice(0, 7);
}

export function months(txns: Txn[]): string[] {
  return Array.from(new Set(txns.map((t) => monthKey(t.date)))).sort();
}

export function inMonth(txns: Txn[], m: string) {
  return txns.filter((t) => monthKey(t.date) === m);
}

export function total(txns: Txn[]) {
  return txns.reduce((s, t) => s + t.amount, 0);
}

export function byCategory(txns: Txn[]): Array<{ category: Category; amount: number }> {
  const map = new Map<Category, number>();
  for (const t of txns) map.set(t.category, (map.get(t.category) ?? 0) + t.amount);
  return Array.from(map, ([category, amount]) => ({ category, amount })).sort(
    (a, b) => b.amount - a.amount,
  );
}

export function weeklySeries(txns: Txn[], buckets = 6): number[] {
  if (txns.length === 0) return Array.from({ length: buckets }, () => 0);
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  const start = new Date(sorted[0].date).getTime();
  const end = new Date(sorted[sorted.length - 1].date).getTime();
  const span = Math.max(end - start, 1);
  const out = Array.from({ length: buckets }, () => 0);
  for (const t of sorted) {
    const p = (new Date(t.date).getTime() - start) / span;
    const idx = Math.min(buckets - 1, Math.floor(p * buckets));
    out[idx] += t.amount;
  }
  return out;
}

export type HiddenFinding = {
  kind: "subscription" | "micro" | "duplicate" | "spike";
  title: string;
  detail: string;
  amount: number;
};

export function hiddenSpending(txns: Txn[]): HiddenFinding[] {
  const findings: HiddenFinding[] = [];
  const byMerchant = new Map<string, Txn[]>();
  for (const t of txns) {
    const key = t.merchant.toLowerCase();
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), t]);
  }

  // subscriptions: same merchant, near-identical amount, in >= 2 different months
  const subs: Txn[] = [];
  for (const list of byMerchant.values()) {
    const ms = new Set(list.map((t) => monthKey(t.date)));
    const sameAmount = new Set(list.map((t) => Math.round(t.amount / 10)));
    if (ms.size >= 2 && sameAmount.size <= 2) subs.push(list[list.length - 1]);
  }
  if (subs.length)
    findings.push({
      kind: "subscription",
      title: `${subs.length} recurring payments`,
      detail: subs.map((t) => t.merchant).join(", "),
      amount: total(subs),
    });

  // micro purchases: many payments under ₹200
  const micro = txns.filter((t) => t.amount <= 200);
  if (micro.length >= 5)
    findings.push({
      kind: "micro",
      title: `${micro.length} small purchases`,
      detail: "Frequent low-value payments that rarely feel like spending",
      amount: total(micro),
    });

  // duplicate-looking: same merchant + same amount within 7 days
  const dupes: Txn[] = [];
  for (const list of byMerchant.values()) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 1; i < sorted.length; i++) {
      const gap =
        (new Date(sorted[i].date).getTime() - new Date(sorted[i - 1].date).getTime()) / 86400000;
      if (gap <= 7 && sorted[i].amount === sorted[i - 1].amount) dupes.push(sorted[i]);
    }
  }
  if (dupes.length)
    findings.push({
      kind: "duplicate",
      title: `${dupes.length} duplicate-looking charges`,
      detail: dupes.map((t) => `${t.merchant} ${inr(t.amount)}`).join(", "),
      amount: total(dupes),
    });

  return findings;
}

export type Change = {
  category: Category;
  previous: number;
  current: number;
  delta: number;
  pct: number;
};

export function whatChanged(txns: Txn[]): {
  previousMonth?: string;
  currentMonth?: string;
  previousTotal: number;
  currentTotal: number;
  pct: number;
  changes: Change[];
} {
  const ms = months(txns);
  const currentMonth = ms[ms.length - 1];
  const previousMonth = ms[ms.length - 2];
  const cur = currentMonth ? inMonth(txns, currentMonth) : [];
  const prev = previousMonth ? inMonth(txns, previousMonth) : [];
  const currentTotal = total(cur);
  const previousTotal = total(prev);
  const cats = new Set<Category>([
    ...byCategory(cur).map((c) => c.category),
    ...byCategory(prev).map((c) => c.category),
  ]);
  const changes: Change[] = Array.from(cats)
    .map((category) => {
      const c = total(cur.filter((t) => t.category === category));
      const p = total(prev.filter((t) => t.category === category));
      return {
        category,
        previous: p,
        current: c,
        delta: c - p,
        pct: p === 0 ? 100 : ((c - p) / p) * 100,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    previousMonth,
    currentMonth,
    previousTotal,
    currentTotal,
    pct: previousTotal === 0 ? 0 : ((currentTotal - previousTotal) / previousTotal) * 100,
    changes,
  };
}

export type HealthBand = { tone: "good" | "watch" | "risk"; label: string; note: string };

export function healthScore(txns: Txn[]): { score: number; bands: HealthBand[] } {
  const cmp = whatChanged(txns);
  const cur = cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns;
  const spend = total(cur);
  const savingsRate = MONTHLY_SAVINGS / Math.max(spend + MONTHLY_SAVINGS, 1);
  const hidden = total(hiddenSpending(cur).map((f) => ({ amount: f.amount }) as Txn));
  const hiddenShare = hidden / Math.max(spend, 1);
  const discretionary =
    total(cur.filter((t) => t.category === "Food" || t.category === "Shopping")) /
    Math.max(spend, 1);

  let score = 50;
  score += Math.round(savingsRate * 60);
  score -= Math.round(Math.min(hiddenShare, 0.6) * 30);
  score -= Math.round(Math.max(discretionary - 0.35, 0) * 60);
  score -= Math.round(Math.max(cmp.pct, 0) / 8);
  score = Math.max(5, Math.min(98, score));

  const bands: HealthBand[] = [
    {
      tone: savingsRate > 0.2 ? "good" : "watch",
      label: savingsRate > 0.2 ? "Consistent savings" : "Saving rate is thin",
      note: `You keep about ${Math.round(savingsRate * 100)}% of what comes in.`,
    },
    {
      tone: hiddenShare > 0.12 ? "watch" : "good",
      label: hiddenShare > 0.12 ? "Recurring expenses need attention" : "Recurring load is light",
      note: `${inr(hidden)} of this month sits in repeating or easy-to-miss payments.`,
    },
    {
      tone: discretionary > 0.45 ? "risk" : discretionary > 0.35 ? "watch" : "good",
      label: "Discretionary spending",
      note: `Food and shopping are ${Math.round(discretionary * 100)}% of this month's spend.`,
    },
  ];

  return { score, bands };
}

export type Goal = {
  id: string;
  emoji: string;
  name: string;
  target: number;
  saved: number;
  monthsLeft: number;
};

export const DEFAULT_GOALS: Goal[] = [
  { id: "g1", emoji: "💻", name: "New laptop", target: 54000, saved: 36700, monthsLeft: 4 },
  { id: "g2", emoji: "🆘", name: "Emergency fund", target: 20000, saved: 9000, monthsLeft: 6 },
  { id: "g3", emoji: "🎓", name: "Semester fees", target: 32000, saved: 8000, monthsLeft: 8 },
];

export function goalPlan(goal: Goal) {
  const remaining = Math.max(goal.target - goal.saved, 0);
  const perMonth = goal.monthsLeft > 0 ? remaining / goal.monthsLeft : remaining;
  return {
    remaining,
    perMonth,
    perWeek: perMonth / 4.33,
    perDay: perMonth / 30,
    progress: Math.min(goal.saved / Math.max(goal.target, 1), 1),
  };
}

export function projectSavings(monthly: number, months: number, start = 0): number[] {
  return Array.from({ length: months }, (_, i) => start + monthly * (i + 1));
}

/* ---------------- CSV parsing for uploads ---------------- */

export function parseTransactions(text: string): Txn[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Txn[] = [];
  for (const line of lines) {
    const parts = line.split(/[,;\t|]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    const date = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p)) ?? parts[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const amountRaw = [...parts]
      .reverse()
      .find((p) => /^[₹$]?-?[\d,]+(\.\d+)?$/.test(p) && p !== date);
    if (!amountRaw) continue;
    const amount = Math.abs(Number(amountRaw.replace(/[₹$,]/g, "")));
    if (!Number.isFinite(amount) || amount === 0) continue;
    const merchant =
      parts.find((p) => p !== date && p !== amountRaw && /[a-zA-Z]/.test(p)) ?? "Unknown";
    out.push(mk(date, merchant, amount));
  }
  return out;
}

export const SAMPLE_CSV = `2026-09-01,Jio Recharge,299
2026-09-02,Swiggy order,320
2026-09-04,Metro card top-up,300
2026-09-05,Amazon order,1290`;
