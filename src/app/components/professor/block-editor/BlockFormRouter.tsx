import type { SummaryBlock } from '@/app/services/summariesApi';
import ProseForm from './forms/ProseForm';
import KeyPointForm from './forms/KeyPointForm';
import StagesForm from './forms/StagesForm';
import ComparisonForm from './forms/ComparisonForm';
import ListDetailForm from './forms/ListDetailForm';
import GridForm from './forms/GridForm';
import TwoColumnForm from './forms/TwoColumnForm';
import CalloutForm from './forms/CalloutForm';
import ImageReferenceForm from './forms/ImageReferenceForm';
import SectionDividerForm from './forms/SectionDividerForm';

interface BlockFormRouterProps {
  block: SummaryBlock;
  onChange: (field: string, value: unknown) => void;
}

export default function BlockFormRouter({ block, onChange }: BlockFormRouterProps) {
  switch (block.type) {
    case 'prose':            return <ProseForm block={block} onChange={onChange} />;
    case 'key_point':        return <KeyPointForm block={block} onChange={onChange} />;
    case 'stages':           return <StagesForm block={block} onChange={onChange} />;
    case 'comparison':       return <ComparisonForm block={block} onChange={onChange} />;
    case 'list_detail':      return <ListDetailForm block={block} onChange={onChange} />;
    case 'grid':             return <GridForm block={block} onChange={onChange} />;
    case 'two_column':       return <TwoColumnForm block={block} onChange={onChange} />;
    case 'callout':          return <CalloutForm block={block} onChange={onChange} />;
    case 'image_reference':  return <ImageReferenceForm block={block} onChange={onChange} />;
    case 'section_divider':  return <SectionDividerForm block={block} onChange={onChange} />;
    default:
      return (
        <div className="text-sm text-gray-400 italic p-3">
          Tipo de bloque no soportado: {block.type}
        </div>
      );
  }
}
