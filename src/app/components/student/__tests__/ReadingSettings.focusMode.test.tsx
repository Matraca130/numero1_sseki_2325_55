// ============================================================
// Axon — ReadingSettings Focus Mode Tests
//
// Verifies: focusMode toggle in panel, backward compatibility
// with old localStorage (no focusMode key), and default value.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ReadingSettingsPanel, {
  DEFAULT_READING_SETTINGS,
  type ReadingSettings,
} from '../ReadingSettingsPanel';

describe('ReadingSettingsPanel — Focus Mode', () => {
  const onClose = vi.fn();
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    onClose.mockReset();
  });

  it('renders focus mode toggle in OFF state by default', () => {
    render(
      <ReadingSettingsPanel
        settings={DEFAULT_READING_SETTINGS}
        onChange={onChange}
        onClose={onClose}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByText('Modo enfocado')).toBeTruthy();
  });

  it('renders focus mode toggle in ON state', () => {
    render(
      <ReadingSettingsPanel
        settings={{ ...DEFAULT_READING_SETTINGS, focusMode: true }}
        onChange={onChange}
        onClose={onClose}
      />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange with toggled focusMode when clicked', () => {
    render(
      <ReadingSettingsPanel
        settings={DEFAULT_READING_SETTINGS}
        onChange={onChange}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ focusMode: true })
    );
  });

  it('toggles OFF when already ON', () => {
    render(
      <ReadingSettingsPanel
        settings={{ ...DEFAULT_READING_SETTINGS, focusMode: true }}
        onChange={onChange}
        onClose={onClose}
      />
    );

    fireEvent.click(screen.getByRole('switch'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ focusMode: false })
    );
  });
});

describe('ReadingSettings — backward compatibility', () => {
  it('DEFAULT_READING_SETTINGS has focusMode false', () => {
    expect(DEFAULT_READING_SETTINGS.focusMode).toBe(false);
  });

  it('old settings without focusMode spread correctly', () => {
    // Simulates what loadSettings() does with old localStorage data
    const oldSettings = { fontSize: 18, lineHeight: 1.8, fontFamily: 'Georgia, serif' };
    const merged: ReadingSettings = { ...DEFAULT_READING_SETTINGS, ...oldSettings };

    expect(merged.focusMode).toBe(false);
    expect(merged.fontSize).toBe(18);
    expect(merged.lineHeight).toBe(1.8);
    expect(merged.fontFamily).toBe('Georgia, serif');
  });
});
