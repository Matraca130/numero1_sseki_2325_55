import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import IconByName from '../IconByName';

describe('IconByName', () => {
  it('renders known icon by name', () => {
    const { container } = render(<IconByName name="Heart" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute('width')).toBe('20');
  });

  it('renders CircleDot fallback for unknown name', () => {
    const { container } = render(<IconByName name="NonExistentIcon" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.toString()).toContain('circle-dot');
  });

  it('renders CircleDot fallback for undefined name', () => {
    const { container } = render(<IconByName name={undefined} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders CircleDot fallback for null name', () => {
    const { container } = render(<IconByName name={null} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies className prop', () => {
    const { container } = render(<IconByName name="Heart" className="text-red-500" />);
    const svg = container.querySelector('svg');
    expect(svg?.classList.toString()).toContain('text-red-500');
  });

  it('uses default size of 16', () => {
    const { container } = render(<IconByName name="Heart" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('16');
  });

  it('renders all 15 mapped icons', () => {
    const iconNames = [
      'Activity', 'Heart', 'Pill', 'Stethoscope', 'Shield',
      'FlaskConical', 'Clock', 'Lightbulb', 'Target', 'AlertCircle',
      'Brain', 'Info', 'AlertTriangle', 'HelpCircle', 'CheckCircle2',
    ];
    for (const name of iconNames) {
      const { container } = render(<IconByName name={name} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    }
  });
});
