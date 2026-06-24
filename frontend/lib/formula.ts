/**
 * Jury-Formel-Synthese.
 *
 * TOTAL = appearance·0.16 + bouquet·0.20 + taste·0.40 + overall·0.24
 *   appearance = Farbe + Schaum
 *   bouquet    = Geruch
 *   taste      = Aroma + Bittere + Rezenz + Nachtrunk
 *   overall    = Gesamteindruck
 *
 * Diese 8 Kategorien sind im Modell BEWUSST ausgeschlossen (sonst spiegelt SHAP nur
 * die Formelgewichte). Hier nutzen wir sie als brauer-erfassten Kontext, um die Lücke
 * zwischen Modell-Befund und tatsächlicher Jury-Wertung sichtbar zu machen.
 */

export interface FormulaBlock {
  key: string;
  label: string;
  weight: number;
  members: string[];
}

export const FORMULA_BLOCKS: FormulaBlock[] = [
  { key: "appearance", label: "Aussehen", weight: 0.16, members: ["Farbe", "Schaum"] },
  { key: "bouquet", label: "Geruch", weight: 0.2, members: ["Geruch"] },
  { key: "taste", label: "Geschmack", weight: 0.4, members: ["Aroma", "Bittere", "Rezenz", "Nachtrunk"] },
  { key: "overall", label: "Gesamteindruck", weight: 0.24, members: ["Gesamteindruck"] },
];

/** Alle Jury-Kategorien als flache Liste (für die Erfassungs-Slider). */
export const JURY_CATEGORIES: { key: string; block: string }[] = FORMULA_BLOCKS.flatMap((b) =>
  b.members.map((m) => ({ key: m, block: b.key }))
);

export interface BlockSynthesis {
  key: string;
  label: string;
  weight: number;
  /** Mittlere Brauer-Bewertung der Block-Mitglieder auf 1–5, null wenn nicht erfasst. */
  rating: number | null;
  /** 0–1 normalisierte Stärke des Blocks (rating skaliert von 1–5). */
  strength: number | null;
  /** Gewichteter Anteil am Jury-Score (weight · strength), null wenn nicht erfasst. */
  weightedShare: number | null;
}

export interface Synthesis {
  blocks: BlockSynthesis[];
  /** Anteil der erfassten Jury-Wertung (0–1), der aus Kategorien außerhalb des Modells stammt. */
  ratedWeight: number;
  /** Schwächster erfasster Block (größter ungenutzter Hebel), oder null. */
  weakestBlock: BlockSynthesis | null;
}

/**
 * Rechnet aus den erfassten Jury-Kategorien (1–5-Slider) die blockweise Synthese.
 * `context` ist `{ Farbe: 4, Bittere: 2, ... }`; fehlende Werte zählen als nicht erfasst.
 */
export function computeSynthesis(context: Record<string, number>): Synthesis {
  const blocks: BlockSynthesis[] = FORMULA_BLOCKS.map((b) => {
    const rated = b.members.map((m) => context[m]).filter((v): v is number => typeof v === "number");
    if (rated.length === 0) {
      return { key: b.key, label: b.label, weight: b.weight, rating: null, strength: null, weightedShare: null };
    }
    const rating = rated.reduce((a, v) => a + v, 0) / rated.length;
    const strength = (rating - 1) / 4; // 1→0, 5→1
    return {
      key: b.key,
      label: b.label,
      weight: b.weight,
      rating,
      strength,
      weightedShare: b.weight * strength,
    };
  });

  const ratedWeight = blocks
    .filter((b) => b.rating != null)
    .reduce((a, b) => a + b.weight, 0);

  const ratedBlocks = blocks.filter((b) => b.strength != null) as (BlockSynthesis & { strength: number })[];
  const weakestBlock =
    ratedBlocks.length > 0
      ? ratedBlocks.reduce((min, b) => (b.strength < min.strength ? b : min))
      : null;

  return { blocks, ratedWeight, weakestBlock };
}
