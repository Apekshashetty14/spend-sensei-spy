import { useState } from "react";
import { askEngine } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";

type Msg = { role: "user" | "ai"; text: string };

const CHIPS = ["Biggest category?", "Recurring expenses", "Food this week"];

export function AskPanel() {
  const { summary } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setBusy(true);
    try {
      const res = await askEngine({ data: { mode: "ask", question: q, context: summary } });
      setMessages((m) => [...m, { role: "ai", text: res.text }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "ai", text: err instanceof Error ? err.message : "The engine could not answer." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-5 mt-5">
      <div className="rise rounded-[26px] bg-paper p-4 shadow-[0_18px_40px_-24px_oklch(0.23_0.02_162/0.5)] ring-1 ring-line">
        <div className="flex items-center justify-between px-1 pb-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent-gold">
              Ask your transactions
            </p>
            <h1 className="font-display text-[20px] font-semibold leading-tight">
              Ask your money engine
            </h1>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1">
            <span className="size-1.5 animate-pulse rounded-full bg-good" />
            <span className="font-mono text-[9px] font-medium text-brand">Engine on</span>
          </div>
        </div>

        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="flex justify-start">
              <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-cream px-3.5 py-3 text-[13px] leading-relaxed">
                Ask me anything about your spending — where the money went, what repeated, or why
                this month felt heavier.
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[78%] rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[13px] leading-snug text-cream"
                    : "max-w-[88%] whitespace-pre-line rounded-2xl rounded-bl-md bg-cream px-3.5 py-3 text-[13px] leading-relaxed"
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-cream px-3.5 py-3 font-mono text-[11px] text-ink/50">
                reading your transactions…
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mt-4 flex items-center gap-2 rounded-2xl bg-cream px-3 py-2 ring-1 ring-line"
        >
          <span className="grid size-5 place-items-center text-accent-gold">✦</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any expense…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40"
          />
          <button
            type="submit"
            disabled={busy}
            aria-label="Send question"
            className="grid size-9 place-items-center rounded-xl bg-brand font-semibold text-cream disabled:opacity-50"
          >
            ↵
          </button>
        </form>

        <div className="mt-3 flex gap-2 overflow-x-auto">
          {CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => void send(c)}
              className="shrink-0 rounded-full bg-paper px-3 py-1.5 text-[11px] font-medium text-ink/70 ring-1 ring-line"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
