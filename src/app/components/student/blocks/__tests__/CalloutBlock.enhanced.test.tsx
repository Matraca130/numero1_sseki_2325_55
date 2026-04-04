import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalloutBlock from '../CalloutBlock';
import { makeBlock, FIXTURES } from './test-utils';
import type { SummaryKeyword } from '@/app/services/summariesApi';

// Mock renderTextWithKeywords to test keyword integration separately
vi.mock('../renderTextWithKeywords', () => ({
  default: (text: string, keywords?: SummaryKeyword[]) => {
    // Simple mock that highlights keyword placeholders
    let result = text;
    if (keywords) {
      keywords.forEach(kw => {
        result = result.replace(new RegExp(`{{${kw.name}}}`, 'g'), `[KW: ${kw.name}]`);
      });
    }
    return result.replace(/{{(\w+)}}/g, '[$1]');
  },
}));

describe('CalloutBlock — Comprehensive Tests', () => {
  describe('Variant Rendering', () => {
    it('renders tip variant with lightbulb icon and emerald colors', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Dato')).toBeInTheDocument();
      expect(screen.getByText('El ejercicio aumenta HDL.')).toBeInTheDocument();
      expect(screen.getAllByText('Tip').length).toBeGreaterThanOrEqual(1);

      const wrapper = container.querySelector('.border-l-emerald-500');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders warning variant with alert triangle and amber colors', () => {
      const block = makeBlock(FIXTURES.callout_warning);
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Síntomas silenciosos.')).toBeInTheDocument();
      expect(screen.getAllByText('Atención').length).toBeGreaterThanOrEqual(1);

      const wrapper = container.querySelector('.border-l-amber-500');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders clinical variant with stethoscope and blue colors', () => {
      const block = makeBlock(FIXTURES.callout_clinical);
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Caso Clínico')).toBeInTheDocument();
      expect(screen.getByText('Paciente con dolor precordial.')).toBeInTheDocument();

      const wrapper = container.querySelector('.border-l-blue-500');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders mnemonic variant with brain icon and violet colors', () => {
      const block = makeBlock(FIXTURES.callout_mnemonic);
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getAllByText('Mnemotecnia').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('ABCDE cardiovascular.')).toBeInTheDocument();

      const wrapper = container.querySelector('.border-l-violet-500');
      expect(wrapper).toBeInTheDocument();
    });

    it('renders exam variant with target icon and red colors', () => {
      const block = makeBlock(FIXTURES.callout_exam);
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Para el Examen')).toBeInTheDocument();
      expect(screen.getByText('Pregunta frecuente.')).toBeInTheDocument();

      const wrapper = container.querySelector('.border-l-red-500');
      expect(wrapper).toBeInTheDocument();
    });

    it('defaults to tip variant for unknown variant', () => {
      const block = makeBlock({ type: 'callout', content: { variant: 'unknown', title: 'Test', content: 'Body' } });
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Body')).toBeInTheDocument();
      // Should default to tip colors (emerald)
      const wrapper = container.querySelector('.border-l-emerald-500');
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('Content Rendering', () => {
    it('renders title and content together', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      render(<CalloutBlock block={block} />);

      expect(screen.getByText('Dato')).toBeInTheDocument();
      expect(screen.getByText('El ejercicio aumenta HDL.')).toBeInTheDocument();
    });

    it('renders without title when title is undefined', () => {
      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', content: 'Just content' }
      });
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Just content')).toBeInTheDocument();
      // Variant label 'Tip' is always rendered, but no title div should be present
      const titleDivs = container.querySelectorAll('.font-serif');
      expect(titleDivs.length).toBe(0);
    });

    it('renders without content when content is undefined', () => {
      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', title: 'Just title' }
      });
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Just title')).toBeInTheDocument();
      // Content div should not be rendered
      const contentDiv = container.querySelector('.text-sm');
      expect(contentDiv).not.toBeInTheDocument();
    });

    it('handles empty title and content gracefully', () => {
      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', title: '', content: '' }
      });
      const { container } = render(<CalloutBlock block={block} />);

      // Should still render the variant structure
      expect(container.querySelector('.border-l-emerald-500')).toBeInTheDocument();
    });

    it('handles very long content gracefully', () => {
      const longContent = 'Lorem ipsum dolor sit amet, '.repeat(50);
      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', title: 'Long Content', content: longContent }
      });
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Long Content')).toBeInTheDocument();
      expect(container.querySelector('.text-sm')).toBeInTheDocument();
    });

    it('preserves line breaks and formatting in content', () => {
      const multilineContent = 'Line 1\nLine 2\nLine 3';
      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', title: 'Multiline', content: multilineContent }
      });
      const { container } = render(<CalloutBlock block={block} />);

      // Check that the content is rendered (line breaks are preserved as newlines in DOM)
      const contentDiv = container.querySelector('.text-sm');
      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv?.textContent).toContain('Line 1');
      expect(contentDiv?.textContent).toContain('Line 2');
      expect(contentDiv?.textContent).toContain('Line 3');
    });
  });

  describe('Keyword Integration', () => {
    it('renders with keywords when provided', () => {
      const keywords: SummaryKeyword[] = [
        {
          id: 'kw-1',
          summary_id: 'sum-1',
          name: 'HDL',
          definition: 'High-density lipoprotein',
          priority: 1,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        }
      ];

      const block = makeBlock({
        type: 'callout',
        content: { variant: 'tip', title: 'Dato', content: 'El ejercicio aumenta {{HDL}}.' }
      });

      render(<CalloutBlock block={block} keywords={keywords} />);

      expect(screen.getByText(/HDL/)).toBeInTheDocument();
    });

    it('renders without keywords gracefully', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      render(<CalloutBlock block={block} />);

      expect(screen.getByText('El ejercicio aumenta HDL.')).toBeInTheDocument();
    });

    it('handles multiple keywords in content', () => {
      const keywords: SummaryKeyword[] = [
        {
          id: 'kw-1',
          summary_id: 'sum-1',
          name: 'aterosclerosis',
          definition: 'A disease',
          priority: 1,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'kw-2',
          summary_id: 'sum-1',
          name: 'inflamación',
          definition: 'Inflammation',
          priority: 2,
          is_active: true,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        }
      ];

      const block = makeBlock({
        type: 'callout',
        content: {
          variant: 'tip',
          title: 'Multi',
          content: 'La {{aterosclerosis}} es {{inflamación}}.'
        }
      });

      render(<CalloutBlock block={block} keywords={keywords} />);

      expect(screen.getByText(/aterosclerosis/)).toBeInTheDocument();
      expect(screen.getByText(/inflamación/)).toBeInTheDocument();
    });
  });

  describe('Styling and Appearance', () => {
    it('applies rounded corners and padding', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('rounded-xl');
      expect(wrapper).toHaveClass('px-5');
      expect(wrapper).toHaveClass('py-4');
    });

    it('applies left border styling', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const wrapper = container.firstElementChild;
      expect(wrapper).toHaveClass('border-l-4');
    });

    it('applies light mode styles', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toContain('bg-[#f0fdf4]');
    });

    it('has dark mode classes available', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const wrapper = container.firstElementChild;
      expect(wrapper?.className).toMatch(/dark:/);
    });

    it('applies serif font to title', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const title = screen.getByText('Dato');
      expect(title).toHaveClass('font-serif');
      expect(title).toHaveClass('font-semibold');
    });

    it('applies appropriate text color to content', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const content = screen.getByText('El ejercicio aumenta HDL.');
      expect(content).toHaveClass('text-sm');
      expect(content.className).toMatch(/text-gray/);
    });

    it('variant labels have uppercase styling', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const label = screen.getAllByText('Tip');
      const labelEl = label[0];
      expect(labelEl).toHaveClass('uppercase');
      expect(labelEl).toHaveClass('tracking-[0.05em]');
    });
  });

  describe('Edge Cases', () => {
    it('handles null variant gracefully', () => {
      const block = makeBlock({
        type: 'callout',
        content: { variant: null, title: 'Test', content: 'Content' }
      });
      const { container } = render(<CalloutBlock block={block} />);

      expect(container).toBeTruthy();
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('handles special characters in title', () => {
      const block = makeBlock({
        type: 'callout',
        content: {
          variant: 'tip',
          title: 'Test™ & "Special" <Chars>',
          content: 'Content'
        }
      });
      render(<CalloutBlock block={block} />);

      expect(screen.getByText(/Special/)).toBeInTheDocument();
    });

    it('handles special characters in content', () => {
      const block = makeBlock({
        type: 'callout',
        content: {
          variant: 'tip',
          title: 'Test',
          content: 'Content with & < > " \' special chars'
        }
      });
      render(<CalloutBlock block={block} />);

      expect(screen.getByText(/Content with/)).toBeInTheDocument();
    });

    it('handles whitespace-only title', () => {
      const block = makeBlock({
        type: 'callout',
        content: {
          variant: 'tip',
          title: '   ',
          content: 'Content'
        }
      });
      const { container } = render(<CalloutBlock block={block} />);

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('handles whitespace-only content', () => {
      const block = makeBlock({
        type: 'callout',
        content: {
          variant: 'tip',
          title: 'Title',
          content: '   '
        }
      });
      render(<CalloutBlock block={block} />);

      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  describe('Content Structure', () => {
    it('renders variant label before title', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      const labels = screen.getAllByText('Tip');
      const title = screen.getByText('Dato');

      // Variant label should appear in DOM before title
      const labelPos = container.innerHTML.indexOf('Tip');
      const titlePos = container.innerHTML.indexOf('Dato');
      expect(labelPos).toBeLessThan(titlePos);
    });

    it('has proper spacing between elements', () => {
      const block = makeBlock(FIXTURES.callout_tip);
      const { container } = render(<CalloutBlock block={block} />);

      // Check that elements have proper gap/margin classes
      const title = screen.getByText('Dato');
      expect(title).toHaveClass('mb-1.5');
    });
  });
});
