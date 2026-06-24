"use client";

import { ClipboardList, Stethoscope, Wrench, History, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { useBrewerState, type TabId } from "@/lib/brewer-state";

const ITEMS: { id: TabId; label: string; sub: string; icon: LucideIcon }[] = [
  { id: "mein-bier", label: "Mein Bier", sub: "Erfassen", icon: ClipboardList },
  { id: "befund", label: "Befund", sub: "Wo stehe ich?", icon: Stethoscope },
  { id: "was-tun", label: "Was tun?", sub: "Stellhebel", icon: Wrench },
  { id: "verlauf", label: "Verlauf", sub: "Second Brain", icon: History },
];

export function Sidebar() {
  const { activeTab, setActiveTab, result } = useBrewerState();

  return (
    <nav className="flex gap-2 overflow-x-auto rounded-xl border border-border bg-surface/80 p-2 shadow-sm">
      {ITEMS.map((item, idx) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        // Befund & Was-tun erst nach erster Diagnose.
        const disabled = (item.id === "befund" || item.id === "was-tun") && !result;
        return (
          <button
            key={item.id}
            disabled={disabled}
            onClick={() => setActiveTab(item.id)}
            className={clsx(
              "flex min-w-[11.5rem] items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors sm:min-w-0 sm:flex-1",
              active
                ? "bg-accent-soft text-accent-strong ring-1 ring-accent/30"
                : disabled
                  ? "cursor-not-allowed text-ink-faint/60"
                  : "text-ink-soft hover:bg-surface-muted"
            )}
            >
              <span
                className={clsx(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                  active ? "bg-accent text-white" : "bg-surface-muted text-ink-faint"
                )}
              >
                {idx + 1}
              </span>
              <span className="min-w-0">
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </span>
              <span className="hidden text-[11px] text-ink-faint sm:block">{item.sub}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
