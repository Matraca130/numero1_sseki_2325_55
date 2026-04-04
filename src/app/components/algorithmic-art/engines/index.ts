// ============================================================
// Axon — Algorithmic Art: Engine Registry
//
// Dynamic import registry for all 10 p5.js engines.
// Each engine is loaded lazily on demand (code splitting).
// ============================================================
import type { EngineKey, EngineModule } from '../types';

type EngineImporter = () => Promise<EngineModule>;

export const ENGINE_REGISTRY: Record<EngineKey, EngineImporter> = {
  cardiovascular: () => import('./cardiovascular'),
  respiratorio: () => import('./respiratorio'),
  dolor: () => import('./dolor'),
  digestivo: () => import('./digestivo'),
  nervioso: () => import('./nervioso'),
  'renal-endocrino': () => import('./renal-endocrino'),
  'semiologia-general': () => import('./semiologia-general'),
  'semiologia-regional': () => import('./semiologia-regional'),
  hematologia: () => import('./hematologia'),
  microbiologia: () => import('./microbiologia'),
};

/** Resolves the EngineModule for a given key. Throws if key is unknown. */
export async function loadEngine(key: EngineKey): Promise<EngineModule> {
  const importer = ENGINE_REGISTRY[key];
  if (!importer) throw new Error(`Unknown engine key: ${key}`);
  return importer();
}

/** Human-readable display names for each engine (used before the module loads) */
export const ENGINE_DISPLAY_NAMES: Record<EngineKey, string> = {
  cardiovascular: 'Sistema Cardiovascular',
  respiratorio: 'Sistema Respiratorio',
  dolor: 'Vías del Dolor',
  digestivo: 'Sistema Digestivo',
  nervioso: 'Sistema Nervioso',
  'renal-endocrino': 'Renal-Endocrino',
  'semiologia-general': 'Semiología General',
  'semiologia-regional': 'Semiología Regional',
  hematologia: 'Hematología',
  microbiologia: 'Microbiología',
};
