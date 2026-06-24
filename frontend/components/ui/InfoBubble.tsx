"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";
import clsx from "clsx";

export function InfoBubble({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [open]);

  return (
    <span ref={ref} className={clsx("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Hinweis anzeigen"
        aria-expanded={open}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-ink-faint transition hover:border-accent/50 hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <Info className="h-4 w-4" />
      </button>
      {open && (
        <span className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-border bg-surface p-3 text-left text-xs leading-relaxed text-ink-soft shadow-xl">
          {text}
        </span>
      )}
    </span>
  );
}
