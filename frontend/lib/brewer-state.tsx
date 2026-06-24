"use client";

import { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from "react";
import type { PredictResult } from "./types";

export type TabId = "mein-bier" | "befund" | "was-tun" | "verlauf";

interface BrewerState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  inputs: Record<string, number>;
  setInputs: Dispatch<SetStateAction<Record<string, number>>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  /** Jury-Kategorien außerhalb des Modells (Farbe, Bittere, …) — Sensorik-Kontext. */
  context: Record<string, number>;
  setContext: Dispatch<SetStateAction<Record<string, number>>>;
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
  const [context, setContext] = useState<Record<string, number>>({});
  const [result, setResult] = useState<PredictResult | null>(null);

  function resetForNewBatch() {
    setInputs({});
    setNote("");
    setContext({});
    setResult(null);
    setActiveTab("mein-bier");
  }

  const chatLabel = result ? "Aktuelle Diagnose" : "Allgemeine Übersicht";

  return (
    <BrewerContext.Provider
      value={{
        activeTab,
        setActiveTab,
        inputs,
        setInputs,
        note,
        setNote,
        context,
        setContext,
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
