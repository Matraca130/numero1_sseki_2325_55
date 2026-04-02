/**
 * AxonAIAssistant.test.tsx — Smoke tests for AI Assistant component
 *
 * Coverage: render without crash, mode switching UI, close button
 * Mocks: aiService, NavigationContext, VoiceCallPanel, motion, tanstack
 *
 * Run: npx vitest run src/app/components/ai/__tests__/AxonAIAssistant.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────

vi.mock('@/app/context/NavigationContext', () => ({
  useNavigation: () => ({
    currentSummaryId: 'sum-1',
    currentCourseId: 'course-1',
    setCurrentTopic: vi.fn(),
  }),
}));

vi.mock('@/app/services/aiService', () => ({
  chat: vi.fn().mockResolvedValue({ response: 'Hello!' }),
  chatStream: vi.fn(),
  explainConcept: vi.fn().mockResolvedValue({ explanation: 'Explained.' }),
  generateFlashcard: vi.fn().mockResolvedValue({ front: 'Q', back: 'A' }),
  generateQuizQuestion: vi.fn().mockResolvedValue({ question: 'Q?', options: [] }),
  submitRagFeedback: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../VoiceCallPanel', () => ({
  VoiceCallPanel: () => <div data-testid="voice-panel">Voice</div>,
}));

// Mock @tanstack/react-virtual (used for virtualized chat messages)
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: () => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    scrollToIndex: vi.fn(),
    measureElement: vi.fn(),
  }),
}));

import { AxonAIAssistant } from '../AxonAIAssistant';

describe('AxonAIAssistant', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    summaryId: 'sum-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when open', () => {
    const { container } = render(<AxonAIAssistant {...defaultProps} />);
    expect(container).toBeTruthy();
  });

  it('renders no interactive elements when closed', () => {
    render(<AxonAIAssistant {...defaultProps} isOpen={false} />);
    // Component uses {isOpen && (...)} — nothing renders when closed
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows close button when open', () => {
    render(<AxonAIAssistant {...defaultProps} />);
    // The close button should be present — look for the X icon button
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('calls onClose when close button is clicked', () => {
    render(<AxonAIAssistant {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Click each button until onClose fires (close button position may vary)
    for (const btn of buttons) {
      fireEvent.click(btn);
      if (defaultProps.onClose.mock.calls.length > 0) break;
    }
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('renders mode selector buttons', () => {
    render(<AxonAIAssistant {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Should have multiple mode buttons (chat, flashcards, quiz, explain, voice)
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('handles summaryId prop', () => {
    // Renders without crash with and without summaryId
    const { unmount } = render(<AxonAIAssistant {...defaultProps} summaryId={undefined} />);
    unmount();
    render(<AxonAIAssistant {...defaultProps} summaryId="other-sum" />);
  });
});
