// ============================================================
// Axon — MapViewEmptyStates
//
// Empty/loading/error state components extracted from
// KnowledgeMapView.tsx to reduce the main file size.
// ============================================================

import { Brain, Map as MapIcon, Globe, RefreshCw, ChevronDown } from 'lucide-react';
import { EmptyState, ErrorState } from '@/app/components/shared/PageStates';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { FadeIn } from '@/app/components/shared/FadeIn';
import { GraphSkeleton } from './GraphSkeleton';
import { headingStyle } from '@/app/design-system';
import type { MapViewI18nStrings } from './mapViewI18n';

// ── Loading skeleton ────────────────────────────────────────

export function MapViewLoadingSkeleton() {
  return (
    <FadeIn>
      <div className="flex flex-col h-[calc(100dvh-4rem)] p-3 sm:p-6 lg:p-8">
        {/* Skeleton header */}
        <div className="flex-shrink-0 mb-4">
          <div className="h-7 w-48 bg-gray-200 rounded-lg animate-pulse motion-reduce:animate-none mb-2" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse motion-reduce:animate-none" />
        </div>
        {/* Skeleton toolbar */}
        <div className="flex-shrink-0 mb-3 flex items-center gap-2">
          <div className="h-9 w-36 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-24 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
          <div className="h-9 w-44 bg-gray-100 rounded-full animate-pulse motion-reduce:animate-none" />
        </div>
        {/* Skeleton graph canvas */}
        <div className="flex-1 min-h-0">
          <GraphSkeleton />
        </div>
      </div>
    </FadeIn>
  );
}

// ── Error state ─────────────────────────────────────────────

interface MapViewErrorProps {
  message: string;
  onRetry: () => void;
}

export function MapViewError({ message, onRetry }: MapViewErrorProps) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

// ── No topic selected ───────────────────────────────────────

interface NoTopicSelectedProps {
  allTopics: { id: string; name: string; courseName: string }[];
  onTopicSelect: (tid: string) => void;
  t: MapViewI18nStrings;
}

export function NoTopicSelected({ allTopics, onTopicSelect, t }: NoTopicSelectedProps) {
  return (
    <FadeIn>
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="w-16 h-16 rounded-2xl bg-[#e8f5f1] flex items-center justify-center mb-5">
          <MapIcon className="w-8 h-8 text-[#2a8c7a] animate-pulse" aria-hidden="true" />
        </div>
        <h2
          className="text-gray-900 mb-2 text-center"
          style={{ ...headingStyle, fontSize: 'clamp(1.1rem, 2vw, 1.35rem)' }}
        >
          {t.pageTitle}
        </h2>
        <p
          className="text-gray-500 mb-6 text-center max-w-sm leading-relaxed"
          style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
        >
          {t.selectTopicPrompt}
        </p>
        {allTopics.length > 0 ? (
          <div className="relative w-full max-w-xs">
            <select
              value=""
              onChange={(e) => e.target.value && onTopicSelect(e.target.value)}
              className="w-full appearance-none bg-white border border-gray-200 rounded-full px-4 py-2.5 pr-9 text-sm text-gray-700 shadow-sm hover:border-gray-300 transition-colors"
              style={{ outlineColor: '#2a8c7a' }}
            >
              <option value="">{t.selectTopicPlaceholder}</option>
              {allTopics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.courseName} — {topic.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        ) : (
          <p
            className="text-gray-500 leading-relaxed"
            style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
          >
            {t.noTopicsAvailable}
          </p>
        )}
      </div>
    </FadeIn>
  );
}

// ── Course scope empty ──────────────────────────────────────

interface CourseScopeEmptyProps {
  courseName: string | undefined;
  courseTopicIds: string[];
  onBack: () => void;
  t: MapViewI18nStrings;
}

export function CourseScopeEmpty({ courseName, courseTopicIds, onBack, t }: CourseScopeEmptyProps) {
  return (
    <FadeIn>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <AxonPageHeader
          title={t.pageTitle}
          subtitle={courseName || t.allTopics}
          onBack={onBack}
        />
        <EmptyState
          icon={<Globe className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
          title={t.noCourseConceptsTitle}
          description={courseTopicIds.length === 0
            ? t.noCourseConceptsNoTopics
            : t.noCourseConceptsEmpty}
        />
      </div>
    </FadeIn>
  );
}

// ── Topic empty (no concepts found) ─────────────────────────

interface TopicEmptyProps {
  onBack: () => void;
  t: MapViewI18nStrings;
}

export function TopicEmpty({ onBack, t }: TopicEmptyProps) {
  return (
    <FadeIn>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <AxonPageHeader
          title={t.pageTitle}
          subtitle={t.pageSubtitle}
          onBack={onBack}
        />
        <EmptyState
          icon={<Brain className="w-12 h-12 text-[#2a8c7a] animate-pulse" />}
          title={t.noConceptsTitle}
          description={t.noConceptsDescription}
        />
      </div>
    </FadeIn>
  );
}

// ── Graph error boundary fallback ───────────────────────────

interface GraphErrorFallbackProps {
  reset: () => void;
  t: MapViewI18nStrings;
}

export function GraphErrorFallback({ reset, t }: GraphErrorFallbackProps) {
  return (
    <div className="w-full h-full min-h-[180px] sm:min-h-[300px] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col items-center justify-center gap-3 px-4">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-red-400" />
      </div>
      <p
        className="text-gray-500 text-center"
        style={{ fontSize: 'clamp(0.8125rem, 1.3vw, 0.875rem)' }}
      >
        {t.graphRenderError}
      </p>
      <button
        onClick={reset}
        className="text-sm font-medium text-[#2a8c7a] hover:underline"
      >
        {t.retry}
      </button>
    </div>
  );
}

// ── "All collapsed" hint ────────────────────────────────────

interface AllCollapsedHintProps {
  onExpandAll: () => void;
  t: MapViewI18nStrings;
}

export function AllCollapsedHint({ onExpandAll, t }: AllCollapsedHintProps) {
  return (
    <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200 px-5 py-4 text-center max-w-[260px]">
        <p className="text-sm font-medium text-gray-600 mb-2">{t.allCollapsed}</p>
        <button
          onClick={onExpandAll}
          className="text-xs font-medium text-[#2a8c7a] hover:underline"
        >
          {t.expandAll}
        </button>
      </div>
    </div>
  );
}

// ── Search no results ───────────────────────────────────────

interface SearchNoResultsProps {
  t: MapViewI18nStrings;
}

export function SearchNoResults({ t }: SearchNoResultsProps) {
  return (
    <div className="w-full h-full min-h-[180px] sm:min-h-[280px] bg-white rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center">
      <div className="flex flex-col items-center text-center px-4">
        <div className="w-12 h-12 rounded-2xl bg-[#e8f5f1] flex items-center justify-center mb-3">
          <Brain className="w-6 h-6 text-[#2a8c7a]" />
        </div>
        <p
          className="font-semibold text-gray-700 mb-1"
          style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(0.875rem, 1.5vw, 1rem)' }}
        >
          {t.searchNoResults}
        </p>
        <p
          className="text-gray-500"
          style={{ fontSize: 'clamp(0.75rem, 1.2vw, 0.8125rem)' }}
        >
          {t.searchTryAnother}
        </p>
      </div>
    </div>
  );
}
