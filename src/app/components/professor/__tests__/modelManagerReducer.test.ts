// Unit tests for modelManagerReducer — pure reducer, no React.
import { describe, it, expect } from 'vitest';
import {
  modelManagerReducer,
  initialModelManagerState,
  type ModelManagerState,
} from '../modelManagerReducer';
import type { Model3D, UploadProgress } from '@/app/lib/model3d-api';

const makeModel = (id: string, title = `Model ${id}`): Model3D =>
  ({
    id,
    topic_id: 'topic-1',
    title,
    file_url: `https://example.com/${id}.glb`,
    file_format: 'glb',
    file_size_bytes: 1024,
    is_active: true,
    order_index: 0,
    created_at: new Date().toISOString(),
  } as Model3D);

describe('modelManagerReducer', () => {
  it('has the documented initial state', () => {
    expect(initialModelManagerState).toEqual({
      models: [],
      loading: true,
      showUpload: false,
      showManualForm: false,
      uploadProgress: null,
      uploadTitle: '',
      lastDeleted: null,
    });
  });

  it('SET_MODELS replaces the models array', () => {
    const models = [makeModel('a'), makeModel('b')];
    const next = modelManagerReducer(initialModelManagerState, {
      type: 'SET_MODELS',
      payload: models,
    });
    expect(next.models).toEqual(models);
  });

  it('SET_LOADING toggles loading', () => {
    const next = modelManagerReducer(initialModelManagerState, {
      type: 'SET_LOADING',
      payload: false,
    });
    expect(next.loading).toBe(false);
  });

  it('OPEN_UPLOAD opens upload and closes manual form (mutually exclusive)', () => {
    const state: ModelManagerState = {
      ...initialModelManagerState,
      showManualForm: true,
    };
    const next = modelManagerReducer(state, { type: 'OPEN_UPLOAD' });
    expect(next.showUpload).toBe(true);
    expect(next.showManualForm).toBe(false);
  });

  it('OPEN_MANUAL_FORM opens form and closes upload (mutually exclusive)', () => {
    const state: ModelManagerState = {
      ...initialModelManagerState,
      showUpload: true,
    };
    const next = modelManagerReducer(state, { type: 'OPEN_MANUAL_FORM' });
    expect(next.showManualForm).toBe(true);
    expect(next.showUpload).toBe(false);
  });

  it('CLOSE_UPLOAD clears upload panel AND resets uploadProgress', () => {
    const progress: UploadProgress = { phase: 'uploading', percent: 42, message: '...' };
    const state: ModelManagerState = {
      ...initialModelManagerState,
      showUpload: true,
      uploadProgress: progress,
    };
    const next = modelManagerReducer(state, { type: 'CLOSE_UPLOAD' });
    expect(next.showUpload).toBe(false);
    expect(next.uploadProgress).toBeNull();
  });

  it('CLOSE_MANUAL_FORM hides the manual form', () => {
    const state: ModelManagerState = {
      ...initialModelManagerState,
      showManualForm: true,
    };
    const next = modelManagerReducer(state, { type: 'CLOSE_MANUAL_FORM' });
    expect(next.showManualForm).toBe(false);
  });

  it('SET_UPLOAD_PROGRESS sets a progress snapshot', () => {
    const progress: UploadProgress = { phase: 'validating', percent: 0, message: 'x' };
    const next = modelManagerReducer(initialModelManagerState, {
      type: 'SET_UPLOAD_PROGRESS',
      payload: progress,
    });
    expect(next.uploadProgress).toEqual(progress);
  });

  it('SET_UPLOAD_TITLE stores the input value', () => {
    const next = modelManagerReducer(initialModelManagerState, {
      type: 'SET_UPLOAD_TITLE',
      payload: 'Shoulder',
    });
    expect(next.uploadTitle).toBe('Shoulder');
  });

  describe('optimistic delete + rollback', () => {
    const seed: ModelManagerState = {
      ...initialModelManagerState,
      models: [makeModel('a'), makeModel('b'), makeModel('c')],
    };

    it('OPTIMISTIC_DELETE removes model from list and stores it in lastDeleted', () => {
      const next = modelManagerReducer(seed, {
        type: 'OPTIMISTIC_DELETE',
        payload: { id: 'b' },
      });
      expect(next.models.map((m) => m.id)).toEqual(['a', 'c']);
      expect(next.lastDeleted?.id).toBe('b');
    });

    it('ROLLBACK_DELETE restores lastDeleted and clears the snapshot', () => {
      const afterDelete = modelManagerReducer(seed, {
        type: 'OPTIMISTIC_DELETE',
        payload: { id: 'b' },
      });
      const restored = modelManagerReducer(afterDelete, { type: 'ROLLBACK_DELETE' });
      expect(restored.models.map((m) => m.id).sort()).toEqual(['a', 'b', 'c']);
      expect(restored.lastDeleted).toBeNull();
    });

    it('ROLLBACK_DELETE with nothing to restore is a no-op', () => {
      const next = modelManagerReducer(seed, { type: 'ROLLBACK_DELETE' });
      expect(next).toBe(seed);
    });

    it('CLEAR_LAST_DELETED drops the snapshot without touching models', () => {
      const afterDelete = modelManagerReducer(seed, {
        type: 'OPTIMISTIC_DELETE',
        payload: { id: 'a' },
      });
      const cleared = modelManagerReducer(afterDelete, { type: 'CLEAR_LAST_DELETED' });
      expect(cleared.lastDeleted).toBeNull();
      expect(cleared.models).toEqual(afterDelete.models);
    });

    it('CLEAR_LAST_DELETED is a no-op when already null', () => {
      const next = modelManagerReducer(seed, { type: 'CLEAR_LAST_DELETED' });
      expect(next).toBe(seed);
    });

    it('OPTIMISTIC_DELETE of an unknown id leaves models untouched and lastDeleted null', () => {
      const next = modelManagerReducer(seed, {
        type: 'OPTIMISTIC_DELETE',
        payload: { id: 'does-not-exist' },
      });
      expect(next.models).toEqual(seed.models);
      expect(next.lastDeleted).toBeNull();
    });
  });
});
