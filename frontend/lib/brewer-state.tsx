"use client";

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from "react";
import type { PredictResult } from "./types";

export type TabId = "mein-bier" | "prognose" | "prozess-stufen" | "naechste-schritte" | "verlauf";

interface BrewerState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  inputs: Record<string, number>;
  setInputs: Dispatch<SetStateAction<Record<string, number>>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  result: PredictResult | null;
  setResult: Dispatch<SetStateAction<PredictResult | null>>;
  resetForNewBatch: () => void;
  chatLabel: string;
}

const BrewerContext = createContext<BrewerState | null>(null);

export function BrewerProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabId>("mein-bier");
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [result, setResult] = useState<PredictResult | null>(null);

  function resetForNewBatch() {
    setInputs({});
    setNote("");
    setResult(null);
    setActiveTab("mein-bier");
  }

  const chatLabel = result ? "Mein aktueller Sud" : "Allgemeine Übersicht";

  return (
    <BrewerContext.Provider
      value={{
        activeTab,
        setActiveTab,
        inputs,
        setInputs,
        note,
        setNote,
        result,
        setResult,
        resetForNewBatch,
        chatLabel,
      }}
    >
      {children}
    </BrewerContext.Provider>
  );
}

export function useBrewerState() {
  const ctx = useContext(BrewerContext);
  if (!ctx) throw new Error("useBrewerState muss innerhalb von BrewerProvider verwendet werden.");
  return ctx;
}
