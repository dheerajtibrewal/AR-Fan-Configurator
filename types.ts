export enum FanFinish {
  MATTE = 'Matte',
  METALLIC = 'Metallic',
  PEARL = 'Pearl',
}

export enum AppStep {
  CHOOSE_FAN = 1,
  PERSONALIZE = 2,
  VISUALIZE = 3,
}

export interface FanConfig {
  color: string; // Hex code
  finish: FanFinish;
}

export type RecommendationTier = 'Blend' | 'Balanced' | 'Accent';

export interface GroundingMetadata {
  based_on: 'dominant_tones' | 'ceiling_tone' | 'derived' | 'metallic';
  source_index: number | null;
}

export interface AIRecommendation {
  tier: RecommendationTier;
  label: string;
  hex: string;
  finish: FanFinish;
  reason: string;
  grounding?: GroundingMetadata; // New field to prove origin
}

export interface AIRoomContext {
  dominant_tones: string[];
  ceiling_tone: string | null;
  lighting: 'warm' | 'neutral' | 'cool' | null;
  style: string | null;
  material_cues: string[];
  contrast_level: 'low' | 'medium' | 'high' | null;
  confidence: number;
}

export interface AIAnalysisResult {
  request_id: string;      // UUID to verify freshness
  image_fingerprint: string; // Hash to verify grounding
  valid: boolean;
  user_message: string;
  room_context: AIRoomContext | null;
  suggestions: AIRecommendation[];
}

export interface FanModelMaterialConfig {
  targetMaterialNames: string[];
}