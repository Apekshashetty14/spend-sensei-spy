import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Panel, PageTitle } from "@/components/Chrome";
import { askEngine } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";
import { hiddenSpending, inMonth, inr, whatChanged } from "@/lib/finance";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Financial Literacy Coach — MoneyGuard AI" },
      {
        name: "description",
        content:
          "Mini lessons drawn from your own spending, a scam message checker and quick quizzes that build real money confidence.",
      },
      { property: "og:title", content: "Financial Literacy Coach — MoneyGuard AI" },
      {
        property: "og:description",
        content: "Lessons, quizzes and scam awareness — education only, never investment advice.",
      },
    ],
  }),
  component: Learn,
});

const QUIZ = [
  {
    q: "What is a recurring expense?",
    options: ["A one-time laptop purchase", "A monthly metro pass", "A birthday gift"],
    answer: 1,
    why: "A recurring expense repeats on a schedule, so it quietly claims part of every month's money.",
  },
  {
    q: "Which of these is a warning sign in a money message?",
    options: [
      "It asks you to act within 10 minutes",
      "It comes from your saved contact",
      "It has no payment request",
    ],
    answer: 0,
    why: "Urgency is the most common pressure tactic — real institutions give you time to verify.",
  },
  {
    q: "Someone promises to double your money in a month. What does that signal?",
    options: ["A rare opportunity", "A high risk or a scam", "A guaranteed return"],
    answer: 1,
    why: "Guaranteed high returns are a warning sign, not a feature. Higher return always means higher risk.",
  },
];

const LITERACY = [
  {
    title: "Risk vs return",
    body: "Every return comes with risk attached. If someone offers a big return with no risk, the risk is simply hidden from you.",
  },
  {
    title: "Diversification",
    body: "Spreading money across different types of things reduces how badly one bad outcome can hurt you.",
  },
  {
    title: "Reading financial claims",
    body: "Ask who benefits, what happens if it fails, and whether the claim is written down anywhere official.",
  },
];

function Learn() {
  const { txns, summary, badges, awardBadge } = useStore();
  const cmp = useMemo(() => whatChanged(txns), [txns]);
  const current = useMemo(
    () => (cmp.currentMonth ? inMonth(txns, cmp.currentMonth) : txns),
    [txns, cmp.currentMonth],
  );
  const pattern = useMemo(() => hiddenSpending(current)[0], [current]);

  const [lesson, setLesson] = useState<string | null>(null);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [scan, setScan] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});

  async function teach() {
    if (lessonBusy) return;
    setLessonBusy(true);
    try {
      const res = await askEngine({
        data: {
          mode: "lesson",
          question: pattern
            ? `Detected pattern: ${pattern.title} worth ${inr(pattern.amount)} — ${pattern.detail}. Teach the concept behind it.`
            : "Teach the concept of a recurring expense.",
          context: summary,
        },
      });
      setLesson(res.text);
      awardBadge("Money Smart Badge");
    } catch (err) {
      setLesson(err instanceof Error ? err.message : "The engine could not answer.");
    } finally {
      setLessonBusy(false);
    }
  }

  async function checkMessage() {
    if (scanBusy || !message.trim()) return;
    setScanBusy(true);
    try {
      const res = await askEngine({
        data: { mode: "scam", question: message.trim(), context: "" },
      });
      setScan(res.text);
      awardBadge("Scam Awareness Badge");
    } catch (err) {
      setScan(err instanceof Error ? err.message : "The engine could not answer.");
    } finally {
      setScanBusy(false);
    }
  }

  return (
    <div>
      <PageTitle kicker="Financial literacy coach" title="Learn from your own money" />

      <Panel label="Pattern spotted in your spending" className="rise mx-5 mt-4">
        <p className="mt-2 text-[13px] leading-relaxed">
          {pattern
            ? `${pattern.title} — ${inr(pattern.amount)}. ${pattern.detail}`
            : "No repeating pattern in this period. Learn the concept anyway."}
        </p>
        <button
          onClick={() => void teach()}
          disabled={lessonBusy}
          className="mt-3 w-full rounded-xl bg-brand py-2 text-[12px] font-semibold text-cream disabled:opacity-60"
        >
          {lessonBusy ? "Writing your mini lesson…" : "Teach me this"}
        </button>
        {lesson && (
          <p className="mt-3 whitespace-pre-line rounded-xl bg-cream p-3 text-[12px] leading-relaxed">
            📚 {lesson}
          </p>
        )}
      </Panel>

      <Panel label="Scam awareness" className="mx-5 mt-3">
        <p className="mt-2 text-[12px] leading-relaxed text-ink/65">
          Paste a suspicious money message. You'll get the warning signs explained — never share
          OTPs or PINs with anyone.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="e.g. Your account is blocked. Pay ₹49 in 10 minutes to restore it."
          className="mt-2 w-full rounded-xl bg-cream p-3 text-[12px] outline-none placeholder:text-ink/35"
        />
        <button
          onClick={() => void checkMessage()}
          disabled={scanBusy}
          className="mt-2 w-full rounded-xl bg-brand-deep py-2 text-[12px] font-semibold text-cream disabled:opacity-60"
        >
          {scanBusy ? "Checking the message…" : "Check this message"}
        </button>
        {scan && (
          <div className="mt-3 rounded-xl bg-risk/10 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-risk">
              🚨 What to notice
            </p>
            <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed">{scan}</p>
          </div>
        )}
      </Panel>

      <Panel label="Quick quiz" className="mx-5 mt-3">
        <div className="mt-3 space-y-4">
          {QUIZ.map((item, qi) => (
            <div key={qi}>
              <p className="text-[12px] font-semibold">{item.q}</p>
              <div className="mt-2 space-y-1.5">
                {item.options.map((opt, oi) => {
                  const chosen = picked[qi];
                  const isChosen = chosen === oi;
                  const correct = oi === item.answer;
                  const tone =
                    chosen === undefined
                      ? "bg-canvas ring-line"
                      : correct
                        ? "bg-good/12 ring-good/40"
                        : isChosen
                          ? "bg-risk/10 ring-risk/40"
                          : "bg-canvas ring-line";
                  return (
                    <button
                      key={oi}
                      onClick={() => {
                        setPicked((p) => ({ ...p, [qi]: oi }));
                        if (correct) awardBadge("Savings Streak");
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-left text-[12px] ring-1 ${tone}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
              {picked[qi] !== undefined && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-ink/60">{item.why}</p>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="Investment literacy" className="mx-5 mt-3">
        <div className="mt-3 space-y-3">
          {LITERACY.map((l) => (
            <div key={l.title} className="rounded-xl bg-cream p-3">
              <p className="font-display text-[14px] font-semibold">{l.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-ink/65">{l.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink/40">
          Education only. MoneyGuard AI never recommends a specific investment or promises returns.
        </p>
      </Panel>

      {badges.length > 0 && (
        <Panel label="Badges earned" className="mx-5 mt-3">
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-accent-gold/15 px-3 py-1 text-[11px] font-semibold text-ink/75"
              >
                🏆 {b}
              </span>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
