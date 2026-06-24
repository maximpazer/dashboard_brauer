import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "neutral" | "accent" | "positive" | "negative";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-surface-muted text-ink-soft",
  accent: "border-accent/30 bg-accent-soft text-ink-soft",
  positive: "border-positive/30 bg-positive-soft text-ink-soft",
  negative: "border-negative/30 bg-negative-soft text-ink-soft",
};

const ICON_TONES: Record<Tone, string> = {
  neutral: "text-ink-faint",
  accent: "text-accent",
  positive: "text-positive",
  negative: "text-negative",
};

export function InfoNote({
  children,
  tone = "neutral",
  icon: Icon,
}: {
  children: ReactNode;
  tone?: Tone;
  icon?: LucideIcon;
}) {
  return (
    <div className={clsx("flex gap-2 rounded-lg border p-3 text-xs leading-relaxed", TONES[tone])}>
      {Icon && <Icon className={clsx("mt-0.5 h-4 w-4 shrink-0", ICON_TONES[tone])} />}
      <div>{children}</div>
    </div>
  );
}
