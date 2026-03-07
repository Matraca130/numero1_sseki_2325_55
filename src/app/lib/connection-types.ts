// ============================================================
// Axon — Connection Type Definitions
//
// Predefined relationship types between keywords, optimized
// for medical education across all years (basic → clinical).
//
// These types serve TWO purposes:
//   1. Professor CRUD: dropdown when creating connections
//   2. AI generation: determines flashcard/quiz question style
//
// The student popup does NOT display the type prominently —
// it's metadata for the AI engine.
//
// DB column: keyword_connections.connection_type TEXT (nullable)
// ============================================================

export interface ConnectionTypeConfig {
  /** DB value (snake_case, lowercase) */
  value: string;
  /** Human-readable label (Spanish) */
  label: string;
  /** Short description for professor tooltip */
  description: string;
  /** Whether the relationship has direction (A→B) or is symmetric (A↔B) */
  directional: boolean;
  /** Lucide icon name hint (for future UI) */
  iconHint: string;
  /** Tailwind color class for badge */
  color: string;
  /** Background color for badge */
  bg: string;
  /** AI prompt hint: what kind of question to generate */
  aiPromptHint: string;
}

export const CONNECTION_TYPES: ConnectionTypeConfig[] = [
  {
    value: 'prerequisito',
    label: 'Prerequisito',
    description: 'A debe entenderse antes de B',
    directional: true,
    iconHint: 'arrow-up-right',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    aiPromptHint: 'Por que es importante entender A antes de estudiar B',
  },
  {
    value: 'causa-efecto',
    label: 'Causa-Efecto',
    description: 'A produce o causa B',
    directional: true,
    iconHint: 'zap',
    color: 'text-red-600',
    bg: 'bg-red-50',
    aiPromptHint: 'Cual es la etiologia de B / Que consecuencias tiene A',
  },
  {
    value: 'mecanismo',
    label: 'Mecanismo',
    description: 'A explica como funciona B',
    directional: true,
    iconHint: 'settings',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    aiPromptHint: 'Explica el mecanismo de accion de A sobre B',
  },
  {
    value: 'dx-diferencial',
    label: 'Dx Diferencial',
    description: 'A y B se presentan de forma similar',
    directional: false,
    iconHint: 'git-branch',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    aiPromptHint: 'Como diferencias A de B clinicamente',
  },
  {
    value: 'tratamiento',
    label: 'Tratamiento',
    description: 'A trata o maneja B',
    directional: true,
    iconHint: 'pill',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    aiPromptHint: 'Cual es el tratamiento de primera linea para B',
  },
  {
    value: 'manifestacion',
    label: 'Manifestacion',
    description: 'La enfermedad A se manifiesta como signo/sintoma B',
    directional: true,
    iconHint: 'eye',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    aiPromptHint: 'Cuales son las manifestaciones clinicas de A',
  },
  {
    value: 'regulacion',
    label: 'Regulacion',
    description: 'A regula o modula B (feedback, hormonal)',
    directional: true,
    iconHint: 'activity',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    aiPromptHint: 'Que pasa cuando A esta elevada/disminuida y como afecta a B',
  },
  {
    value: 'contraste',
    label: 'Contraste',
    description: 'A y B se comparan frecuentemente',
    directional: false,
    iconHint: 'columns',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    aiPromptHint: 'Compara A con B: etiologia, fisiopatologia, tratamiento',
  },
  {
    value: 'componente',
    label: 'Componente',
    description: 'A es parte estructural o funcional de B',
    directional: true,
    iconHint: 'puzzle',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    aiPromptHint: 'Cuales son los componentes de B y que funcion cumple A',
  },
  {
    value: 'asociacion',
    label: 'Asociacion',
    description: 'A esta epidemiologicamente asociado a B (factor de riesgo)',
    directional: false,
    iconHint: 'link',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    aiPromptHint: 'Cuales son los factores de riesgo para B',
  },
] as const;

/** Quick lookup map: value → config */
export const CONNECTION_TYPE_MAP = new Map<string, ConnectionTypeConfig>(
  CONNECTION_TYPES.map(t => [t.value, t]),
);

/** Get config for a connection type, with fallback for unknown/null */
export function getConnectionType(value: string | null | undefined): ConnectionTypeConfig | null {
  if (!value) return null;
  return CONNECTION_TYPE_MAP.get(value) ?? null;
}
