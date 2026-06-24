import type { Metadata } from "next";
import "./globals.css";
import { Beaker } from "lucide-react";
import { ChatPanel } from "@/components/ChatPanel";
import { BrewerProvider } from "@/lib/brewer-state";

export const metadata: Metadata = {
  title: "Brau-Coach AI · Hefeweizen-Modell V1",
  description: "Mein Bier verstehen und gezielt verbessern",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className="h-full">
      <body className="min-h-full flex flex-col bg-slate-50 antialiased">
        <BrewerProvider>
          <header className="bg-amber-600 text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <Beaker className="h-7 w-7" />
                <div>
                  <h1 className="text-lg font-bold leading-tight">Brau-Coach AI</h1>
                  <p className="text-xs text-amber-100">Mein Bier verstehen und gezielt verbessern</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-700 px-3 py-1 text-xs font-semibold">
                Hefeweizen-Modell V1
              </span>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <ChatPanel />
        </BrewerProvider>
      </body>
    </html>
  );
}
