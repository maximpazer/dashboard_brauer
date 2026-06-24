"use client";

import { ClipboardList, TrendingUp, BarChart3, ListChecks, History, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useBrewerState, type TabId } from "@/lib/brewer-state";

const ITEMS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "mein-bier", label: "Problem erfassen", icon: ClipboardList },
  { id: "naechste-schritte", label: "Diagnose", icon: ListChecks },
  { id: "prognose", label: "Prognose", icon: TrendingUp },
  { id: "prozess-stufen", label: "Prozess-Stufen", icon: BarChart3 },
  { id: "verlauf", label: "Verlauf", icon: History },
];

export function Sidebar() {
  const { activeTab, setActiveTab, result } = useBrewerState();

  return (
    <nav className="flex flex-col space-y-2 rounded-xl bg-white p-4 shadow-sm">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        const disabled = item.id !== "mein-bier" && item.id !== "verlauf" && !result;
        return (
          <button
            key={item.id}
            disabled={disabled}
            onClick={() => setActiveTab(item.id)}
            className={clsx(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active
                ? "border-l-4 border-amber-500 bg-amber-50 text-amber-800"
                : disabled
                  ? "cursor-not-allowed text-slate-300"
                  : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
