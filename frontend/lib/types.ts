export interface Feature {
  name: string;
  hint: string;
  phase: string | null;
  min: number;
  max: number;
  median: number;
}

export interface PhaseSummary {
  name: string;
  n_features: number;
  importance: number;
  importance_pct: number;
  mean_signed: number;
  icon: string;
  summary: string;
  lever: string;
}

export interface GroupsSummary {
  n_beers: number;
  phases: PhaseSummary[];
  top_phase: string | null;
}

export interface Recommendation {
  phase: string;
  direction: "positiv" | "negativ" | "neutral";
  value: number;
  headline: string;
  detail: string;
  drivers: [string, number][];
}

export interface BenchmarkQuartiles1_5 {
  p25: number;
  p75: number;
  mean: number;
  min: number;
  max: number;
}

export interface PredictResult {
  predicted_total: number;
  base_value: number;
  feature_shap: Record<string, number>;
  group_shap: Record<string, number>;
  recommendations: Recommendation[];
  rmse: number;
  r2: number;
  n_beers: number;
  benchmark_percentile: number;
  score_1_5: number;
  score_1_5_uncertainty: number;
  benchmark_quartiles_1_5: BenchmarkQuartiles1_5;
}

export interface Batch {
  id: string;
  created_at: string;
  label: string;
  inputs: Record<string, number>;
  note: string;
  predicted_total: number;
  score_1_5: number;
  score_1_5_uncertainty: number;
  group_shap: Record<string, number>;
}

export interface FaithfulnessGroupPlayer {
  auc_ceiling: number;
  auc_slr: number;
  auc_hsic: number;
  retention_slr: number;
  retention_hsic: number;
  bootstrap_ci_slr: [number, number];
  bootstrap_ci_hsic: [number, number];
  diff_slr_minus_hsic: [number, number, number];
  bootstrap_p: number;
  wilcoxon_p: number;
  significant: boolean;
}

export interface MethodologyPayload {
  n_beers: number;
  n_features: number;
  test_r2_stored: number;
  k_groups: number;
  ari_slr_hsic: number;
  faithfulness_group_player: FaithfulnessGroupPlayer;
  stability: {
    hsic_ari_pairwise_mean: number;
    hsic_ari_pairwise_std: number;
    hsic_ari_vs_ref_mean: number;
    slr_ari: number;
  };
}

export interface ChatRequestBody {
  message: string;
  beer_id?: number | null;
  own_profile?: Record<string, number> | null;
  focus_phase?: string | null;
}

export interface ChatResponseBody {
  reply: string;
}
