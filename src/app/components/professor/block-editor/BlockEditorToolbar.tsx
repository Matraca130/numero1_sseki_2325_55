import { Plus, Eye, EyeOff, Send } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface BlockEditorToolbarProps {
  onAddBlock: () => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  onPublish?: () => void;
  status: string;
  blockCount: number;
}

export default function BlockEditorToolbar({
  onAddBlock,
  isPreview,
  onTogglePreview,
  onPublish,
  status,
  blockCount,
}: BlockEditorToolbarProps) {
  const showPublish = status === 'draft' || status === 'review';

  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onAddBlock}>
          <Plus className="h-4 w-4" />
          Agregar bloque
        </Button>

        <span className="text-xs text-gray-500">
          {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onTogglePreview}>
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isPreview ? 'Editar' : 'Vista previa'}
        </Button>

        {showPublish && onPublish && (
          <Button size="sm" onClick={onPublish} className="bg-violet-600 text-white hover:bg-violet-700">
            <Send className="h-4 w-4" />
            Publicar
          </Button>
        )}
      </div>
    </div>
  );
}
