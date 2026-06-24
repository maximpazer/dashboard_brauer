"use client";

import { Sidebar } from "@/components/Sidebar";
import { useBrewerState } from "@/lib/brewer-state";
import { ErfassenTab } from "@/components/tabs/ErfassenTab";
import { BefundTab } from "@/components/tabs/BefundTab";
import { WasTunTab } from "@/components/tabs/WasTunTab";
import { VerlaufTab } from "@/components/tabs/VerlaufTab";

export default function WizardPage() {
  const { activeTab } = useBrewerState();

  return (
    <div className="space-y-6">
      <Sidebar />
      <div key={activeTab} className="min-w-0 animate-in fade-in duration-300">
        {activeTab === "mein-bier" && <ErfassenTab />}
        {activeTab === "befund" && <BefundTab />}
        {activeTab === "was-tun" && <WasTunTab />}
        {activeTab === "verlauf" && <VerlaufTab />}
      </div>
    </div>
  );
}
