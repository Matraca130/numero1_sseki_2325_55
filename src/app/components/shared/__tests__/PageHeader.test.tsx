// ============================================================
// PageHeader — Test Suite
//
// Verifies icon rendering, title, subtitle, accent colors,
// actions button area, and children content rendering.
// ============================================================
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { PageHeader } from '../PageHeader';

// Mock FadeIn to avoid animation testing complexity
vi.mock('../FadeIn', () => ({
  FadeIn: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('PageHeader', () => {
  // 1. Basic rendering with icon and title ----------------------------
  it('renders icon and title', () => {
    render(
      <PageHeader
        icon={<Users size={22} data-testid="icon" />}
        title="Members"
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Members')).toBeInTheDocument();
  });

  // 2. Renders subtitle when provided -----------------------------------
  it('renders subtitle when provided', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        subtitle="Manage your team"
      />
    );

    expect(screen.getByText('Manage your team')).toBeInTheDocument();
  });

  // 3. Does not render subtitle when not provided ----------------------
  it('does not render subtitle when not provided', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      />
    );

    const subtitle = container.querySelector('.text-gray-500');
    expect(subtitle).not.toBeInTheDocument();
  });

  // 4. Applies default accent color (blue) ----------------------------
  it('applies default blue accent color', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      />
    );

    const iconContainer = container.querySelector('.bg-blue-50');
    expect(iconContainer).toBeInTheDocument();
  });

  // 5. Applies amber accent color when specified ----------------------
  it('applies amber accent color when specified', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        accent="amber"
      />
    );

    const iconContainer = container.querySelector('.bg-amber-50');
    expect(iconContainer).toBeInTheDocument();
  });

  // 6. Applies purple accent color when specified ---------------------
  it('applies purple accent color when specified', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        accent="purple"
      />
    );

    const iconContainer = container.querySelector('.bg-purple-50');
    expect(iconContainer).toBeInTheDocument();
  });

  // 7. Applies teal accent color when specified -----------------------
  it('applies teal accent color when specified', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        accent="teal"
      />
    );

    const iconContainer = container.querySelector('[class*="bg-\\[#e6f5f1\\]"]');
    expect(iconContainer).toBeInTheDocument();
  });

  // 8. Renders action buttons when provided ----------------------------
  it('renders action buttons when provided', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        actions={<button>Add Member</button>}
      />
    );

    expect(screen.getByText('Add Member')).toBeInTheDocument();
  });

  // 9. Does not render actions area when not provided -------------------
  it('does not render actions area when not provided', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      />
    );

    const buttons = screen.queryAllByRole('button');
    expect(buttons.length).toBe(0);
  });

  // 10. Renders children content when provided -------------------------
  it('renders children content when provided', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      >
        <div data-testid="child-content">Member badges</div>
      </PageHeader>
    );

    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  // 11. Renders multiple action buttons --------------------------------
  it('renders multiple action buttons', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        actions={
          <>
            <button>Add Member</button>
            <button>Export</button>
          </>
        }
      />
    );

    expect(screen.getByText('Add Member')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  // 12. Action button is clickable ------------------------------------
  it('action buttons are clickable and functional', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        actions={<button onClick={handleClick}>Add Member</button>}
      />
    );

    const addButton = screen.getByText('Add Member');
    await user.click(addButton);

    expect(handleClick).toHaveBeenCalledOnce();
  });

  // 13. Icon has proper styling ----------------------------------------
  it('icon is rendered with proper container styling', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} data-testid="icon" />}
        title="Members"
        accent="blue"
      />
    );

    const iconWrapper = container.querySelector('.w-11.h-11');
    expect(iconWrapper).toBeInTheDocument();
    expect(iconWrapper?.className).toContain('rounded-xl');
  });

  // 14. Title has proper heading styling -------------------------------
  it('title is rendered as heading with correct styling', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      />
    );

    const title = screen.getByText('Members');
    expect(title).toHaveClass('text-xl', 'font-bold', 'text-gray-900');
  });

  // 15. All props work together correctly ------------------------------
  it('renders all props together correctly', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <PageHeader
        icon={<Users size={22} data-testid="icon" />}
        title="Team Members"
        subtitle="Manage team access and permissions"
        accent="purple"
        actions={<button onClick={handleClick}>Invite</button>}
      >
        <div data-testid="badges">
          <span>5 members</span>
        </div>
      </PageHeader>
    );

    // Check all content
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Team Members')).toBeInTheDocument();
    expect(screen.getByText('Manage team access and permissions')).toBeInTheDocument();
    expect(screen.getByTestId('badges')).toBeInTheDocument();

    // Check accent color
    const purpleBg = container.querySelector('.bg-purple-50');
    expect(purpleBg).toBeInTheDocument();

    // Check button functionality
    const inviteButton = screen.getByText('Invite');
    await user.click(inviteButton);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  // 16. Subtitle text styling is correct -------------------------------
  it('subtitle has correct styling', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        subtitle="Manage your team"
      />
    );

    const subtitle = screen.getByText('Manage your team');
    expect(subtitle).toHaveClass('text-sm', 'text-gray-500');
  });

  // 17. Icon text color changes with accent ----------------------------
  it('icon text color changes with accent color', () => {
    const { container: container1 } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        accent="amber"
      />
    );

    const iconWrapper = container1.querySelector('.text-amber-500');
    expect(iconWrapper).toBeInTheDocument();
  });

  // 18. Long title is displayed properly --------------------------------
  it('displays long title without overflow issues', () => {
    render(
      <PageHeader
        icon={<Users size={22} />}
        title="Administrative Team Members and Access Control"
        subtitle="Manage permissions"
      />
    );

    expect(screen.getByText('Administrative Team Members and Access Control')).toBeInTheDocument();
  });

  // 19. Empty subtitle string is handled --------------------------------
  it('handles empty subtitle string gracefully', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
        subtitle=""
      />
    );

    const subtitle = container.querySelector('.text-gray-500');
    expect(subtitle).not.toBeInTheDocument();
  });

  // 20. Responsive layout is applied -----------------------------------
  it('applies responsive flex layout classes', () => {
    const { container } = render(
      <PageHeader
        icon={<Users size={22} />}
        title="Members"
      />
    );

    // FadeIn wraps the content, so we need to find the actual div with flex classes
    const wrapper = container.querySelector('[class*="flex"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.className).toContain('flex');
    expect(wrapper?.className).toContain('sm:flex-row');
    expect(wrapper?.className).toContain('gap-4');
  });
});
