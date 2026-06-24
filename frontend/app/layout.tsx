import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Beaker } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { BrewerProvider } from "@/lib/brewer-state";

export const metadata: Metadata = {
  title: "Brau-Coach",
  description: "Mein Bier verstehen und gezielt verbessern",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col bg-canvas antialiased">
        <BrewerProvider>
          <header className="border-b border-border bg-canvas/85 backdrop-blur">
            <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
              <nav className="flex items-center">
                <Link
                  href="/"
                  className="hidden text-sm font-medium text-ink-faint transition hover:text-accent sm:inline"
                >
                  Dashboard
                </Link>
              </nav>

              <Link
                href="/"
                className="group flex items-center gap-3 rounded-xl px-2 py-1 transition hover:bg-surface-muted/60"
                aria-label="Zur Startseite"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface">
                  <Beaker className="h-5 w-5 text-accent" />
                </span>
                <span className="text-center">
                  <span className="block text-lg font-bold leading-tight tracking-tight text-ink">
                    Brau-Coach
                  </span>
                  <span className="block text-[11px] font-medium text-ink-faint">
                    Analyse und Stellhebel
                  </span>
                </span>
              </Link>

              <nav className="flex items-center justify-end">
                <Link
                  href="/methodik"
                  className="rounded-full border border-border px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-accent/50 hover:text-accent"
                >
                  Über das Modell
                </Link>
              </nav>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <ChatPanel />
        </BrewerProvider>
      </body>
    </html>
  );
}
