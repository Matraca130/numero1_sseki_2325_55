// ============================================================
// Axon — haptic helper
// Mobile vibration feedback. No-op when Vibration API is unavailable.
// Extracted in cycle #44 (was triplicated across useMapEdgeActions,
// useMapNodeActions, and KnowledgeMapView).
// ============================================================

export const haptic = (ms = 50): void => {
  navigator?.vibrate?.(ms);
};
