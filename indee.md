import React, { useState } from 'react';
import { Beaker, TrendingUp, BarChart3, ClipboardList, History, Info, ChevronRight, CheckCircle2, AlertTriangle, Settings2 } from 'lucide-react';

export default function BrauCoachApp() {
  const [activeTab, setActiveTab] = useState('eingabe');
  const [expertMode, setExpertMode] = useState(false);

  // Mock-Daten für die Eingabe
  const [inputs, setInputs] = useState({
    stammwuerze: 12.5,
    alkohol: 5.2,
    banane: 3,
    nelke: 4,
    koerper: 3,
    saeure: 2,
    spritzigkeit: 4,
    offflavor: 1
  });

  const handleInputChange = (e) => {
    setInputs({ ...inputs, [e.target.name]: parseFloat(e.target.value) });
  };

  // Navigations-Tabs
  const tabs = [
    { id: 'eingabe', name: '1. Mein Bier', icon: <Beaker className="w-5 h-5" /> },
    { id: 'prognose', name: '2. Prognose', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'prozess', name: '3. Prozess-Stufen', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'schritte', name: '4. Nächste Schritte', icon: <ClipboardList className="w-5 h-5" /> },
    { id: 'verlauf', name: '5. Verlauf', icon: <History className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-amber-600 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Beaker className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Brau-Coach AI</h1>
              <p className="text-amber-100 text-sm">Mein Bier verstehen und gezielt verbessern</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm bg-amber-700 px-3 py-1.5 rounded-full">
            <Info className="w-4 h-4" />
            <span>Hefeweizen-Modell V1</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="md:w-64 flex-shrink-0">
          <nav className="flex flex-col space-y-2 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Workflow</h2>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-amber-50 text-amber-700 font-semibold border-l-4 border-amber-500'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100 p-6 md:p-8 min-h-[600px]">
          
          {/* SCREEN 1: EINGABE */}
          {activeTab === 'eingabe' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex justify-between items-end border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Mein Bier bewerten</h2>
                  <p className="text-slate-500 mt-1">Gib die Kerndaten deines aktuellen Suds ein.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-slate-500">Expertenmodus</span>
                  <button 
                    onClick={() => setExpertMode(!expertMode)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${expertMode ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${expertMode ? 'translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Makro-Daten */}
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center"><Settings2 className="w-5 h-5 mr-2 text-amber-500"/> Makro-Parameter</h3>
                  <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Stammwürze (°P): {inputs.stammwuerze}</label>
                      <input type="range" name="stammwuerze" min="10" max="16" step="0.1" value={inputs.stammwuerze} onChange={handleInputChange} className="w-full accent-amber-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Alkohol (Vol.-%): {inputs.alkohol}</label>
                      <input type="range" name="alkohol" min="4.0" max="7.0" step="0.1" value={inputs.alkohol} onChange={handleInputChange} className="w-full accent-amber-500" />
                    </div>
                  </div>
                </div>

                {/* Sensorik */}
                <div className="space-y-6">
                  <h3 className="font-semibold text-lg flex items-center"><Beaker className="w-5 h-5 mr-2 text-amber-500"/> Sensorik (1-5)</h3>
                  <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {['banane', 'nelke', 'koerper', 'saeure', 'spritzigkeit', 'offflavor'].map((attr) => (
                      <div key={attr} className="flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-700 capitalize w-1/3">{attr}</label>
                        <input type="range" name={attr} min="1" max="5" step="1" value={inputs[attr]} onChange={handleInputChange} className="w-1/2 accent-amber-500" />
                        <span className="w-8 text-right font-semibold">{inputs[attr]}</span>
                      </div>
                    ))}
                    {expertMode && (
                      <div className="pt-4 mt-4 border-t border-slate-200 text-sm text-slate-500 italic text-center">
                        + 14 weitere Deskriptoren freigeschaltet (Mockup)
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Kontext (nicht für Modell) */}
              <div className="pt-6 border-t">
                <h3 className="font-semibold text-lg mb-4">Rezept- & Prozesskontext (Dokumentation)</h3>
                <textarea 
                  className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none" 
                  rows="3" 
                  placeholder="Z.B. Gärtemperatur 21°C, Hefe W68. Was stört dich am meisten an diesem Sud?"
                ></textarea>
              </div>

              <div className="flex justify-end pt-4">
                <button onClick={() => setActiveTab('prognose')} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center transition-colors">
                  Zur Prognose <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: JURY-PROGNOSE */}
          {activeTab === 'prognose' && (
            <div className="space-y-8 animate-in fade-in duration-300">
               <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-800">Erwartete Jury-Bewertung</h2>
                <p className="text-slate-500 mt-1">So würde dein Bier wahrscheinlich im Mittel abschneiden.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-center justify-center py-8">
                {/* Score Circle */}
                <div className="relative flex items-center justify-center w-48 h-48 rounded-full border-8 border-slate-100 shadow-inner">
                  <div className="absolute inset-0 rounded-full border-8 border-amber-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 80%, 0 80%)' }}></div>
                  <div className="text-center">
                    <span className="text-5xl font-extrabold text-slate-800">4.1</span>
                    <span className="text-xl text-slate-400">/ 5</span>
                    <p className="text-sm text-slate-500 mt-2 font-medium">± 0.2 Unsicherheit</p>
                  </div>
                </div>

                {/* Benchmark */}
                <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-100 w-full">
                  <h3 className="font-semibold mb-4 text-slate-700">Benchmark: Historische Hefeweizen</h3>
                  <div className="relative h-8 bg-slate-200 rounded-full mb-2 overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-[20%] right-[30%] bg-amber-200 opacity-50"></div>
                    <div className="absolute top-0 bottom-0 left-[75%] w-1 bg-amber-600 z-10" title="Dein Bier"></div>
                    <div className="absolute top-0 bottom-0 left-[60%] w-1 bg-slate-400 z-10" title="Durchschnitt"></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Mangelhaft (1)</span>
                    <span>Durchschnitt (3.8)</span>
                    <span className="font-bold text-amber-700">Dein Bier (4.1)</span>
                    <span>Exzellent (5)</span>
                  </div>
                  <p className="mt-4 text-sm text-slate-600 bg-white p-3 rounded-lg border border-slate-100">
                    Dein Bier liegt im <strong>oberen Quartil</strong> der historischen Datenbank. Es weist eine überdurchschnittliche Ausprägung bei estrig-fruchtigen Noten auf.
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-8 border-t">
                 <button onClick={() => setActiveTab('eingabe')} className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium">Zurück</button>
                <button onClick={() => setActiveTab('prozess')} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center transition-colors">
                  Prozess-Hebel analysieren <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: PROZESS-STUFEN */}
          {activeTab === 'prozess' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-800">Einfluss der Prozess-Stufen (SLR)</h2>
                <p className="text-slate-500 mt-1">Welche Brauphase zieht deine Bewertung hoch oder runter?</p>
              </div>

              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div className="space-y-4">
                  {/* Mock Waterfall / Bar Chart */}
                  {[
                    { name: 'Gärung', value: -0.4, color: 'bg-red-400', desc: 'Zu wenig Banane, leichte Off-Flavors' },
                    { name: 'Maischen', value: 0.3, color: 'bg-emerald-400', desc: 'Guter Körper, optimale Süffigkeit' },
                    { name: 'Würzekochen', value: 0.1, color: 'bg-emerald-300', desc: 'Unauffällig, stabiler Beitrag' },
                    { name: 'Mälzen/Schroten', value: 0.05, color: 'bg-emerald-200', desc: 'Neutral' },
                    { name: 'Darren', value: 0.0, color: 'bg-slate-300', desc: 'Kein signifikanter Einfluss' },
                    { name: 'Reifung/Lagerung', value: -0.1, color: 'bg-red-300', desc: 'Leichter Verlust an Spritzigkeit' },
                    { name: 'Abfüllung', value: 0.0, color: 'bg-slate-300', desc: 'Neutral' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center group cursor-pointer">
                      <div className="w-1/3 text-sm font-medium text-slate-700">{item.name}</div>
                      <div className="w-2/3 flex items-center relative h-8">
                        {/* Center Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300"></div>
                        
                        {/* Bar */}
                        <div className="flex-1 flex justify-end pr-2">
                          {item.value < 0 && (
                            <div 
                              className={`h-6 ${item.color} rounded-l-md flex items-center px-2 text-xs font-bold text-white transition-all`}
                              style={{ width: `${Math.abs(item.value) * 200}px` }}
                            >
                              {item.value}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 flex justify-start pl-2">
                          {item.value > 0 && (
                            <div 
                              className={`h-6 ${item.color} rounded-r-md flex items-center px-2 text-xs font-bold text-white transition-all`}
                              style={{ width: `${Math.abs(item.value) * 200}px` }}
                            >
                              +{item.value}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="w-1/3 pl-4 text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between text-sm text-slate-500">
                  <span>Methodik: SLR-Domänengruppen (Aggregierte Shapley-Werte)</span>
                  <button className="text-amber-600 hover:underline">Methodik-Details (HSIC) ansehen</button>
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t">
                 <button onClick={() => setActiveTab('prognose')} className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium">Zurück</button>
                <button onClick={() => setActiveTab('schritte')} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center transition-colors">
                  Aktion ableiten <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: NÄCHSTE SCHRITTE */}
          {activeTab === 'schritte' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold text-slate-800">Iterativer Brau-Coach</h2>
                <p className="text-slate-500 mt-1">Was solltest du als Nächstes testen, um den Score zu verbessern?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Primary Lever */}
                <div className="bg-red-50 border border-red-100 p-6 rounded-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Größter Hebel
                  </div>
                  <h3 className="text-lg font-bold text-red-800 mb-2 mt-2 flex items-center">
                    <AlertTriangle className="w-5 h-5 mr-2" /> Gärung anpassen
                  </h3>
                  <p className="text-sm text-red-700 mb-4">
                    Die Sensorik zeigt einen negativen Ausschlag bei den Gärungs-Deskriptoren (zu wenig Isoamylacetat/Banane, leichter Off-Flavor).
                  </p>
                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Test-Vorschläge für nächsten Sud:</h4>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li className="flex items-start"><ChevronRight className="w-4 h-4 mr-1 mt-0.5 text-red-500 flex-shrink-0" /> Gärtemperatur um 1-2°C erhöhen (fördert Esterbildung).</li>
                      <li className="flex items-start"><ChevronRight className="w-4 h-4 mr-1 mt-0.5 text-red-500 flex-shrink-0" /> Pitching-Rate überprüfen (Underpitching kann Off-Flavors begünstigen).</li>
                    </ul>
                  </div>
                </div>

                {/* Secondary Lever */}
                <div className="bg-amber-50 border border-amber-100 p-6 rounded-xl relative">
                  <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    Sekundärer Hebel
                  </div>
                  <h3 className="text-lg font-bold text-amber-800 mb-2 mt-2">Reifung / Lagerung</h3>
                  <p className="text-sm text-amber-700 mb-4">
                    Leichte Abzüge bei der Spritzigkeit deuten auf CO2-Verlust oder suboptimale Spundung hin.
                  </p>
                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">Test-Vorschläge:</h4>
                    <ul className="text-sm text-slate-700 space-y-2">
                      <li className="flex items-start"><ChevronRight className="w-4 h-4 mr-1 mt-0.5 text-amber-500 flex-shrink-0" /> Spunddruck leicht anheben oder früher spunden.</li>
                    </ul>
                  </div>
                </div>

                {/* Positive Feedback */}
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl md:col-span-2">
                  <h3 className="text-lg font-bold text-emerald-800 mb-2 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2" /> Maischen & Abfüllung stabil
                  </h3>
                  <p className="text-sm text-emerald-700">
                    Körper und Vollmundigkeit werden exzellent bewertet. Der aktuelle Maischplan (Rasten) sollte beibehalten werden. Abfüllung ist unkritisch.
                  </p>
                </div>

              </div>

              <div className="text-xs text-slate-400 italic text-center mt-4">
                Hinweis: Die KI liefert korrelative Hebel basierend auf historischen Jury-Daten, keine kausalen Braugarantien.
              </div>

              <div className="flex justify-between pt-4 border-t">
                 <button onClick={() => setActiveTab('prozess')} className="text-slate-500 hover:text-slate-800 px-4 py-2 font-medium">Zurück</button>
                <button onClick={() => setActiveTab('verlauf')} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-semibold flex items-center transition-colors">
                  Sud speichern & beenden <CheckCircle2 className="w-5 h-5 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: VERLAUF */}
          {activeTab === 'verlauf' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="border-b pb-4 flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Second Brain / Verlauf</h2>
                  <p className="text-slate-500 mt-1">Historie deiner Sude und die Auswirkungen deiner Anpassungen.</p>
                </div>
                <button className="text-amber-600 hover:bg-amber-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-amber-200">
                  + Neuen Sud starten
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 text-sm border-b border-slate-200">
                      <th className="p-4 font-semibold">Datum / Sud</th>
                      <th className="p-4 font-semibold">Score</th>
                      <th className="p-4 font-semibold">Hauptmaßnahme gegenüber Vorgänger</th>
                      <th className="p-4 font-semibold text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">Hefeweizen #44 (Aktuell)</div>
                        <div className="text-xs text-slate-500">Heute</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          4.1 <TrendingUp className="w-3 h-3 ml-1" />
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        Maischplan angepasst (Eiweißrast verlängert) → Körper hat sich signifikant verbessert. Gärung bleibt Problemzone.
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-amber-600 text-sm font-medium hover:underline">Vergleichen</button>
                      </td>
                    </tr>
                    <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">Hefeweizen #43</div>
                        <div className="text-xs text-slate-500">Vor 3 Wochen</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                          3.8 
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        Neuer Hefestamm (W68). Off-Flavors leicht gestiegen.
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-amber-600 text-sm font-medium hover:underline">Vergleichen</button>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors opacity-70">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">Hefeweizen #42</div>
                        <div className="text-xs text-slate-500">Vor 2 Monaten</div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                          3.9
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        Basis-Rezept.
                      </td>
                      <td className="p-4 text-right">
                        <button className="text-amber-600 text-sm font-medium hover:underline">Vergleichen</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}