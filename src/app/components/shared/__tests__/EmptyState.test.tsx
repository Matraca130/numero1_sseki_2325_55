// ============================================================
// EmptyState — Test Suite
//
// Verifies icon rendering, title, description, action button,
// and styling behavior.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Inbox, FileX, Search } from 'lucide-react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  // 1. Renders title --------------------------------------------------
  it('renders title text', () => {
    render(
      <EmptyState
        title="No items found"
      />
    );

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  // 2. Renders description when provided --------------------------------
  it('renders description when provided', () => {
    render(
      <EmptyState
        title="No items"
        description="Try adjusting your filters"
      />
    );

    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  // 3. Does not render description when not provided -------------------
  it('does not render description when not provided', () => {
    const { container } = render(
      <EmptyState title="No items" />
    );

    const descriptions = container.querySelectorAll('p');
    expect(descriptions.length).toBe(0);
  });

  // 4. Renders default Inbox icon ----------------------------------------
  it('renders default Inbox icon when no icon provided', () => {
    const { container } = render(
      <EmptyState title="No items" />
    );

    // Check for SVG (lucide icon rendered)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  // 5. Renders custom icon when provided --------------------------------
  it('renders custom icon when provided', () => {
    const { container } = render(
      <EmptyState
        title="No results"
        icon={FileX}
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  // 6. Renders action button when provided ------------------------------
  it('renders action button when provided', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create New', onClick: () => {} }}
      />
    );

    expect(screen.getByText('Create New')).toBeInTheDocument();
  });

  // 7. Does not render action button when not provided ------------------
  it('does not render action button when not provided', () => {
    render(
      <EmptyState title="No items" />
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  // 8. Action button is clickable ----------------------------------------
  it('action button calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create New', onClick: handleClick }}
      />
    );

    const button = screen.getByText('Create New');
    await user.click(button);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  // 9. Applies custom className ----------------------------------------
  it('applies custom className to wrapper', () => {
    const { container } = render(
      <EmptyState
        title="No items"
        className="custom-class"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  // 10. Applies base styling classes -----------------------------------
  it('applies base styling classes for layout and spacing', () => {
    const { container } = render(
      <EmptyState title="No items" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('flex-col');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  // 11. Icon has correct styling ----------------------------------------
  it('icon has correct size and color styling', () => {
    const { container } = render(
      <EmptyState title="No items" />
    );

    const icon = container.querySelector('svg');
    expect(icon).toHaveClass('text-gray-300');
  });

  // 12. Title has correct text styling -----------------------------------
  it('title has correct text styling', () => {
    render(
      <EmptyState title="No items found" />
    );

    const title = screen.getByText('No items found');
    expect(title).toHaveClass('font-semibold', 'text-gray-600');
  });

  // 13. Description has correct text styling ----------------------------
  it('description has correct text styling', () => {
    render(
      <EmptyState
        title="No items"
        description="No matching results"
      />
    );

    const description = screen.getByText('No matching results');
    expect(description).toHaveClass('text-gray-400');
  });

  // 14. All props work together -----------------------------------------
  it('renders all props together correctly', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <EmptyState
        icon={Search}
        title="No search results"
        description="Try a different search term"
        action={{ label: 'Clear filters', onClick: handleClick }}
        className="mt-8"
      />
    );

    // Check content
    expect(screen.getByText('No search results')).toBeInTheDocument();
    expect(screen.getByText('Try a different search term')).toBeInTheDocument();

    // Check icon renders
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    // Check button
    const button = screen.getByText('Clear filters');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();

    // Check custom class
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('mt-8');
  });

  // 15. Handles empty title gracefully ----------------------------------
  it('handles empty title string', () => {
    const { container } = render(
      <EmptyState title="" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toBeInTheDocument();
  });

  // 16. Handles long title text -----------------------------------------
  it('displays long title text without overflow', () => {
    render(
      <EmptyState
        title="No items matching your search criteria were found in the system"
      />
    );

    expect(screen.getByText('No items matching your search criteria were found in the system')).toBeInTheDocument();
  });

  // 17. Handles long description text -----------------------------------
  it('displays long description text with text wrapping', () => {
    render(
      <EmptyState
        title="No items"
        description="Please try modifying your search terms or filters to find what you are looking for"
      />
    );

    expect(screen.getByText('Please try modifying your search terms or filters to find what you are looking for')).toBeInTheDocument();
  });

  // 18. Action button has correct styling -------------------------------
  it('action button has correct styling', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Create', onClick: () => {} }}
      />
    );

    const button = screen.getByText('Create') as HTMLButtonElement;
    expect(button).toHaveClass('rounded-full', 'bg-teal-500', 'text-white');
  });

  // 19. Button label can be customized -----------------------------------
  it('renders custom button label', () => {
    render(
      <EmptyState
        title="No items"
        action={{ label: 'Add New Item', onClick: () => {} }}
      />
    );

    expect(screen.getByText('Add New Item')).toBeInTheDocument();
  });

  // 20. Multiple icons can be used ----------------------------------------
  it('supports different icons from lucide', () => {
    const icons = [Inbox, FileX, Search];

    icons.forEach((Icon, index) => {
      const { container, unmount } = render(
        <EmptyState
          key={index}
          icon={Icon}
          title={`No items ${index}`}
        />
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      unmount();
    });
  });
});
