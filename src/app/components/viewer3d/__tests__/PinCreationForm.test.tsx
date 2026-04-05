/**
 * PinCreationForm.test.tsx — Tests for pin creation form (inline floating UI)
 *
 * Coverage:
 *   - Form renders with all fields
 *   - Label, description, pin_type inputs work
 *   - Pin type selector highlights current type
 *   - Submit button disabled until label filled
 *   - onSubmit called with correct data on form submit
 *   - onCancel closes form
 *   - Coordinates preview displays correctly
 *   - Keyword autocomplete integration (optional)
 *   - Saving state disables submit button
 *
 * Run: npx vitest run src/app/components/viewer3d/__tests__/PinCreationForm.test.tsx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as THREE from 'three';
import { PinCreationForm, type PinFormData } from '../PinCreationForm';

// ── Mocks ──────────────────────────────────────────────

vi.mock('../KeywordAutocomplete', () => ({
  KeywordAutocomplete: ({ onChange, value }: { onChange: (id: string | null, keyword: any) => void; value: string | null }) => (
    <div data-testid="keyword-autocomplete">
      <button onClick={() => onChange('kw-123', { id: 'kw-123', name: 'Test Keyword' })}>Select Keyword</button>
    </div>
  ),
}));

// ── Helpers ───────────────────────────────────────────

function createMockGeometry(x = 1.5, y = 2.5, z = 3.5): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

// ── Tests ─────────────────────────────────────────────

describe('PinCreationForm', () => {
  let mockCallbacks: {
    onSubmit: ReturnType<typeof vi.fn>;
    onCancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockCallbacks = {
      onSubmit: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn(),
    };
  });

  // ── Rendering ──

  it('renders form with all fields', () => {
    const geo = createMockGeometry();
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    expect(screen.getByText('Nuevo Pin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nombre del punto/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descripcion/i)).toBeInTheDocument();
  });

  it('displays coordinate preview with correct values', () => {
    const geo = createMockGeometry(1.23, 4.56, 7.89);
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    expect(screen.getByText(/x:1\.23/)).toBeInTheDocument();
    expect(screen.getByText(/y:4\.56/)).toBeInTheDocument();
    expect(screen.getByText(/z:7\.89/)).toBeInTheDocument();
  });

  it('rounds coordinates to 2 decimal places', () => {
    const geo = createMockGeometry(1.23456, 4.56789, 7.89012);
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    expect(screen.getByText(/x:1\.23/)).toBeInTheDocument();
    expect(screen.getByText(/y:4\.57/)).toBeInTheDocument();
    expect(screen.getByText(/z:7\.89/)).toBeInTheDocument();
  });

  // ── Pin Type Selector ──

  it('renders all pin type buttons', () => {
    const geo = createMockGeometry();
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Keyword')).toBeInTheDocument();
    expect(screen.getByText('Anotacion')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument();
  });

  it('highlights current pin type', () => {
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const infoBtn = screen.getByText('Info');
    expect(infoBtn.className).toContain('bg-');
  });

  it('allows changing pin type', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const keywordBtn = screen.getByText('Keyword');
    await user.click(keywordBtn);
    expect(keywordBtn.className).toContain('bg-');
  });

  // ── Form Fields ──

  it('accepts text in label field', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test Pin');
    expect(labelInput.value).toBe('Test Pin');
  });

  it('accepts text in description field', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const descInput = container.querySelector('textarea') as HTMLTextAreaElement;
    await user.type(descInput, 'Test description');
    expect(descInput.value).toBe('Test description');
  });

  it('trims whitespace from label on submit', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const descInput = container.querySelector('textarea') as HTMLTextAreaElement;
    await user.type(labelInput, '  Test Pin  ');
    await user.type(descInput, '  Test desc  ');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Test Pin',
        description: 'Test desc',
      })
    );
  });

  // ── Form Submission ──

  it('calls onSubmit with form data when submitted with valid label', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const descInput = container.querySelector('textarea') as HTMLTextAreaElement;
    await user.type(labelInput, 'My Pin');
    await user.type(descInput, 'My description');

    // Select a pin type
    const keywordBtn = screen.getByText('Keyword');
    await user.click(keywordBtn);

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'My Pin',
        description: 'My description',
        pin_type: 'keyword',
        color: expect.any(String),
      })
    );
  });

  it('does not call onSubmit when label is empty', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).not.toHaveBeenCalled();
  });

  it('does not call onSubmit when label is whitespace only', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, '   ');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).not.toHaveBeenCalled();
  });

  // ── Cancel Button ──

  it('calls onCancel when X button clicked', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    // Find the X close button - it's the first button after the heading
    const buttons = container.querySelectorAll('button');
    const closeButton = Array.from(buttons).find(btn =>
      btn.querySelector('svg[class*="lucide-x"]')
    );
    expect(closeButton).toBeTruthy();
    await user.click(closeButton as HTMLElement);
    expect(mockCallbacks.onCancel).toHaveBeenCalledOnce();
  });

  // ── Pin Type Color ──

  it('includes correct color for selected pin type in submission', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test');

    const quizBtn = screen.getByText('Quiz');
    await user.click(quizBtn);

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        color: '#fbbf24', // Quiz color
      })
    );
  });

  // ── Save State (Loading) ──

  it('disables save button while saving', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    mockCallbacks.onSubmit = vi.fn(() => new Promise(() => {
      // Never resolves, simulating ongoing save
    }));

    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test Pin');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    // Save button should be disabled
    const saveBtn = screen.getByRole('button', { name: /crear pin/i });
    expect(saveBtn).toBeDisabled();
  });

  it('shows loader icon while saving', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    mockCallbacks.onSubmit = vi.fn(() => new Promise(() => {}));

    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test Pin');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    // Loader should appear (Loader2 icon)
    const loader = container.querySelector('[data-testid="loader"]') ||
                  Array.from(container.querySelectorAll('svg')).find(svg => svg.className.baseVal?.includes('animate'));
    expect(loader).toBeTruthy();
  });

  // ── Keyword Integration ──

  it('renders keyword autocomplete', () => {
    const geo = createMockGeometry();
    render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
        topicId="topic-123"
      />
    );
    expect(screen.getByTestId('keyword-autocomplete')).toBeInTheDocument();
  });

  it('includes keyword_id in submission when selected', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
        topicId="topic-123"
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test Pin');

    const selectKeywordBtn = screen.getByText('Select Keyword');
    await user.click(selectKeywordBtn);

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword_id: 'kw-123',
      })
    );
  });

  // ── Default Pin Type ──

  it('defaults to "Info" pin type', async () => {
    const user = userEvent.setup();
    const geo = createMockGeometry();
    const { container } = render(
      <PinCreationForm
        onSubmit={mockCallbacks.onSubmit}
        onCancel={mockCallbacks.onCancel}
        geometry={geo}
      />
    );
    const labelInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await user.type(labelInput, 'Test');

    const form = container.querySelector('form') as HTMLFormElement;
    fireEvent.submit(form);

    expect(mockCallbacks.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        pin_type: 'info',
      })
    );
  });
});
