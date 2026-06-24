export function Disclaimer({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-ink-soft">
      {children}
    </div>
  );
}
