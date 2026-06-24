"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useBrewerState } from "@/lib/brewer-state";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hallo! Frag mich etwas zu deinem Bier, einer Brauprozess-Stufe oder der Methodik. " +
        "Ich nutze nur die echten Zahlen aus dem Dashboard — keine erfundenen Brau-Fakten.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const { inputs, result, chatLabel } = useBrewerState();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await api.chat({
        message,
        own_profile: Object.keys(inputs).length > 0 ? inputs : null,
        diagnosis_context: result
          ? {
              problem: result.problem,
              primary_diagnosis: result.primary_diagnosis,
              feature_drivers: result.feature_drivers,
              soft_slr_paths: result.soft_slr_paths,
              touched_features: result.touched_features,
              defaulted_feature_count: result.defaulted_features?.length,
              methodology_note: result.methodology_note,
            }
          : null,
      });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠ Fehler bei der Anfrage: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-amber-700 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-amber-800"
      >
        {open ? "Chat schließen" : "💬 Frag den Brau-Assistenten"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[32rem] w-96 flex-col rounded-xl border border-neutral-200 bg-white shadow-2xl">
          <div className="rounded-t-xl border-b border-neutral-200 bg-amber-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-amber-900">Brau-Assistent</p>
            <p className="text-xs text-neutral-500">Kontext: {chatLabel}</p>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={clsxRole(m.role)}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-500">
                Denkt nach …
              </div>
            )}
          </div>
          <div className="flex gap-2 border-t border-neutral-200 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Frage stellen…"
              className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-amber-500 focus:outline-none"
            />
            <button
              onClick={send}
              disabled={loading}
              className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Senden
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function clsxRole(role: Message["role"]) {
  return role === "user"
    ? "ml-8 rounded-lg bg-amber-700 px-3 py-2 text-sm text-white"
    : "mr-8 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-800 whitespace-pre-wrap";
}
