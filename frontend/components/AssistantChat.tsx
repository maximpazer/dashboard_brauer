"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Send } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api";
import { Markdown } from "@/components/ui/Markdown";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  seed?: boolean; // einleitende Begrüßung — nicht Teil des Gesprächsverlaufs
}

export interface AssistantChatHandle {
  ask: (text: string, options?: { hidden?: boolean }) => void;
}

interface Props {
  ownProfile?: Record<string, number> | null;
  diagnosisContext?: Record<string, unknown> | null;
  greeting?: string;
  suggestions?: string[];
  placeholder?: string;
  scrollClass?: string;
}

export const AssistantChat = forwardRef<AssistantChatHandle, Props>(function AssistantChat(
  { ownProfile, diagnosisContext, greeting, suggestions = [], placeholder = "Frage stellen…", scrollClass = "h-80" },
  ref
) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    greeting ? [{ role: "assistant", content: greeting, seed: true }] : []
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function ask(text: string, options?: { hidden?: boolean }) {
    const message = text.trim();
    if (!message || loading) return;
    const history = messages
      .filter((m) => !m.seed)
      .map((m) => ({ role: m.role, content: m.content }));
    if (!options?.hidden) {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
    }
    setLoading(true);
    try {
      const res = await api.chat({
        message,
        history,
        own_profile: ownProfile && Object.keys(ownProfile).length > 0 ? ownProfile : null,
        diagnosis_context: diagnosisContext ?? null,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠ Fehler bei der Anfrage: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  useImperativeHandle(ref, () => ({ ask }));

  function submit() {
    const text = input;
    setInput("");
    ask(text);
  }

  return (
    <div className="flex flex-col">
      <div ref={scrollRef} className={clsx("space-y-3 overflow-y-auto pr-1", scrollClass)}>
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-8 rounded-lg bg-accent px-3 py-2 text-sm text-white whitespace-pre-wrap">
              {m.content}
            </div>
          ) : (
            <div key={i} className="mr-6 rounded-lg bg-surface-muted px-3 py-2">
              <Markdown>{m.content}</Markdown>
            </div>
          )
        )}
        {loading && (
          <div className="mr-6 rounded-lg bg-surface-muted px-3 py-2 text-sm text-ink-faint">Denkt nach …</div>
        )}
      </div>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={loading}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-soft hover:border-accent/50 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          onClick={submit}
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-white hover:bg-accent-strong disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});
