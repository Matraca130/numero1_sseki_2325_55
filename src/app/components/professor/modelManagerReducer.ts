// ============================================================
// Axon — ModelManager Reducer
//
// Consolidates the 6 useState hooks of ModelManager into a single
// typed reducer with a discriminated-union Action type.
//
// State consolidated:
//   - models           (Model3D[])
//   - loading          (boolean)
//   - showUpload       (boolean)
//   - showManualForm   (boolean)
//   - uploadProgress   (UploadProgress | null)
//   - uploadTitle      (string)
//
// Extra field introduced to make optimistic delete self-contained:
//   - lastDeleted      (Model3D | null) — captured during OPTIMISTIC_DELETE,
//                                         used by ROLLBACK_DELETE.
//
// Pure module — no side effects, no React imports. Safe to unit test.
// ============================================================

import type { Model3D, UploadProgress } from '@/app/lib/model3d-api';

// ── State ─────────────────────────────────────────────────

export interface ModelManagerState {
  models: Model3D[];
  loading: boolean;
  showUpload: boolean;
  showManualForm: boolean;
  uploadProgress: UploadProgress | null;
  uploadTitle: string;
  /** Captured during optimistic delete so ROLLBACK_DELETE can restore it. */
  lastDeleted: Model3D | null;
}

export const initialModelManagerState: ModelManagerState = {
  models: [],
  loading: true,
  showUpload: false,
  showManualForm: false,
  uploadProgress: null,
  uploadTitle: '',
  lastDeleted: null,
};

// ── Actions (discriminated union) ─────────────────────────

export type ModelManagerAction =
  | { type: 'SET_MODELS'; payload: Model3D[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'OPEN_UPLOAD' }
  | { type: 'OPEN_MANUAL_FORM' }
  | { type: 'CLOSE_UPLOAD' }
  | { type: 'CLOSE_MANUAL_FORM' }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: UploadProgress | null }
  | { type: 'SET_UPLOAD_TITLE'; payload: string }
  | { type: 'OPTIMISTIC_DELETE'; payload: { id: string } }
  | { type: 'ROLLBACK_DELETE' }
  | { type: 'CLEAR_LAST_DELETED' };

// ── Reducer ───────────────────────────────────────────────

export function modelManagerReducer(
  state: ModelManagerState,
  action: ModelManagerAction,
): ModelManagerState {
  switch (action.type) {
    case 'SET_MODELS':
      return { ...state, models: action.payload };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'OPEN_UPLOAD':
      // Mutually exclusive with manual form (matches previous inline logic).
      return { ...state, showUpload: true, showManualForm: false };

    case 'OPEN_MANUAL_FORM':
      return { ...state, showManualForm: true, showUpload: false };

    case 'CLOSE_UPLOAD':
      // Resetting uploadProgress mirrors previous handleUploadReset() behaviour
      // when the panel is dismissed via the X button.
      return { ...state, showUpload: false, uploadProgress: null };

    case 'CLOSE_MANUAL_FORM':
      return { ...state, showManualForm: false };

    case 'SET_UPLOAD_PROGRESS':
      return { ...state, uploadProgress: action.payload };

    case 'SET_UPLOAD_TITLE':
      return { ...state, uploadTitle: action.payload };

    case 'OPTIMISTIC_DELETE': {
      const deleted = state.models.find((m) => m.id === action.payload.id) ?? null;
      return {
        ...state,
        models: state.models.filter((m) => m.id !== action.payload.id),
        lastDeleted: deleted,
      };
    }

    case 'ROLLBACK_DELETE': {
      if (!state.lastDeleted) return state;
      return {
        ...state,
        models: [...state.models, state.lastDeleted],
        lastDeleted: null,
      };
    }

    case 'CLEAR_LAST_DELETED':
      return state.lastDeleted === null ? state : { ...state, lastDeleted: null };

    default: {
      // Exhaustiveness check — if a new action is added, TS will complain here.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
