import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  mode: z.enum(["ask", "scam", "lesson", "goal", "insight"]),
  question: z.string().min(1).max(4000),
  context: z.string().max(20000).default(""),
});

const SYSTEM: Record<z.infer<typeof Input>["mode"], string> = {
  ask: `You are MoneyGuard AI, a financial literacy engine for Indian students. Answer questions strictly from the transaction summary provided. Use ₹ and Indian number formatting. Be specific with numbers, then explain the behaviour behind the numbers in one or two short sentences. Never recommend specific investments and never promise returns. Max 90 words. Plain text, no markdown headings.`,
  scam: `You are a financial scam awareness coach. The user pastes a suspicious message. List the concrete warning signs you can see as short bullet lines starting with "• ", then one line starting with "Do this: " telling them how to verify safely. Never ask for or repeat sensitive data. Max 100 words.`,
  lesson: `You are a financial literacy coach for students. Given a detected spending pattern, teach the underlying concept in 2 short sentences, then add one line starting with "Try this: " with a concrete habit. Never recommend specific investments or promise returns. Max 70 words.`,
  goal: `You are a savings planner for students. Given a goal, target amount and timeframe, explain an educational savings plan: the monthly and weekly amount needed, and one realistic adjustment from their spending that could fund it. Use ₹. Never promise returns. Max 90 words.`,
  insight: `You are MoneyGuard AI. Given a transaction summary, give 2 short insight lines starting with "• " about what changed and the behaviour causing it, then one line starting with "Lesson: ". Use ₹. Never recommend investments or promise returns. Max 90 words.`,
};

export const askEngine = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured yet.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        reasoning: { effort: "low" },
        instructions: SYSTEM[data.mode],
        input: data.context
          ? `Data:\n${data.context}\n\nRequest:\n${data.question}`
          : data.question,
      }),
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("The engine is busy right now. Try again shortly.");
      if (res.status === 402)
        throw new Error("AI credits are used up. Add credits to keep the engine running.");
      if (res.status === 403) throw new Error("AI access is blocked for this workspace.");
      throw new Error(`The engine could not answer (${res.status}). ${detail.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
            text += evt.delta;
          } else if (evt.type === "response.completed" && !text) {
            text = evt.response?.output_text ?? "";
          }
        } catch {
          /* ignore partial frames */
        }
      }
    }

    return { text: text.trim() || "The engine had nothing to add on that one — try rephrasing." };
  });
