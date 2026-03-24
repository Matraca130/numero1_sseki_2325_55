import { GripVertical, Edit3, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { SummaryBlock } from '@/app/services/summariesApi';
import { BLOCK_TYPES } from './BlockTypeSelector';
import type { EduBlockType } from '@/app/services/summariesApi';

interface BlockCardProps {
  block: SummaryBlock;
  isEditing: boolean;
  onToggleEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

function getBlockLabel(type: string): string {
  const found = BLOCK_TYPES.find((bt) => bt.type === type);
  return found ? found.name : type;
}

export default function BlockCard({
  block,
  isEditing,
  onToggleEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  children,
}: BlockCardProps) {
  const blockType = block.type as EduBlockType;
  const blockConfig = BLOCK_TYPES.find((bt) => bt.type === blockType);
  const Icon = blockConfig?.icon;

  return (
    <div
      className={`group relative flex rounded-xl border bg-white transition-shadow ${
        isEditing ? 'border-violet-300 shadow-sm ring-1 ring-violet-100' : 'border-gray-200 hover:shadow-sm'
      }`}
    >
      {/* Drag handle — larger touch target on mobile */}
      <div className="flex w-10 shrink-0 cursor-grab items-start justify-center pt-3 text-gray-300 hover:text-gray-500 active:cursor-grabbing sm:w-8">
        <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
      </div>

      {/* Content area */}
      <div className="min-w-0 flex-1 py-3 pr-3">
        {/* Header row: badge + actions */}
        <div className="mb-2 flex items-center justify-between">
          {/* Type badge */}
          <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
            {Icon && <Icon className="h-3 w-3" />}
            {getBlockLabel(block.type)}
          </span>

          {/* Action buttons — always visible on mobile (no hover), fade-in on desktop */}
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <IconButton
              icon={<ChevronUp className="h-3.5 w-3.5" />}
              onClick={onMoveUp}
              disabled={isFirst}
              label="Mover arriba"
            />
            <IconButton
              icon={<ChevronDown className="h-3.5 w-3.5" />}
              onClick={onMoveDown}
              disabled={isLast}
              label="Mover abajo"
            />
            <IconButton
              icon={<Edit3 className="h-3.5 w-3.5" />}
              onClick={onToggleEdit}
              label={isEditing ? 'Cerrar edicion' : 'Editar'}
              active={isEditing}
            />
            <IconButton
              icon={<Copy className="h-3.5 w-3.5" />}
              onClick={onDuplicate}
              label="Duplicar"
            />
            <IconButton
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={onDelete}
              label="Eliminar"
              destructive
            />
          </div>
        </div>

        {/* Block content (form or preview) */}
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ─── Internal icon button ─── */

interface IconButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  active?: boolean;
  destructive?: boolean;
}

function IconButton({ icon, onClick, label, disabled = false, active = false, destructive = false }: IconButtonProps) {
  let colorClasses = 'text-gray-400 hover:text-gray-600 hover:bg-gray-100';
  if (active) {
    colorClasses = 'text-violet-600 bg-violet-50 hover:bg-violet-100';
  }
  if (destructive) {
    colorClasses = 'text-gray-400 hover:text-red-600 hover:bg-red-50';
  }

  return (
    <button
      type="button"
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-30 disabled:pointer-events-none ${colorClasses}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}
