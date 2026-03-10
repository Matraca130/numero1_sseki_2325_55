/**
 * Extrae un mensaje legible de cualquier valor capturado en un catch.
 *
 * Uso:
 *   } catch (err: unknown) {
 *     console.error('[Tag]', err);
 *     setError(getErrorMessage(err));
 *   }
 *
 * Reemplaza el patron inseguro `catch (err: any) { err.message }`.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Error desconocido';
}

/**
 * Comprueba si el valor capturado tiene un campo HTTP `status` con el codigo dado.
 *
 * Uso:
 *   } catch (err: unknown) {
 *     if (hasHttpStatus(err, 404)) return null;
 *     throw err;
 *   }
 *
 * Reemplaza el patron inseguro `catch (err: any) { if (err.status === 404) ... }`.
 */
export function hasHttpStatus(err: unknown, status: number): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    (err as Record<string, unknown>).status === status
  );
}