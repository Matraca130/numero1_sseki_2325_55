// ============================================================
// Axon — Algorithmic Art: TypeScript types
// ============================================================

/** All available engine keys */
export type EngineKey =
  | 'cardiovascular'
  | 'respiratorio'
  | 'dolor'
  | 'digestivo'
  | 'nervioso'
  | 'renal-endocrino'
  | 'semiologia-general'
  | 'semiologia-regional'
  | 'hematologia'
  | 'microbiologia';

// ── Parameter schema ──────────────────────────────────────

export interface SliderParamDefinition {
  type: 'slider';
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
}

export interface SelectParamDefinition {
  type: 'select';
  label: string;
  options: { value: string; label: string }[];
  default: string;
}

export interface ColorParamDefinition {
  type: 'color';
  label: string;
  default: string;
}

export interface BooleanParamDefinition {
  type: 'boolean';
  label: string;
  default: boolean;
}

export type ParamDefinition =
  | SliderParamDefinition
  | SelectParamDefinition
  | ColorParamDefinition
  | BooleanParamDefinition;

/** Map of param key → definition */
export type ParamSchema = Record<string, ParamDefinition>;

// ── Preset ────────────────────────────────────────────────

export interface PresetDefinition {
  key: string;
  label: string;
  description?: string;
  params: Record<string, number | string | boolean>;
}

// ── Engine params instance ────────────────────────────────

/** Live param values — derived from ParamSchema defaults or user changes */
export type ParamValues = Record<string, number | string | boolean>;

// ── Sketch factory ────────────────────────────────────────

/**
 * The function exported from each engine file.
 * Receives a p5 instance and a mutable ref to live params.
 * Returns nothing (p5 instance mode — setup/draw attached to p).
 */
export type SketchFactory = (
  p: import('p5'),
  paramsRef: React.MutableRefObject<ParamValues>,
) => void;

// ── Engine module interface ───────────────────────────────

export interface EngineModule {
  /** p5 sketch factory */
  sketch: SketchFactory;
  /** Parameter schema for this engine */
  paramSchema: ParamSchema;
  /** Available presets */
  presets: PresetDefinition[];
  /** Display name for the engine */
  displayName: string;
  /** Short description */
  description?: string;
}

// ── Sketch interaction (analytics) ───────────────────────

export interface SketchInteraction {
  engine: EngineKey;
  action: 'view' | 'param_change' | 'preset_select' | 'seed_change' | 'fullscreen' | 'screenshot';
  param_key?: string;
  param_value?: string;
  seed?: number;
  duration_ms?: number;
}
