import {
  FileText,
  Zap,
  ArrowRight,
  Table,
  List,
  LayoutGrid,
  Columns2,
  AlertTriangle,
  Image,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import type { EduBlockType } from '@/app/services/summariesApi';

interface BlockTypeSelectorProps {
  onSelect: (type: EduBlockType) => void;
  onClose: () => void;
}

interface BlockTypeOption {
  type: EduBlockType;
  icon: LucideIcon;
  name: string;
  description: string;
}

const BLOCK_TYPES: BlockTypeOption[] = [
  { type: 'prose', icon: FileText, name: 'Prosa', description: 'Texto libre con titulo' },
  { type: 'key_point', icon: Zap, name: 'Punto clave', description: 'Concepto importante destacado' },
  { type: 'stages', icon: ArrowRight, name: 'Etapas', description: 'Proceso paso a paso' },
  { type: 'comparison', icon: Table, name: 'Comparacion', description: 'Tabla comparativa' },
  { type: 'list_detail', icon: List, name: 'Lista detallada', description: 'Items con descripcion' },
  { type: 'grid', icon: LayoutGrid, name: 'Cuadricula', description: 'Cards en grid 2-3 columnas' },
  { type: 'two_column', icon: Columns2, name: 'Dos columnas', description: 'Contenido lado a lado' },
  { type: 'callout', icon: AlertTriangle, name: 'Callout', description: 'Tip, alerta o nota clinica' },
  { type: 'image_reference', icon: Image, name: 'Imagen', description: 'Referencia visual con caption' },
  { type: 'section_divider', icon: Minus, name: 'Separador', description: 'Divide secciones' },
];

export default function BlockTypeSelector({ onSelect, onClose }: BlockTypeSelectorProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        role="button"
        tabIndex={-1}
        aria-label="Cerrar selector de bloques"
      />

      {/* Selector card */}
      <div className="relative z-50 w-[calc(100vw-2rem)] max-h-80 overflow-y-auto rounded-xl bg-white p-2 shadow-lg border border-gray-200 sm:w-96">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
          {BLOCK_TYPES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                className="flex items-start gap-3 rounded-lg p-3 text-left transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                onClick={() => {
                  onSelect(option.type);
                  onClose();
                }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{option.name}</p>
                  <p className="text-xs text-gray-500 leading-tight">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export { BLOCK_TYPES, type BlockTypeOption };
