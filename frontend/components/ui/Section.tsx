import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Section({
  title,
  hint,
  icon: Icon,
  action,
  className,
  children,
}: {
  title: string;
  hint?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx("rounded-xl border border-border bg-surface p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            {Icon && <Icon className="h-4 w-4 text-accent" />}
            {title}
          </h2>
          {hint && <p className="mt-1 max-w-2xl text-xs text-ink-faint">{hint}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
