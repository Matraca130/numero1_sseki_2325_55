import React from 'react';
import { Plus, Eye, EyeOff, Send, Tag, Video as VideoIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

interface BlockEditorToolbarProps {
  onAddBlock: () => void;
  isPreview: boolean;
  onTogglePreview: () => void;
  onPublish?: () => void;
  onKeywordsClick?: () => void;
  onVideosClick?: () => void;
  keywordsCount?: number;
  videosCount?: number;
  status: string;
  blockCount: number;
}

const BlockEditorToolbar = React.memo(function BlockEditorToolbar({
  onAddBlock,
  isPreview,
  onTogglePreview,
  onPublish,
  onKeywordsClick,
  onVideosClick,
  keywordsCount = 0,
  videosCount = 0,
  status,
  blockCount,
}: BlockEditorToolbarProps) {
  const showPublish = status === 'draft' || status === 'review';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-2.5">
      {/* Left side */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAddBlock}>
          <Plus className="h-4 w-4" />
          Agregar bloque
        </Button>

        <span className="text-xs text-gray-400">
          {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">
        {/* Keywords button */}
        {onKeywordsClick && (
          <Button variant="ghost" size="sm" onClick={onKeywordsClick} className="text-violet-600">
            <Tag className="h-3.5 w-3.5" />
            Palabras clave
            {keywordsCount > 0 && (
              <span className="ml-1 rounded-full bg-violet-100 px-1.5 text-[10px] font-semibold text-violet-700">
                {keywordsCount}
              </span>
            )}
          </Button>
        )}

        {/* Videos button */}
        {onVideosClick && (
          <Button variant="ghost" size="sm" onClick={onVideosClick} className="text-blue-600">
            <VideoIcon className="h-3.5 w-3.5" />
            Videos
            {videosCount > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700">
                {videosCount}
              </span>
            )}
          </Button>
        )}

        <div className="mx-1 h-4 w-px bg-gray-200" />

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
});

export default BlockEditorToolbar;
