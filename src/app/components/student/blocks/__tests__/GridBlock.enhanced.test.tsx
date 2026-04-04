import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GridBlock from '../GridBlock';
import { makeBlock, FIXTURES } from './test-utils';

// Mock IconByName to avoid icon rendering issues
vi.mock('../IconByName', () => ({
  default: ({ name, size, className }: any) => (
    <div data-testid={`icon-${name}`} className={className}>
      {name}
    </div>
  ),
}));

describe('GridBlock — Comprehensive Tests', () => {
  describe('Basic Grid Rendering', () => {
    it('renders grid container with items', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('renders all items in grid', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      expect(screen.getByText('TNF-α')).toBeInTheDocument();
      expect(screen.getByText('IL-6')).toBeInTheDocument();
    });

    it('renders item details', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      expect(screen.getByText('Citoquina proinflamatoria')).toBeInTheDocument();
      expect(screen.getByText('Activa fase aguda')).toBeInTheDocument();
    });

    it('renders correct number of items', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const items = container.querySelectorAll('.rounded-\\[10px\\]');
      expect(items.length).toBe(2);
    });
  });

  describe('Title Rendering', () => {
    it('renders title when provided', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      expect(screen.getByText('Mediadores')).toBeInTheDocument();
    });

    it('renders title with appropriate styling', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const title = screen.getByText('Mediadores');
      expect(title).toHaveClass('font-serif');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-bold');
    });

    it('does not render title when undefined', () => {
      const block = makeBlock({
        type: 'grid',
        content: { columns: 2, items: [{ label: 'Item 1', detail: 'Detail 1' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      const h3 = container.querySelector('h3');
      expect(h3).not.toBeInTheDocument();
    });

    it('does not render title when empty string', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: '', columns: 2, items: [{ label: 'Item 1' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      const h3 = container.querySelector('h3');
      expect(h3).not.toBeInTheDocument();
    });

    it('handles long title gracefully', () => {
      const longTitle = 'Mediadores inflamatorios y sus funciones biológicas en el sistema inmune '.repeat(2);
      const block = makeBlock({
        type: 'grid',
        content: { title: longTitle, columns: 2, items: [{ label: 'Item' }] }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText(new RegExp(longTitle.slice(0, 20)))).toBeInTheDocument();
    });
  });

  describe('Grid Layout Columns', () => {
    it('renders 2-column grid when columns is 2', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test', columns: 2, items: [{ label: 'A' }, { label: 'B' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      // Component uses responsive classes: grid-cols-1 sm:grid-cols-2 for 2-column layout
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toMatch(/sm:grid-cols-2/);
      expect(grid?.className).not.toMatch(/md:grid-cols-3/);
    });

    it('renders 3-column grid when columns is 3', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      // Component uses responsive classes: grid-cols-1 sm:grid-cols-2 md:grid-cols-3 for 3-column layout
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toMatch(/md:grid-cols-3/);
    });

    it('defaults to 3 columns when columns is undefined', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test', items: [{ label: 'A' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      // Component defaults to 3 columns when undefined
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toMatch(/md:grid-cols-3/);
    });

    it('renders any custom column value as grid-cols-3 (default)', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test', columns: 5, items: [{ label: 'A' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      // Only 2 and 3 are explicitly handled, so 5 should use default (3)
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toMatch(/md:grid-cols-3/);
    });
  });

  describe('Empty State Handling', () => {
    it('renders empty state when items array is empty', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test Grid', columns: 2, items: [] }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('Test Grid')).toBeInTheDocument();
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });

    it('renders empty state without title', () => {
      const block = makeBlock({
        type: 'grid',
        content: { columns: 2, items: [] }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });

    it('shows "Sin datos" message in center', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Empty', columns: 2, items: [] }
      });
      const { container } = render(<GridBlock block={block} />);

      const emptyMsg = screen.getByText(/sin datos/i);
      expect(emptyMsg).toHaveClass('text-center');
    });

    it('applies italic styling to empty message', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Empty', columns: 2, items: [] }
      });
      const { container } = render(<GridBlock block={block} />);

      const emptyMsg = screen.getByText(/sin datos/i);
      expect(emptyMsg).toHaveClass('italic');
    });
  });

  describe('Item Card Styling', () => {
    it('applies card styling to each item', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const cards = container.querySelectorAll('[class*="rounded-\\[10px\\]"]');
      cards.forEach(card => {
        expect(card).toHaveClass('bg-white');
        expect(card).toHaveClass('rounded-[10px]');
        expect(card).toHaveClass('p-3.5');
        expect(card).toHaveClass('border');
      });
    });

    it('applies hover effects to cards', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const cards = container.querySelectorAll('[class*="rounded-\\[10px\\]"]');
      cards.forEach(card => {
        expect(card.className).toContain('hover:shadow-sm');
        expect(card.className).toContain('hover:border-gray-300');
      });
    });

    it('applies dark mode styles to cards', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const cards = container.querySelectorAll('[class*="rounded-\\[10px\\]"]');
      cards.forEach(card => {
        expect(card.className).toMatch(/dark:/);
      });
    });
  });

  describe('Icon Rendering', () => {
    it('renders icon for each item when provided', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      // Multiple icons with same name may exist, check that at least one is present
      expect(screen.getAllByTestId('icon-Shield').length).toBeGreaterThan(0);
    });

    it('renders icons with proper size', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const iconContainer = container.querySelector('[class*="flex justify-center"]');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies accent color to icons', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const iconDivs = container.querySelectorAll('[data-testid^="icon-"]');
      iconDivs.forEach(icon => {
        expect(icon).toHaveClass('text-axon-accent');
      });
    });

    it('skips icon rendering when icon is undefined', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Test',
          columns: 2,
          items: [{ label: 'Item without icon' }]
        }
      });
      const { container } = render(<GridBlock block={block} />);

      expect(screen.getByText('Item without icon')).toBeInTheDocument();
    });
  });

  describe('Item Content Rendering', () => {
    it('renders label for each item', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      expect(screen.getByText('TNF-α')).toBeInTheDocument();
      expect(screen.getByText('IL-6')).toBeInTheDocument();
    });

    it('renders detail text for each item', () => {
      const block = makeBlock(FIXTURES.grid);
      render(<GridBlock block={block} />);

      expect(screen.getByText('Citoquina proinflamatoria')).toBeInTheDocument();
      expect(screen.getByText('Activa fase aguda')).toBeInTheDocument();
    });

    it('applies correct styling to label', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const label = screen.getByText('TNF-α');
      expect(label).toHaveClass('text-sm');
      expect(label).toHaveClass('font-bold');
      expect(label.className).toContain('text-axon-dark');
    });

    it('applies correct styling to detail text', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const detail = screen.getByText('Citoquina proinflamatoria');
      expect(detail).toHaveClass('text-xs');
      expect(detail.className).toContain('text-gray');
    });

    it('renders without label when label is undefined', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Test',
          columns: 2,
          items: [{ detail: 'Only detail' }]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('Only detail')).toBeInTheDocument();
    });

    it('renders without detail when detail is undefined', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Test',
          columns: 2,
          items: [{ label: 'Only label' }]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('Only label')).toBeInTheDocument();
    });

    it('handles empty label and detail gracefully', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Test',
          columns: 2,
          items: [{ label: '', detail: '' }]
        }
      });
      const { container } = render(<GridBlock block={block} />);

      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('Spacing and Layout', () => {
    it('applies gap between grid items', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-2.5');
    });

    it('applies margin to title', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const title = screen.getByText('Mediadores');
      expect(title).toHaveClass('mb-3');
      expect(title).toHaveClass('mt-0');
    });

    it('applies proper spacing within card', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const label = screen.getByText('TNF-α');
      expect(label).toHaveClass('mt-1.5');

      const detail = screen.getByText('Citoquina proinflamatoria');
      expect(detail).toHaveClass('mt-0.5');
    });
  });

  describe('Edge Cases', () => {
    it('handles single item', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Single Item',
          columns: 2,
          items: [{ label: 'Único', detail: 'Un solo elemento' }]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('Único')).toBeInTheDocument();
      expect(screen.getByText('Un solo elemento')).toBeInTheDocument();
    });

    it('handles many items', () => {
      const items = Array.from({ length: 12 }, (_, i) => ({
        label: `Item ${i + 1}`,
        detail: `Detail ${i + 1}`
      }));

      const block = makeBlock({
        type: 'grid',
        content: { title: 'Many Items', columns: 3, items }
      });
      const { container } = render(<GridBlock block={block} />);

      const cards = container.querySelectorAll('[class*="rounded-\\[10px\\]"]');
      expect(cards.length).toBe(12);
    });

    it('handles very long label text', () => {
      const longLabel = 'Citoquina proinflamatoria muy larga con nombre complejo '.repeat(3);
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Long Label',
          columns: 2,
          items: [{ label: longLabel, detail: 'Detail' }]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText(new RegExp(longLabel.slice(0, 20)))).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Special & <Chars>',
          columns: 2,
          items: [
            { label: 'TNF-α > IL-6', detail: '100% effective' }
          ]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText(/TNF-α/)).toBeInTheDocument();
    });

    it('handles undefined items array', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test' }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });

    it('handles undefined columns', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test', items: [{ label: 'Item' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      // Should default to 3 columns (responsive: grid-cols-1 sm:grid-cols-2 md:grid-cols-3)
      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid?.className).toMatch(/md:grid-cols-3/);
    });

    it('handles items with missing icon name', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Test',
          columns: 2,
          items: [{ icon: undefined, label: 'No Icon', detail: 'Detail' }]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('No Icon')).toBeInTheDocument();
    });

    it('handles mix of items with and without details', () => {
      const block = makeBlock({
        type: 'grid',
        content: {
          title: 'Mixed',
          columns: 2,
          items: [
            { label: 'With Detail', detail: 'Detail text' },
            { label: 'No Detail' }
          ]
        }
      });
      render(<GridBlock block={block} />);

      expect(screen.getByText('With Detail')).toBeInTheDocument();
      expect(screen.getByText('No Detail')).toBeInTheDocument();
      expect(screen.getByText('Detail text')).toBeInTheDocument();
    });

    it('handles columns value of 0 or negative gracefully', () => {
      const block = makeBlock({
        type: 'grid',
        content: { title: 'Test', columns: 0, items: [{ label: 'Item' }] }
      });
      const { container } = render(<GridBlock block={block} />);

      // Should still render, defaulting to 3 columns
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('renders semantic heading for title', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Mediadores');
    });

    it('has proper heading hierarchy', () => {
      const block = makeBlock(FIXTURES.grid);
      const { container } = render(<GridBlock block={block} />);

      // Title should be h3 for proper hierarchy
      const heading = container.querySelector('h3');
      expect(heading).toBeInTheDocument();
    });
  });
});
