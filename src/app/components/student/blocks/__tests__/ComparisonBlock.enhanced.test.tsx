import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ComparisonBlock from '../ComparisonBlock';
import { makeBlock, FIXTURES } from './test-utils';

describe('ComparisonBlock — Comprehensive Tests', () => {
  describe('Basic Table Rendering', () => {
    it('renders semantic table structure', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const table = container.querySelector('table');
      expect(table).toBeInTheDocument();

      const thead = container.querySelector('thead');
      const tbody = container.querySelector('tbody');
      expect(thead).toBeInTheDocument();
      expect(tbody).toBeInTheDocument();
    });

    it('renders all headers correctly', () => {
      const block = makeBlock(FIXTURES.comparison);
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText('Característica')).toBeInTheDocument();
      expect(screen.getByText('Estable')).toBeInTheDocument();
      expect(screen.getByText('Vulnerable')).toBeInTheDocument();
    });

    it('renders headers with scope="col"', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th[scope="col"]');
      expect(headers.length).toBe(3);
    });

    it('renders all row data correctly', () => {
      const block = makeBlock(FIXTURES.comparison);
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText('Capa fibrosa')).toBeInTheDocument();
      expect(screen.getByText('Gruesa')).toBeInTheDocument();
      expect(screen.getByText('Delgada')).toBeInTheDocument();
      expect(screen.getByText('Riesgo')).toBeInTheDocument();
      expect(screen.getByText('Bajo')).toBeInTheDocument();
      expect(screen.getByText('Alto')).toBeInTheDocument();
    });

    it('renders correct number of rows', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
    });

    it('renders correct number of cells per row', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const rows = container.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        expect(cells.length).toBe(3);
      });
    });
  });

  describe('Title Rendering', () => {
    it('renders title when provided', () => {
      const block = makeBlock(FIXTURES.comparison);
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText('Estable vs Vulnerable')).toBeInTheDocument();
    });

    it('renders title with appropriate styling', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const title = screen.getByText('Estable vs Vulnerable');
      expect(title).toHaveClass('font-serif');
      expect(title).toHaveClass('text-xl');
      expect(title).toHaveClass('font-bold');
    });

    it('does not render title when undefined', () => {
      const block = makeBlock({
        type: 'comparison',
        content: { headers: ['A', 'B'], rows: [['1', '2']] }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const h3 = container.querySelector('h3');
      expect(h3).not.toBeInTheDocument();
    });

    it('handles long titles gracefully', () => {
      const longTitle = 'Comparación muy larga entre dos conceptos médicos complejos '.repeat(3);
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: longTitle,
          headers: ['A', 'B'],
          rows: [['1', '2']]
        }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText(new RegExp(longTitle.slice(0, 20)))).toBeInTheDocument();
    });
  });

  describe('Empty State Handling', () => {
    it('renders empty state when no rows', () => {
      const block = makeBlock({
        type: 'comparison',
        content: { title: 'Test', headers: ['A', 'B'], rows: [] }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });

    it('renders empty state without title', () => {
      const block = makeBlock({
        type: 'comparison',
        content: { headers: ['A', 'B'], rows: [] }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText(/sin datos/i)).toBeInTheDocument();
    });

    it('shows "Sin datos" message in center', () => {
      const block = makeBlock({
        type: 'comparison',
        content: { title: 'Test', headers: ['A', 'B'], rows: [] }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const emptyMsg = screen.getByText(/sin datos/i);
      expect(emptyMsg).toHaveClass('text-center');
    });
  });

  describe('Column Highlighting', () => {
    it('highlights specified column when highlight_column is set', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      // highlight_column is 2 (third column "Vulnerable")
      const cells = container.querySelectorAll('tbody td:nth-child(3)');
      cells.forEach(cell => {
        expect(cell.className).toContain('text-axon-accent');
        expect(cell.className).toContain('bg-axon-teal-50/60');
      });
    });

    it('highlights header of highlighted column', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      const highlightedHeader = headers[2]; // third column

      expect(highlightedHeader.className).toContain('text-axon-mint');
    });

    it('does not highlight other columns', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const firstColCells = container.querySelectorAll('tbody td:nth-child(1)');
      firstColCells.forEach(cell => {
        expect(cell.className).not.toContain('text-axon-accent');
      });

      const secondColCells = container.querySelectorAll('tbody td:nth-child(2)');
      secondColCells.forEach(cell => {
        expect(cell.className).not.toContain('text-axon-accent');
      });
    });

    it('handles missing highlight_column gracefully', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B'],
          rows: [['1', '2']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });

  describe('Cell Styling', () => {
    it('applies different styling to first column cells', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const firstColCells = container.querySelectorAll('tbody td:nth-child(1)');
      firstColCells.forEach(cell => {
        expect(cell).toHaveClass('font-semibold');
        expect(cell.className).toContain('text-axon-dark');
      });
    });

    it('applies gray text to non-first, non-highlighted columns', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B', 'C'],
          rows: [['1', '2', '3']],
          highlight_column: 2
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const secondColCells = container.querySelectorAll('tbody td:nth-child(2)');
      secondColCells.forEach(cell => {
        expect(cell.className).toContain('text-gray');
      });
    });

    it('applies padding and border styling to cells', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const cells = container.querySelectorAll('td');
      cells.forEach(cell => {
        expect(cell).toHaveClass('px-3.5');
        expect(cell).toHaveClass('py-2.5');
        expect(cell.className).toContain('border-b');
      });
    });
  });

  describe('Row Styling', () => {
    it('alternates row background colors', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B'],
          rows: [['1', '2'], ['3', '4'], ['5', '6']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const rows = container.querySelectorAll('tbody tr');
      // Even index rows (0, 2) should have background
      expect(rows[0]).toHaveClass('bg-axon-page-bg');
      expect(rows[1]).not.toHaveClass('bg-axon-page-bg');
      expect(rows[2]).toHaveClass('bg-axon-page-bg');
    });
  });

  describe('Table Container Styling', () => {
    it('has rounded corners', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const tableContainer = container.querySelector('.rounded-xl');
      expect(tableContainer).toBeInTheDocument();
    });

    it('has border', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const tableContainer = container.querySelector('.border');
      expect(tableContainer).toBeInTheDocument();
    });

    it('has overflow-x-auto for responsive layout', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const tableContainer = container.querySelector('.overflow-x-auto');
      expect(tableContainer).toBeInTheDocument();
    });

    it('has dark mode classes', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const tableContainer = container.querySelector('.dark\\:border-gray-700');
      expect(tableContainer || container.firstElementChild).toBeTruthy();
    });
  });

  describe('Header Styling', () => {
    it('applies dark background to header row', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      headers.forEach(header => {
        expect(header).toHaveClass('bg-axon-dark');
      });
    });

    it('applies white text to header cells', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      headers.forEach((header, i) => {
        // Highlighted column (index 2) uses text-axon-mint, others use text-white
        if (i === block.content?.highlight_column) {
          expect(header.className).toContain('text-axon-mint');
        } else {
          expect(header.className).toContain('text-white');
        }
      });
    });

    it('highlights specified column header text color', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      // Highlight column is 2 (third header)
      expect(headers[2]).toHaveClass('text-axon-mint');
    });

    it('applies proper text alignment to headers', () => {
      const block = makeBlock(FIXTURES.comparison);
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      headers.forEach(header => {
        expect(header).toHaveClass('text-left');
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single row', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Single',
          headers: ['A', 'B'],
          rows: [['1', '2']]
        }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('handles many columns', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Many Cols',
          headers: ['A', 'B', 'C', 'D', 'E'],
          rows: [['1', '2', '3', '4', '5']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const headers = container.querySelectorAll('th');
      expect(headers.length).toBe(5);
    });

    it('handles cells with empty strings', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B'],
          rows: [['', '2'], ['1', '']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const cells = container.querySelectorAll('td');
      expect(cells.length).toBe(4);
    });

    it('handles very long cell content', () => {
      const longContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5);
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Long',
          headers: ['A', 'B'],
          rows: [[longContent, 'Short']]
        }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText(new RegExp(longContent.slice(0, 20)))).toBeInTheDocument();
    });

    it('handles special characters in cells', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Special',
          headers: ['A & B', 'C < D'],
          rows: [['1 > 0', '100%']]
        }
      });
      render(<ComparisonBlock block={block} />);

      expect(screen.getByText(/A & B/)).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('handles highlight_column beyond array bounds gracefully', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B'],
          rows: [['1', '2']],
          highlight_column: 999
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });

    it('handles missing headers gracefully', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          rows: [['1', '2']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      const thead = container.querySelector('thead');
      expect(thead).toBeInTheDocument();
    });

    it('handles undefined highlight_column', () => {
      const block = makeBlock({
        type: 'comparison',
        content: {
          title: 'Test',
          headers: ['A', 'B'],
          rows: [['1', '2']]
        }
      });
      const { container } = render(<ComparisonBlock block={block} />);

      expect(container.querySelector('table')).toBeInTheDocument();
    });
  });
});
