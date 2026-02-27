// ============================================================
// Axon — FlashcardTypeSelector (Flexible Front/Back Picker)
//
// Instead of 6 rigid types, the professor picks independently:
//   Front: "Solo texto" | "Texto + Imagen"
//   Back:  "Solo texto" | "Texto + Imagen"
//
// Internally maps to CardType for backend compatibility:
//   text | text_image | image_text | text_both
//
// Pure presentational component.
// ============================================================
import React from 'react';
import {
  Type, Image, Columns2, SquareSplitHorizontal,
  LayoutGrid, TextCursorInput,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────

export type CardType =
  | 'text'
  | 'text_image'
  | 'image_text'
  | 'image_image'
  | 'text_both'
  | 'cloze';

type SideFormat = 'text' | 'text_image';

interface TypeOption {
  id: CardType;
  label: string;
  description: string;
  icon: React.ReactNode;
  frontLabel: string;
  backLabel: string;
}

// ── Keep TYPE_OPTIONS for backward compat ─────────────────
const TYPE_OPTIONS: TypeOption[] = [
  {
    id: 'text',
    label: 'Texto → Texto',
    description: 'Frente solo texto, reverso solo texto',
    icon: (
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-purple-500">Aa</span>
        <span className="text-gray-300">&rarr;</span>
        <span className="text-[10px] font-bold text-emerald-500">Aa</span>
      </div>
    ),
    frontLabel: 'Texto',
    backLabel: 'Texto',
  },
  {
    id: 'text_image',
    label: 'Texto → Texto + Img',
    description: 'Frente solo texto, reverso texto e imagen',
    icon: (
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-purple-500">Aa</span>
        <span className="text-gray-300">&rarr;</span>
        <Image size={12} className="text-emerald-500" />
      </div>
    ),
    frontLabel: 'Texto',
    backLabel: 'Texto + Imagen',
  },
  {
    id: 'image_text',
    label: 'Texto + Img → Texto',
    description: 'Frente texto e imagen, reverso solo texto',
    icon: (
      <div className="flex items-center gap-1">
        <Image size={12} className="text-purple-500" />
        <span className="text-gray-300">&rarr;</span>
        <span className="text-[10px] font-bold text-emerald-500">Aa</span>
      </div>
    ),
    frontLabel: 'Texto + Imagen',
    backLabel: 'Texto',
  },
  {
    id: 'image_image',
    label: 'Img + Img',
    description: 'Antes/despues, comparaciones',
    icon: (
      <div className="flex items-center gap-1">
        <Image size={12} className="text-purple-500" />
        <span className="text-gray-300">&rarr;</span>
        <Image size={12} className="text-emerald-500" />
      </div>
    ),
    frontLabel: 'Imagen',
    backLabel: 'Imagen',
  },
  {
    id: 'text_both',
    label: 'Texto + Img → Texto + Img',
    description: 'Frente y reverso con texto e imagen',
    icon: (
      <div className="flex items-center gap-1">
        <LayoutGrid size={12} className="text-purple-500" />
        <span className="text-gray-300">&rarr;</span>
        <LayoutGrid size={12} className="text-emerald-500" />
      </div>
    ),
    frontLabel: 'Texto + Imagen',
    backLabel: 'Texto + Imagen',
  },
  {
    id: 'cloze',
    label: 'Cloze',
    description: 'Texto con {{blancos}} a rellenar',
    icon: (
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-purple-500">Aa</span>
        <span className="text-[9px] text-blue-400 font-mono">___</span>
        <span className="text-[10px] font-bold text-purple-500">Aa</span>
      </div>
    ),
    frontLabel: 'Con blancos',
    backLabel: 'Completo',
  },
];

// ── Helpers: CardType ↔ front/back format ─────────────────

function cardTypeToSides(ct: CardType): { front: SideFormat; back: SideFormat } {
  switch (ct) {
    case 'text':        return { front: 'text', back: 'text' };
    case 'text_image':  return { front: 'text', back: 'text_image' };
    case 'image_text':  return { front: 'text_image', back: 'text' };
    case 'image_image': return { front: 'text_image', back: 'text_image' };
    case 'text_both':   return { front: 'text_image', back: 'text_image' };
    case 'cloze':       return { front: 'text', back: 'text' };
    default:            return { front: 'text', back: 'text' };
  }
}

function sidesToCardType(front: SideFormat, back: SideFormat): CardType {
  if (front === 'text' && back === 'text') return 'text';
  if (front === 'text' && back === 'text_image') return 'text_image';
  if (front === 'text_image' && back === 'text') return 'image_text';
  return 'text_both';
}

// ── Props ─────────────────────────────────────────────────

interface FlashcardTypeSelectorProps {
  value: CardType;
  onChange: (type: CardType) => void;
  compact?: boolean;
}

// ── Side Toggle Sub-component ─────────────────────────────

function SideToggle({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: 'purple' | 'emerald';
  selected: SideFormat;
  onSelect: (f: SideFormat) => void;
}) {
  const options: { id: SideFormat; label: string; icon: React.ReactNode }[] = [
    {
      id: 'text',
      label: 'Solo texto',
      icon: <Type size={13} />,
    },
    {
      id: 'text_image',
      label: 'Texto + Imagen',
      icon: <LayoutGrid size={13} />,
    },
  ];

  const activeClasses = color === 'purple'
    ? 'bg-purple-100 text-purple-700 border-purple-200 shadow-sm'
    : 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm';

  return (
    <div className="flex flex-col gap-1">
      <span className={`text-[10px] font-semibold tracking-wide uppercase ${
        color === 'purple' ? 'text-purple-500' : 'text-emerald-500'
      }`}>
        {label}
      </span>
      <div className="flex gap-1.5">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect(opt.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
              selected === opt.id
                ? activeClasses
                : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

export function FlashcardTypeSelector({
  value,
  onChange,
  compact = false,
}: FlashcardTypeSelectorProps) {
  const { front, back } = cardTypeToSides(value);

  const handleFrontChange = (f: SideFormat) => {
    onChange(sidesToCardType(f, back));
  };
  const handleBackChange = (b: SideFormat) => {
    onChange(sidesToCardType(front, b));
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <SideToggle
          label="Frente"
          color="purple"
          selected={front}
          onSelect={handleFrontChange}
        />
        <SideToggle
          label="Reverso"
          color="emerald"
          selected={back}
          onSelect={handleBackChange}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <SideToggle
        label="Frente"
        color="purple"
        selected={front}
        onSelect={handleFrontChange}
      />
      <SideToggle
        label="Reverso"
        color="emerald"
        selected={back}
        onSelect={handleBackChange}
      />
    </div>
  );
}

// Export type options for use in other components
export { TYPE_OPTIONS };
export type { TypeOption };

export default FlashcardTypeSelector;