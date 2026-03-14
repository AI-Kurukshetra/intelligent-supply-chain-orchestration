"use client";

import { useEffect, useState, useTransition } from "react";

export function AiQueryPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const submit = () => {
    if (!question.trim()) return;
    startTransition(async () => {
      const response = await fetch("/api/v1/ai/query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const payload = (await response.json().catch(() => null)) as { answer?: string; detail?: string } | null;
      setAnswer(payload?.answer ?? payload?.detail ?? "No answer available.");
    });
  };

  return (
    <>
      <button className="fixed bottom-6 right-6 z-40 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg" onClick={() => setOpen(true)}>
        AI Query
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/30 p-6" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Supply Chain Copilot</h2>
                <p className="text-sm text-slate-500">Ask natural-language questions about stockouts, suppliers, demand, or KPIs.</p>
              </div>
              <button className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                "Which products are at risk of stockout next week?",
                "Show me suppliers with OTIF below 90% this month",
                "What are the highest priority open exceptions?"
              ].map((prompt) => (
                <button key={prompt} className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700" onClick={() => setQuestion(prompt)}>{prompt}</button>
              ))}
            </div>
            <textarea className="mt-4 min-h-32 w-full rounded-3xl border border-slate-300 px-4 py-3 text-sm" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask about stockouts, OTIF, MRP, exceptions, or KPI trends..." />
            <div className="mt-4 flex justify-end">
              <button className="rounded-full bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isPending} onClick={submit}>Ask AI</button>
            </div>
            <div className="mt-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              {answer ?? "Your answer will appear here."}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
