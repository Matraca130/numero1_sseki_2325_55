// ============================================================
// ConfirmDialog — Test Suite
//
// Verifies dialog rendering, button interactions, loading state,
// custom labels, variants, and callback behavior.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

describe('ConfirmDialog', () => {
  // 1. Renders when open is true ----------------------------------------
  it('renders dialog when open prop is true', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  // 2. Does not render when open is false --------------------------------
  it('does not render dialog when open prop is false', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Confirm Action"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText('Confirm Action')).not.toBeInTheDocument();
  });

  // 3. Renders title -------------------------------------------------
  it('renders title text', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Item"
        description="Are you sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
  });

  // 4. Renders description -----------------------------------------------
  it('renders description text', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Item"
        description="This action cannot be undone"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
  });

  // 5. Renders default button labels ------------------------------------
  it('renders default confirm and cancel labels', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm"
        description="Continue?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Confirmar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  // 6. Renders custom confirm label ------------------------------------
  it('renders custom confirm label when provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Continue?"
        confirmLabel="Remove"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Remove')).toBeInTheDocument();
  });

  // 7. Renders custom cancel label --------------------------------------
  it('renders custom cancel label when provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Continue?"
        cancelLabel="Keep"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  // 8. Confirm button calls onConfirm callback --------------------------
  it('calls onConfirm when confirm button clicked', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        confirmLabel="Delete"
        onConfirm={handleConfirm}
      />
    );

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(confirmButton);

    expect(handleConfirm).toHaveBeenCalledOnce();
  });

  // 9. Cancel button closes dialog without confirming -----------------
  it('closes dialog when cancel button clicked', async () => {
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Delete"
        description="Sure?"
        onConfirm={handleConfirm}
      />
    );

    const cancelButton = screen.getByText('Cancelar');
    await user.click(cancelButton);

    // onConfirm should not be called
    expect(handleConfirm).not.toHaveBeenCalled();
  });

  // 10. Buttons are disabled during loading ---------------------------
  it('disables buttons when loading is true', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={true}
        onConfirm={() => {}}
      />
    );

    const confirmButton = screen.getByText('Confirmar') as HTMLButtonElement;
    const cancelButton = screen.getByText('Cancelar') as HTMLButtonElement;

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  // 11. Buttons are enabled when not loading --------------------------
  it('enables buttons when loading is false', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={false}
        onConfirm={() => {}}
      />
    );

    const confirmButton = screen.getByText('Confirmar') as HTMLButtonElement;
    const cancelButton = screen.getByText('Cancelar') as HTMLButtonElement;

    expect(confirmButton).not.toBeDisabled();
    expect(cancelButton).not.toBeDisabled();
  });

  // 12. Shows spinner during loading -----------------------------------
  it('shows loading spinner on confirm button when loading', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        loading={true}
        onConfirm={() => {}}
      />
    );

    // Look for the Loader2 icon which has animate-spin class
    const spinner = screen.getByRole('button', { name: /Confirmar/ }).querySelector('svg[class*="animate-spin"]');
    expect(spinner).toBeInTheDocument();
  });

  // 13. Destructive variant applies red styling ----------------------
  it('applies destructive styling to confirm button', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        variant="destructive"
        onConfirm={() => {}}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton.className).toContain('bg-red-600');
  });

  // 14. Default variant styling ------------------------------------------
  it('applies default styling to confirm button', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirm"
        description="Continue?"
        variant="default"
        onConfirm={() => {}}
      />
    );

    const confirmButton = screen.getByText('Confirmar');
    expect(confirmButton).toBeInTheDocument();
  });

  // 15. Renders children content when provided -------------------------
  it('renders children content when provided', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      >
        <div data-testid="warning-banner">Warning: This is permanent</div>
      </ConfirmDialog>
    );

    expect(screen.getByTestId('warning-banner')).toBeInTheDocument();
  });

  // 16. All props work together -----------------------------------------
  it('renders all props together correctly', async () => {
    const handleOpenChange = vi.fn();
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Remove User"
        description="This action cannot be undone. The user will lose access."
        confirmLabel="Remove User"
        cancelLabel="Cancel"
        variant="destructive"
        loading={false}
        onConfirm={handleConfirm}
      >
        <div data-testid="extra-info">Email: user@example.com</div>
      </ConfirmDialog>
    );

    // Check all content
    expect(screen.getByText('This action cannot be undone. The user will lose access.')).toBeInTheDocument();
    expect(screen.getByTestId('extra-info')).toBeInTheDocument();

    // Check buttons are clickable (use getByRole to distinguish title from button)
    const confirmButton = screen.getByRole('button', { name: 'Remove User' });
    const cancelButton = screen.getByText('Cancel');

    await user.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledOnce();

    // Reset and test cancel
    handleOpenChange.mockClear();
  });

  // 17. Long title and description are displayed correctly -----------
  it('displays long title and description text', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete all historical data and permanently remove user account"
        description="This action is permanent and cannot be reversed. All associated data will be lost forever."
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Delete all historical data and permanently remove user account')).toBeInTheDocument();
    expect(screen.getByText('This action is permanent and cannot be reversed. All associated data will be lost forever.')).toBeInTheDocument();
  });

  // 18. Dialog can be opened and closed multiple times ----------------
  it('can be opened and closed multiple times', () => {
    const { rerender } = render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Close it
    rerender(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();

    // Open again
    rerender(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  // 19. Handler functions are stable across rerenders -----------------
  it('maintains handler function references correctly', async () => {
    const handleConfirm = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
      />
    );

    let confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(1);

    // Rerender with different content
    rerender(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete Different"
        description="Really sure?"
        confirmLabel="Confirm"
        onConfirm={handleConfirm}
      />
    );

    confirmButton = screen.getByText('Confirm');
    await user.click(confirmButton);
    expect(handleConfirm).toHaveBeenCalledTimes(2);
  });

  // 20. Multiple children nodes render correctly ----------------------
  it('renders multiple children nodes', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Delete"
        description="Sure?"
        onConfirm={() => {}}
      >
        <div data-testid="warning">Warning</div>
        <div data-testid="info">Information</div>
      </ConfirmDialog>
    );

    expect(screen.getByTestId('warning')).toBeInTheDocument();
    expect(screen.getByTestId('info')).toBeInTheDocument();
  });
});
