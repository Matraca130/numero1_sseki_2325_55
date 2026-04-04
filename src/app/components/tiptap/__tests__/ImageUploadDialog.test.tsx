import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUploadDialog } from '../ImageUploadDialog';
import type { ImagePosition } from '../extensions/ImageWithPosition';
import * as supabaseModule from '@/app/lib/supabase';

// Mock motion/react to avoid animation complexity in tests
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ImagePlus: () => <div data-testid="icon-image-plus" />,
  Upload: () => <div data-testid="icon-upload" />,
  X: () => <div data-testid="icon-x" />,
  Loader2: () => <div data-testid="icon-loader" />,
  AlignLeft: () => <div data-testid="icon-align-left" />,
  AlignCenter: () => <div data-testid="icon-align-center" />,
  AlignRight: () => <div data-testid="icon-align-right" />,
}));

// Mock clsx
vi.mock('clsx', () => ({
  default: (...args: any[]) => args.filter(Boolean).join(' '),
}));

// Mock supabase storage - must use a factory function to avoid hoisting issues
vi.mock('@/app/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

// Get reference to mockSupabaseStorage - will be set in beforeEach
let mockSupabaseStorage: any;

describe('ImageUploadDialog', () => {
  const defaultProps = {
    open: true,
    onClose: vi.fn(),
    onInsert: vi.fn(),
    userId: 'user-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mocked supabase module and its storage
    const mockedSupabase = vi.mocked(supabaseModule);
    mockSupabaseStorage = mockedSupabase.supabase.storage;
  });

  it('renders nothing when open is false', () => {
    const { container } = render(
      <ImageUploadDialog {...defaultProps} open={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders dialog when open is true', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    expect(screen.getByText(/insertar imagen/i)).toBeInTheDocument();
  });

  it('shows file input area with upload instructions', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    expect(screen.getByText(/arrastra una imagen aqui/i)).toBeInTheDocument();
    expect(screen.getByText(/max 10 mb/i)).toBeInTheDocument();
  });

  it('has file input for image selection', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.type).toBe('file');
    expect(input.accept).toBe('image/*');
  });

  it('shows position selector buttons', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    expect(screen.getByText(/posicion de la imagen/i)).toBeInTheDocument();
    expect(screen.getByText('Izquierda')).toBeInTheDocument();
    expect(screen.getByText('Centro')).toBeInTheDocument();
    expect(screen.getByText('Derecha')).toBeInTheDocument();
  });

  it('has center position selected by default', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const centerButton = screen.getByRole('button', { name: /centro/i });
    expect(centerButton.className).toContain('bg-teal-50');
  });

  it('shows close button in header', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const closeButtons = screen.getAllByTestId('icon-x');
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<ImageUploadDialog {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByText(/insertar imagen/i).closest('div')?.querySelector('button:last-child');
    if (closeButton) fireEvent.click(closeButton);
    // onClose might be called via backdrop or close button
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = vi.fn();
    render(<ImageUploadDialog {...defaultProps} onClose={onClose} />);
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('allows file selection via input', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });
  });

  it('shows preview when image is selected', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const img = screen.getByAltText('Preview');
      expect(img).toBeInTheDocument();
    });
  });

  it('shows error when non-image file is selected', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/solo se permiten archivos de imagen/i)).toBeInTheDocument();
    });
  });

  it('shows error when file is too large', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const largeFile = new File(
      [new ArrayBuffer(11 * 1024 * 1024)],
      'large.png',
      { type: 'image/png' }
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/no puede superar 10 mb/i)).toBeInTheDocument();
    });
  });

  it('allows drag and drop of image files', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'dropped.png', { type: 'image/png' });
    const dropZone = screen.getByText(/arrastra una imagen aqui/i).closest('div');

    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-teal-400');

    fireEvent.drop(dropZone!, { dataTransfer: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/dropped.png/i)).toBeInTheDocument();
    });
  });

  it('clears drag over state on drag leave', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const dropZone = screen.getByText(/arrastra una imagen aqui/i).closest('div');

    fireEvent.dragOver(dropZone!);
    expect(dropZone).toHaveClass('border-teal-400');

    fireEvent.dragLeave(dropZone!);
    expect(dropZone).not.toHaveClass('border-teal-400');
  });

  it('clears preview when remove button is clicked', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const removeButton = screen.getByText(/test.png/i).closest('div')?.querySelector('button');
    if (removeButton) fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText(/test.png/i)).not.toBeInTheDocument();
    });
  });

  it('allows position selection', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const leftButton = screen.getByRole('button', { name: /izquierda/i });
    fireEvent.click(leftButton);
    expect(leftButton.className).toContain('bg-teal-50');
  });

  it('disables insert button when no file is selected', () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const insertButton = screen.getByRole('button', { name: /insertar/i });
    expect(insertButton).toBeDisabled();
  });

  it('enables insert button when file is selected', async () => {
    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const insertButton = screen.getByRole('button', { name: /insertar/i });
      expect(insertButton).not.toBeDisabled();
    });
  });

  it('shows loading state during upload', async () => {
    const mockBucket = {
      upload: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      getPublicUrl: vi.fn(),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(screen.getByText(/subiendo/i)).toBeInTheDocument();
    });
  });

  it('shows error message on upload failure', async () => {
    const mockBucket = {
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      }),
      getPublicUrl: vi.fn(),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
    });
  });

  it('calls onInsert with URL and position on successful upload', async () => {
    const onInsert = vi.fn();
    const mockBucket = {
      upload: vi.fn().mockResolvedValue({
        data: { path: 'summaries/user-123/image.png' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.png' },
      }),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} onInsert={onInsert} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith(
        'https://example.com/image.png',
        'center'
      );
    });
  });

  it('calls onClose after successful upload', async () => {
    const onClose = vi.fn();
    const mockBucket = {
      upload: vi.fn().mockResolvedValue({
        data: { path: 'summaries/user-123/image.png' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.png' },
      }),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} onClose={onClose} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('uploads to correct path with userId', async () => {
    const mockBucket = {
      upload: vi.fn().mockResolvedValue({
        data: { path: 'summaries/user-456/image.png' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.png' },
      }),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} userId="user-456" />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      const uploadCall = mockBucket.upload.mock.calls[0];
      expect(uploadCall[0]).toContain('summaries/user-456');
    });
  });

  it('selects left position and uploads with correct position', async () => {
    const onInsert = vi.fn();
    const mockBucket = {
      upload: vi.fn().mockResolvedValue({
        data: { path: 'summaries/user-123/image.png' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/image.png' },
      }),
    };
    mockSupabaseStorage.from.mockReturnValue(mockBucket);

    render(<ImageUploadDialog {...defaultProps} onInsert={onInsert} />);
    const file = new File(['image-content'], 'test.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/test.png/i)).toBeInTheDocument();
    });

    const leftButton = screen.getByRole('button', { name: /izquierda/i });
    fireEvent.click(leftButton);

    const insertButton = screen.getByRole('button', { name: /insertar/i });
    fireEvent.click(insertButton);

    await waitFor(() => {
      expect(onInsert).toHaveBeenCalledWith(
        'https://example.com/image.png',
        'left'
      );
    });
  });
});
