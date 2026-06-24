"use client";

import { Sidebar } from "@/components/Sidebar";
import { useBrewerState } from "@/lib/brewer-state";
import { MeinBierTab } from "@/components/tabs/MeinBierTab";
import { PrognoseTab } from "@/components/tabs/PrognoseTab";
import { ProzessStufenTab } from "@/components/tabs/ProzessStufenTab";
import { NaechsteSchritteTab } from "@/components/tabs/NaechsteSchritteTab";
import { VerlaufTab } from "@/components/tabs/VerlaufTab";

export default function WizardPage() {
  const { activeTab } = useBrewerState();

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      <aside className="md:w-56">
        <Sidebar />
      </aside>
      <div key={activeTab} className="flex-1 animate-in fade-in duration-300">
        {activeTab === "mein-bier" && <MeinBierTab />}
        {activeTab === "prognose" && <PrognoseTab />}
        {activeTab === "prozess-stufen" && <ProzessStufenTab />}
        {activeTab === "naechste-schritte" && <NaechsteSchritteTab />}
        {activeTab === "verlauf" && <VerlaufTab />}
      </div>
    </div>
  );
}
