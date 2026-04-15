// Axon — SummaryReaderBottomTabs
// Extracted from StudentSummaryReader.tsx (Phase C.4).
// Secondary tabs below the main content: Keywords, Videos, and Mis Notas.
import React from 'react';
import { Tag, Video as VideoIcon, StickyNote } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/app/components/ui/tabs';
import { VideoPlayer } from '@/app/components/student/VideoPlayer';
import { TabBadge } from '@/app/components/student/reader-atoms';
import { ReaderKeywordsTab } from '@/app/components/student/ReaderKeywordsTab';
import { ReaderAnnotationsTab } from '@/app/components/student/ReaderAnnotationsTab';

type KeywordsTabProps = React.ComponentProps<typeof ReaderKeywordsTab>;
type AnnotationsTabProps = React.ComponentProps<typeof ReaderAnnotationsTab>;

interface SummaryReaderBottomTabsProps {
  summaryId: string;
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  // Keyword tab
  keywords: KeywordsTabProps['keywords'];
  keywordsLoading: boolean;
  expandedKeyword: KeywordsTabProps['expandedKeyword'];
  onToggleExpand: KeywordsTabProps['onToggleExpand'];
  subtopics: KeywordsTabProps['subtopics'];
  subtopicsLoading: boolean;
  kwNotes: KeywordsTabProps['kwNotes'];
  kwNotesLoading: boolean;
  onCreateKwNote: KeywordsTabProps['onCreateKwNote'];
  onUpdateKwNote: KeywordsTabProps['onUpdateKwNote'];
  onDeleteKwNote: KeywordsTabProps['onDeleteKwNote'];
  savingKwNote: boolean;
  // Videos
  videosLoading: boolean;
  videosCount: number;
  // Annotations tab
  textAnnotations: AnnotationsTabProps['annotations'];
  annotationsLoading: boolean;
  onCreateAnnotation: AnnotationsTabProps['onCreateAnnotation'];
  onDeleteAnnotation: AnnotationsTabProps['onDeleteAnnotation'];
  savingAnnotation: boolean;
}

export function SummaryReaderBottomTabs({
  summaryId,
  activeTab,
  onActiveTabChange,
  keywords,
  keywordsLoading,
  expandedKeyword,
  onToggleExpand,
  subtopics,
  subtopicsLoading,
  kwNotes,
  kwNotesLoading,
  onCreateKwNote,
  onUpdateKwNote,
  onDeleteKwNote,
  savingKwNote,
  videosLoading,
  videosCount,
  textAnnotations,
  annotationsLoading,
  onCreateAnnotation,
  onDeleteAnnotation,
  savingAnnotation,
}: SummaryReaderBottomTabsProps) {
  return (
    <div className="mt-6">
      <Tabs value={activeTab} onValueChange={onActiveTabChange}>
        <TabsList className="mb-4 bg-white dark:bg-[#1e1f25] border border-zinc-200 dark:border-[#2d2e34] rounded-xl p-1">
          <TabsTrigger value="keywords" className="gap-1.5 rounded-lg">
            <Tag className="w-3.5 h-3.5" />
            <span lang="en">Keywords</span>
            {!keywordsLoading && <TabBadge count={keywords.length} active={activeTab === 'keywords'} />}
          </TabsTrigger>
          <TabsTrigger value="videos" className="gap-1.5 rounded-lg">
            <VideoIcon className="w-3.5 h-3.5" />
            <span lang="en">Videos</span>
            {!videosLoading && <TabBadge count={videosCount} active={activeTab === 'videos'} />}
          </TabsTrigger>
          <TabsTrigger value="annotations" className="gap-1.5 rounded-lg">
            <StickyNote className="w-3.5 h-3.5" />
            Mis Notas
            {!annotationsLoading && textAnnotations.length > 0 && <TabBadge count={textAnnotations.length} active={activeTab === 'annotations'} />}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keywords">
          <ReaderKeywordsTab
            keywords={keywords}
            keywordsLoading={keywordsLoading}
            expandedKeyword={expandedKeyword}
            onToggleExpand={onToggleExpand}
            subtopics={subtopics}
            subtopicsLoading={subtopicsLoading}
            kwNotes={kwNotes}
            kwNotesLoading={kwNotesLoading}
            onCreateKwNote={onCreateKwNote}
            onUpdateKwNote={onUpdateKwNote}
            onDeleteKwNote={onDeleteKwNote}
            savingKwNote={savingKwNote}
          />
        </TabsContent>

        <TabsContent value="videos">
          <div className="bg-white dark:bg-[#1e1f25] rounded-2xl border border-zinc-200 dark:border-[#2d2e34] overflow-hidden">
            <VideoPlayer summaryId={summaryId} />
          </div>
        </TabsContent>

        <TabsContent value="annotations">
          <ReaderAnnotationsTab
            annotations={textAnnotations}
            annotationsLoading={annotationsLoading}
            onCreateAnnotation={onCreateAnnotation}
            onDeleteAnnotation={onDeleteAnnotation}
            savingAnnotation={savingAnnotation}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
