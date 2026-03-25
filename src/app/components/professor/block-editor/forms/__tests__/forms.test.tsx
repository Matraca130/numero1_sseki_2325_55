import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProseForm from '../ProseForm';
import KeyPointForm from '../KeyPointForm';
import StagesForm from '../StagesForm';
import ComparisonForm from '../ComparisonForm';
import ListDetailForm from '../ListDetailForm';
import GridForm from '../GridForm';
import TwoColumnForm from '../TwoColumnForm';
import CalloutForm from '../CalloutForm';
import ImageReferenceForm from '../ImageReferenceForm';
import SectionDividerForm from '../SectionDividerForm';
import { makeBlock, FORM_FIXTURES } from './test-utils';

// ---------------------------------------------------------------------------
// 1. ProseForm
// ---------------------------------------------------------------------------
describe('ProseForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.prose);
    render(<ProseForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo del bloque')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.prose);
    render(<ProseForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Test Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test content paragraph')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://example.com/img.jpg')).toBeInTheDocument();
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.prose);
    render(<ProseForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo del bloque'), { target: { value: 'New Title' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Title');
  });

  it('calls onChange when content is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.prose);
    render(<ProseForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Escribe el contenido...'), { target: { value: 'Updated text' } });
    expect(onChange).toHaveBeenCalledWith('content', 'Updated text');
  });

  it('calls onChange when image URL is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.prose);
    render(<ProseForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'), { target: { value: 'https://new.com/pic.png' } });
    expect(onChange).toHaveBeenCalledWith('image', 'https://new.com/pic.png');
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'prose', content: {} });
    const { container } = render(<ProseForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 2. KeyPointForm
// ---------------------------------------------------------------------------
describe('KeyPointForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo del punto clave')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Key Concept')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Important info')).toBeInTheDocument();
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo del punto clave'), { target: { value: 'New Key' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Key');
  });

  it('calls onChange when content is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Descripcion del punto clave...'), { target: { value: 'Updated desc' } });
    expect(onChange).toHaveBeenCalledWith('content', 'Updated desc');
  });

  it('calls onChange when importance button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Medio'));
    expect(onChange).toHaveBeenCalledWith('importance', 'medium');
  });

  it('calls onChange for each importance level', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.key_point);
    render(<KeyPointForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Alto'));
    expect(onChange).toHaveBeenCalledWith('importance', 'high');
    fireEvent.click(screen.getByText('Critico'));
    expect(onChange).toHaveBeenCalledWith('importance', 'critical');
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'key_point', content: {} });
    const { container } = render(<KeyPointForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 3. StagesForm
// ---------------------------------------------------------------------------
describe('StagesForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo de las etapas')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Process Steps')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Step 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Step 2')).toBeInTheDocument();
  });

  it('displays stage labels', () => {
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={vi.fn()} />);
    expect(screen.getByText('Etapa 1')).toBeInTheDocument();
    expect(screen.getByText('Etapa 2')).toBeInTheDocument();
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo de las etapas'), { target: { value: 'New Stages' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Stages');
  });

  it('calls onChange when stage title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={onChange} />);
    const stageTitleInputs = screen.getAllByPlaceholderText('Titulo de la etapa');
    fireEvent.change(stageTitleInputs[0], { target: { value: 'Updated Step' } });
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ title: 'Updated Step' }),
    ]));
  });

  it('calls onChange with expanded items when add button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Agregar etapa'));
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ stage: 3, title: '', content: '' }),
    ]));
  });

  it('calls onChange when remove button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.stages);
    render(<StagesForm block={block} onChange={onChange} />);
    const removeButtons = screen.getAllByText('Eliminar');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith('items', expect.any(Array));
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'stages', content: {} });
    const { container } = render(<StagesForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 4. ComparisonForm
// ---------------------------------------------------------------------------
describe('ComparisonForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo de la comparacion')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Comparison Table')).toBeInTheDocument();
    // Headers appear in both header inputs and as row placeholders, so use getAll
    expect(screen.getAllByDisplayValue('Feature').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('Option A').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('Option B').length).toBeGreaterThanOrEqual(1);
  });

  it('displays row cell values', () => {
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={vi.fn()} />);
    expect(screen.getAllByDisplayValue('Speed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('Fast').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('Slow').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo de la comparacion'), { target: { value: 'New Compare' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Compare');
  });

  it('calls onChange when a header is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Feature'), { target: { value: 'Attribute' } });
    expect(onChange).toHaveBeenCalledWith('headers', ['Attribute', 'Option A', 'Option B']);
  });

  it('calls onChange when add column button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Agregar columna'));
    expect(onChange).toHaveBeenCalledWith('headers', ['Feature', 'Option A', 'Option B', '']);
  });

  it('calls onChange when add row button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.comparison);
    render(<ComparisonForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Agregar fila'));
    expect(onChange).toHaveBeenCalledWith('rows', expect.arrayContaining([
      expect.arrayContaining(['', '', '']),
    ]));
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'comparison', content: {} });
    const { container } = render(<ComparisonForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 5. ListDetailForm
// ---------------------------------------------------------------------------
describe('ListDetailForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo de la lista')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Risk Factors')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Key risks:')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hypertension')).toBeInTheDocument();
    expect(screen.getByDisplayValue('High BP')).toBeInTheDocument();
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo de la lista'), { target: { value: 'New List' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New List');
  });

  it('calls onChange when intro is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Texto introductorio...'), { target: { value: 'Updated intro' } });
    expect(onChange).toHaveBeenCalledWith('intro', 'Updated intro');
  });

  it('calls onChange when item label is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Hypertension'), { target: { value: 'Diabetes' } });
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ label: 'Diabetes' }),
    ]));
  });

  it('calls onChange with expanded items when add button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Agregar item'));
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ icon: 'Info', label: '', detail: '' }),
    ]));
  });

  it('calls onChange when remove button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.list_detail);
    render(<ListDetailForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onChange).toHaveBeenCalledWith('items', []);
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'list_detail', content: {} });
    const { container } = render(<ListDetailForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 6. GridForm
// ---------------------------------------------------------------------------
describe('GridForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo del grid')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Territories')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cardiac')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Heart area')).toBeInTheDocument();
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo del grid'), { target: { value: 'New Grid' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Grid');
  });

  it('calls onChange when column button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('2 columnas'));
    expect(onChange).toHaveBeenCalledWith('columns', 2);
  });

  it('calls onChange with expanded items when add button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Agregar card'));
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ icon: 'Info', label: '', detail: '' }),
    ]));
  });

  it('calls onChange when item label is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Cardiac'), { target: { value: 'Pulmonary' } });
    expect(onChange).toHaveBeenCalledWith('items', expect.arrayContaining([
      expect.objectContaining({ label: 'Pulmonary' }),
    ]));
  });

  it('calls onChange when remove button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.grid);
    render(<GridForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Eliminar'));
    expect(onChange).toHaveBeenCalledWith('items', []);
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'grid', content: {} });
    const { container } = render(<GridForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 7. TwoColumnForm
// ---------------------------------------------------------------------------
describe('TwoColumnForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={vi.fn()} />);
    expect(screen.getByText('Columna 1')).toBeInTheDocument();
    expect(screen.getByText('Columna 2')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Column A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Column B')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Item 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Detail 1')).toBeInTheDocument();
  });

  it('calls onChange when column title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Column A'), { target: { value: 'Left Side' } });
    expect(onChange).toHaveBeenCalledWith('columns', expect.arrayContaining([
      expect.objectContaining({ title: 'Left Side' }),
    ]));
  });

  it('calls onChange when item label is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue('Item 1'), { target: { value: 'Updated Item' } });
    expect(onChange).toHaveBeenCalledWith('columns', expect.arrayContaining([
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({ label: 'Updated Item' }),
        ]),
      }),
    ]));
  });

  it('calls onChange with expanded items when add button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={onChange} />);
    const addButtons = screen.getAllByText('+ Agregar item');
    fireEvent.click(addButtons[0]);
    expect(onChange).toHaveBeenCalledWith('columns', expect.arrayContaining([
      expect.objectContaining({
        title: 'Column A',
        items: expect.arrayContaining([
          expect.objectContaining({ label: '', detail: '' }),
        ]),
      }),
    ]));
  });

  it('calls onChange when remove item button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.two_column);
    render(<TwoColumnForm block={block} onChange={onChange} />);
    const removeButtons = screen.getAllByText('Eliminar');
    fireEvent.click(removeButtons[0]);
    expect(onChange).toHaveBeenCalledWith('columns', expect.any(Array));
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'two_column', content: {} });
    const { container } = render(<TwoColumnForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 8. CalloutForm
// ---------------------------------------------------------------------------
describe('CalloutForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Titulo del callout')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Warning Title')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Be careful!')).toBeInTheDocument();
  });

  it('renders all variant buttons', () => {
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={vi.fn()} />);
    expect(screen.getByText('Consejo')).toBeInTheDocument();
    expect(screen.getByText('Advertencia')).toBeInTheDocument();
    expect(screen.getByText('Clinico')).toBeInTheDocument();
    expect(screen.getByText('Mnemotecnia')).toBeInTheDocument();
    expect(screen.getByText('Examen')).toBeInTheDocument();
  });

  it('calls onChange when variant button is clicked', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Consejo'));
    expect(onChange).toHaveBeenCalledWith('variant', 'tip');
  });

  it('calls onChange for clinical variant', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={onChange} />);
    fireEvent.click(screen.getByText('Clinico'));
    expect(onChange).toHaveBeenCalledWith('variant', 'clinical');
  });

  it('calls onChange when title is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Titulo del callout'), { target: { value: 'New Callout' } });
    expect(onChange).toHaveBeenCalledWith('title', 'New Callout');
  });

  it('calls onChange when content is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.callout);
    render(<CalloutForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Contenido del callout...'), { target: { value: 'New content' } });
    expect(onChange).toHaveBeenCalledWith('content', 'New content');
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'callout', content: {} });
    const { container } = render(<CalloutForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 9. ImageReferenceForm
// ---------------------------------------------------------------------------
describe('ImageReferenceForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('https://example.com/img.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A diagram')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Figure 1')).toBeInTheDocument();
  });

  it('calls onChange when image URL is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('https://ejemplo.com/imagen.jpg'), { target: { value: 'https://new.com/img.png' } });
    expect(onChange).toHaveBeenCalledWith('image_url', 'https://new.com/img.png');
  });

  it('calls onChange when description is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Descripcion de la imagen...'), { target: { value: 'Updated desc' } });
    expect(onChange).toHaveBeenCalledWith('description', 'Updated desc');
  });

  it('calls onChange when caption is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Texto debajo de la imagen'), { target: { value: 'Fig 2' } });
    expect(onChange).toHaveBeenCalledWith('caption', 'Fig 2');
  });

  it('renders image preview when URL is present', () => {
    const block = makeBlock(FORM_FIXTURES.image_reference);
    render(<ImageReferenceForm block={block} onChange={vi.fn()} />);
    const img = screen.getByAltText('Figure 1');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
  });

  it('does not render image preview when URL is missing', () => {
    const block = makeBlock({ type: 'image_reference', content: { description: 'No image' } });
    render(<ImageReferenceForm block={block} onChange={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'image_reference', content: {} });
    const { container } = render(<ImageReferenceForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 10. SectionDividerForm
// ---------------------------------------------------------------------------
describe('SectionDividerForm', () => {
  it('renders without crashing', () => {
    const block = makeBlock(FORM_FIXTURES.section_divider);
    render(<SectionDividerForm block={block} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Etiqueta del separador (opcional)')).toBeInTheDocument();
  });

  it('displays current content values', () => {
    const block = makeBlock(FORM_FIXTURES.section_divider);
    render(<SectionDividerForm block={block} onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('Next Section')).toBeInTheDocument();
  });

  it('calls onChange when label is edited', () => {
    const onChange = vi.fn();
    const block = makeBlock(FORM_FIXTURES.section_divider);
    render(<SectionDividerForm block={block} onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Etiqueta del separador (opcional)'), { target: { value: 'New Section' } });
    expect(onChange).toHaveBeenCalledWith('label', 'New Section');
  });

  it('handles empty content gracefully', () => {
    const block = makeBlock({ type: 'section_divider', content: {} });
    const { container } = render(<SectionDividerForm block={block} onChange={vi.fn()} />);
    expect(container).toBeTruthy();
  });
});
