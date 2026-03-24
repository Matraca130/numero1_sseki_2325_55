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

export default function BlockEditorToolbar({
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
    <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-gray-200 bg-white px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
      {/* Left side */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button variant="outline" size="sm" onClick={onAddBlock}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Agregar bloque</span>
          <span className="sm:hidden">Bloque</span>
        </Button>

        <span className="hidden text-xs text-gray-400 sm:inline">
          {blockCount} {blockCount === 1 ? 'bloque' : 'bloques'}
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Keywords button — icon-only on mobile */}
        {onKeywordsClick && (
          <Button variant="ghost" size="sm" onClick={onKeywordsClick} className="text-violet-600 px-2 sm:px-3">
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Keywords</span>
            {keywordsCount > 0 && (
              <span className="ml-0.5 rounded-full bg-violet-100 px-1.5 text-[10px] font-semibold text-violet-700 sm:ml-1">
                {keywordsCount}
              </span>
            )}
          </Button>
        )}

        {/* Videos button — icon-only on mobile */}
        {onVideosClick && (
          <Button variant="ghost" size="sm" onClick={onVideosClick} className="text-blue-600 px-2 sm:px-3">
            <VideoIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Videos</span>
            {videosCount > 0 && (
              <span className="ml-0.5 rounded-full bg-blue-100 px-1.5 text-[10px] font-semibold text-blue-700 sm:ml-1">
                {videosCount}
              </span>
            )}
          </Button>
        )}

        <div className="mx-0.5 h-4 w-px bg-gray-200 sm:mx-1" />

        <Button variant="ghost" size="sm" onClick={onTogglePreview} className="px-2 sm:px-3">
          {isPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="hidden sm:inline">{isPreview ? 'Editar' : 'Vista previa'}</span>
        </Button>

        {showPublish && onPublish && (
          <Button size="sm" onClick={onPublish} className="bg-violet-600 text-white hover:bg-violet-700 px-2.5 sm:px-3">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Publicar</span>
          </Button>
        )}
      </div>
    </div>
  );
}
