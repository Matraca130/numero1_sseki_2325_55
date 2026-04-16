// ============================================================
// Axon — URL validator
//
// safeUrl() guards anchor/iframe/window.open targets that receive
// backend-supplied URLs. Any non-http(s) scheme (javascript:, data:,
// file:, vbscript:) is stripped to '' so the calling component renders
// a non-functional link instead of executing the payload.
//
// See issue #443.
// ============================================================

const SAFE_SCHEMES = new Set(['http:', 'https:']);

/**
 * Returns the input unchanged if it's an http(s) absolute URL or a
 * relative path; returns '' otherwise. Use for any href/src that comes
 * from user-controlled or backend-stored data.
 */
export function safeUrl(input: unknown): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';
  try {
    // Resolve against a dummy base so relative paths are accepted while
    // dangerous explicit schemes (javascript:, data:, file:, vbscript:)
    // parse to their own protocol and get rejected.
    const resolved = new URL(trimmed, 'https://axon.invalid/');
    if (!SAFE_SCHEMES.has(resolved.protocol)) return '';
    return trimmed;
  } catch {
    return '';
  }
}
