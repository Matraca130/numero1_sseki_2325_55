// ============================================================
// Axon — useGenerateRun
//
// TanStack Query mutation that POSTs a multipart/form-data
// payload to `/atlas/generate` (see SPEC §2 M3). The wrapper at
// `src/app/lib/api.ts` already detects `FormData` bodies and
// skips the JSON `Content-Type` header so the browser can attach
// the correct multipart boundary.
//
// `X-Institution-Id` is supplied per-call via the `headers`
// option (the wrapper merges custom headers with auth defaults).
// The header value MUST match the institution used to filter the
// course/subject dropdown — see SPEC §5 R9 (frontend invariant
// keeping `atlas.runs.institution_id` consistent with the topic's
// institution).
// ============================================================

import { useMutation } from '@tanstack/react-query';
import { apiCall } from '@/app/lib/api';
import type {
  GenerateRunInput,
  GenerateRunResponse,
} from '@/app/types/atlasRuns';

/** Build the multipart body sent to `POST /atlas/generate`. */
function buildFormData(input: GenerateRunInput): FormData {
  const fd = new FormData();
  fd.append('file', input.file);
  fd.append('mode', input.mode);
  fd.append('topic', input.topic);
  fd.append('subject', input.subject);
  fd.append('generate_images', String(input.generate_images));
  return fd;
}

/**
 * Mutation hook for kicking off an Atlas generation run.
 *
 * @example
 * const { mutateAsync, isPending } = useGenerateRun();
 * const { run_id } = await mutateAsync({ ... });
 */
export function useGenerateRun() {
  return useMutation<GenerateRunResponse, Error, GenerateRunInput>({
    mutationFn: async (input) => {
      if (!input.institutionId) {
        throw new Error('Falta institutionId — selecciona una institucion.');
      }
      const body = buildFormData(input);
      return apiCall<GenerateRunResponse>('/atlas/generate', {
        method: 'POST',
        body,
        headers: {
          'X-Institution-Id': input.institutionId,
        },
        // Generation enqueueing should be fast; use 30s for headroom
        // on slow PDF uploads.
        timeoutMs: 30_000,
      });
    },
  });
}
