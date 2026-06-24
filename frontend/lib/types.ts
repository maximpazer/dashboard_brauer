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
  features?: Record<string, number>;
  explicit_features?: Record<string, number>;
  touched_features?: Record<string, TouchedFeature>;
  defaulted_features?: string[];
  problem?: ProblemKey;
  process_note?: string;
  feature_drivers?: FeatureDriver[];
  soft_slr_paths?: SoftSlrPath[];
  primary_diagnosis?: PrimaryDiagnosis;
  methodology_note?: string;
}

export type ProblemKey =
  | "body_low"
  | "creaminess_low"
  | "acid_high"
  | "fruit_mismatch"
  | "spice_mismatch"
  | "malt_low"
  | "oxidized"
  | "dms"
  | "diacetyl"
  | "yeasty"
  | "score_only";

export interface ProblemOption {
  key: ProblemKey;
  label: string;
  focus: string[];
}

export interface InputAxis {
  key: string;
  label: string;
  description?: string;
  features: string[];
}

export interface DiagnosisOptions {
  problems: ProblemOption[];
  rating_axes: InputAxis[];
  defect_axes: InputAxis[];
  model_note: string;
}

export interface GuidedRatings {
  body?: number | null;
  creaminess?: number | null;
  acid?: number | null;
  fruit?: number | null;
  spice?: number | null;
  malt_sweet?: number | null;
}

export interface DefectRatings {
  oxidation?: number | null;
  dms?: number | null;
  diacetyl?: number | null;
  yeasty?: number | null;
  metallic?: number | null;
  lightstruck?: number | null;
}

export interface KnownParams {
  stammwuerze?: number | null;
  alkoholgehalt?: number | null;
}

export interface DiagnoseRequestBody {
  problem: ProblemKey;
  ratings: GuidedRatings;
  defects: DefectRatings;
  known_params: KnownParams;
  process_note: string;
  expert_features?: Record<string, number>;
}

export interface TouchedFeature {
  source: "rating" | "defect" | "known_param" | "problem_default";
  axis: string;
  input_value: number;
}

export interface FeatureDriver {
  feature: string;
  value: number;
  direction: "positiv" | "negativ" | "neutral";
  touched_by_brewer?: boolean;
  hint: string;
}

export interface SoftMembership {
  phase: string;
  weight: number;
  evidence_count: number;
  is_hard_phase: boolean;
  summary: string;
}

export interface SoftSlrPath {
  feature: string;
  hard_phase: string | null;
  hint: string;
  memberships: SoftMembership[];
  explanation: string;
  top_soft_phases: string[];
}

export interface PrimaryDiagnosis {
  phase: string | null;
  headline: string;
  detail: string;
  next_questions: string[];
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
  soft_assignment?: {
    enabled: boolean;
    source: string;
    role: string;
  };
  llm?: {
    model: string;
    role: string;
  };
}

export interface ChatRequestBody {
  message: string;
  beer_id?: number | null;
  own_profile?: Record<string, number> | null;
  focus_phase?: string | null;
  diagnosis_context?: Record<string, unknown> | null;
}

export interface ChatResponseBody {
  reply: string;
}
