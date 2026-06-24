"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import { useBrewerState } from "@/lib/brewer-state";
import { AssistantChat } from "@/components/AssistantChat";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const { inputs, result, chatLabel } = useBrewerState();

  const diagnosisContext = result
    ? {
        problem: result.problem,
        primary_diagnosis: result.primary_diagnosis,
        feature_drivers: result.feature_drivers,
        soft_slr_paths: result.soft_slr_paths,
        touched_features: result.touched_features,
        defaulted_feature_count: result.defaulted_features?.length,
        methodology_note: result.methodology_note,
      }
    : null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-accent-strong"
      >
        {open ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        {open ? "Chat schließen" : "Brau-Assistent"}
      </button>

      {open && (
        <div className="fixed bottom-20 right-5 z-50 flex h-[34rem] w-96 flex-col rounded-xl border border-border bg-surface shadow-2xl">
          <div className="rounded-t-xl border-b border-border bg-accent-soft px-4 py-2.5">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-strong">
              <Bot className="h-4 w-4" />
              Brau-Assistent
            </p>
            <p className="text-xs text-ink-faint">Kontext: {chatLabel}</p>
          </div>
          <div className="flex-1 overflow-hidden px-4 py-3">
            <AssistantChat
              ownProfile={inputs}
              diagnosisContext={diagnosisContext}
              greeting="Hallo! Frag mich etwas zu deinem Bier, einer Brauprozess-Stufe oder der Methodik. Ich nutze nur die echten Zahlen aus dem Dashboard."
              suggestions={
                result
                  ? ["Was soll ich zuerst ändern?", "Erklär den größten Hebel", "Wie verlässlich ist das?"]
                  : ["Wie funktioniert das Dashboard?", "Was bedeutet SHAP hier?"]
              }
              scrollClass="h-[22rem]"
            />
          </div>
        </div>
      )}
    </>
  );
}
