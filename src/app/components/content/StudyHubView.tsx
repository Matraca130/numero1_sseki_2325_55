import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { useAuth } from '@/app/context/AuthContext';
import { useStudyPlans } from '@/app/hooks/useStudyPlans';
import { getFsrsStates, type FsrsStateRecord } from '@/app/services/platformApi';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Folder, FolderOpen, PlayCircle, BookOpen, Clock, CheckCircle2, Layers, Zap, Brain, CalendarCheck } from 'lucide-react';
import clsx from 'clsx';
import { Topic, Section, Semester } from '@/app/data/courses';
import { getLessonsForTopic } from '@/app/data/lessonData';
import { AxonPageHeader } from '@/app/components/shared/AxonPageHeader';
import { headingStyle, components, colors } from '@/app/design-system';
import { iconBadgeClasses } from '@/app/design-system';

interface SectionCardProps {
  section: Section;
  currentCourse: any;
  currentTopic: Topic | null;
  onTopicSelect: (topic: Topic) => void;
  isExpanded: boolean;
  isHidden: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

function SectionCard({ section, currentCourse, currentTopic, onTopicSelect, isExpanded, isHidden, onExpand, onCollapse }: SectionCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const coverImage = section.imageUrl || "https://images.unsplash.com/photo-1602404454048-b0243398564e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaXN0b2xvZ3klMjBtaWNyb3Njb3BlJTIwY2VsbHMlMjBwYXR0ZXJuJTIwYWJzdHJhY3QlMjBtZWRpY2FsJTIwYmx1ZSUyMHB1cnBsZXxlbnwxfHx8fDE3NjkxMjgwOTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral";

  const topicImages: Record<string, string> = {
    shoulder: "https://images.unsplash.com/photo-1763198302535-265c44183bcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwc2hvdWxkZXIlMjBtZWRpY2FsJTIwc2tlbGV0b258ZW58MXx8fHwxNzcwNDk5OTk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    arm: "https://images.unsplash.com/photo-1715532176296-b46557fc7231?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwYXJtJTIwbXVzY2xlcyUyMGJpY2VwJTIwbWVkaWNhbHxlbnwxfHx8fDE3NzA1MDAwMzR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    forearm: "https://images.unsplash.com/photo-1768644675767-40b294727e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwbG93ZXIlMjBsaW1iJTIwbXVzY2xlcyUyMG1lZGljYWx8ZW58MXx8fHwxNzcwNDk5OTk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    hand: "https://images.unsplash.com/photo-1716930138618-39a7d9d76891?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwaHVtYW4lMjBoYW5kJTIwbWVkaWNhbCUyMGlsbHVzdHJhdGlvbnxlbnwxfHx8fDE3NzA0OTk5OTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    elbow: "https://images.unsplash.com/photo-1715531786016-d9d3e0c55952?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGJvdyUyMGpvaW50JTIwYW5hdG9teSUyMG1lZGljYWx8ZW58MXx8fHwxNzcwNTAwMzM5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    thigh: "https://images.unsplash.com/photo-1715531163898-8a11ed131a30?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwdGhpZ2glMjBxdWFkcmljZXBzJTIwbXVzY2xlc3xlbnwxfHx8fDE3NzA1MDAwMzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    leg: "https://images.unsplash.com/photo-1582380330092-636f9aff6aaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwbGVnJTIwbXVzY2xlcyUyMGNhbGYlMjBtZWRpY2FsfGVufDF8fHx8MTc3MDUwMDAzNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    foot: "https://images.unsplash.com/photo-1763198302090-76a6ca09ebd3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwZm9vdCUyMGJvbmVzJTIwbWVkaWNhbHxlbnwxfHx8fDE3NzA1MDAwMDJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    heart: "https://images.unsplash.com/photo-1650562373852-04c5682ec2e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodW1hbiUyMGhlYXJ0JTIwYW5hdG9teSUyMG1lZGljYWx8ZW58MXx8fHwxNzcwNTAwMDM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    lungs: "https://images.unsplash.com/photo-1555708982-8645ec9ce3cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhbmF0b215JTIwbHVuZ3MlMjByZXNwaXJhdG9yeSUyMG1lZGljYWx8ZW58MXx8fHwxNzcwNTAwMDM0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  };

  return (
    <motion.div 
      layout
      className={clsx(
        "bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 transition-all duration-500 group relative",
        isExpanded ? "col-span-full ring-2 ring-teal-100" : "hover:shadow-xl hover:-translate-y-1 cursor-pointer h-80",
        isHidden && "hidden"
      )}
      onClick={() => !isExpanded && onExpand()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div 
            key="cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full"
          >
            {/* Top: Content Name */}
            <div className="p-6 pb-4 bg-white z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={iconBadgeClasses()}>
                  <Folder className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider text-gray-400 uppercase bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                  {section.topics.length} Aulas
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 leading-tight group-hover:text-teal-600 transition-colors" style={headingStyle}>
                {section.title}
              </h3>
            </div>
            
            {/* Bottom: Image */}
            <div className="flex-1 relative overflow-hidden bg-gray-100">
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-10" />
              <img 
                src={coverImage} 
                alt={section.title}
                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
              />
              
              {/* Hover CTA */}
              <div className={clsx(
                "absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] opacity-0 transition-all duration-300 z-20",
                isHovered ? "opacity-100" : ""
              )}>
                <div className="bg-white text-gray-900 px-5 py-2.5 rounded-full font-semibold text-sm shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                  <BookOpen size={16} className="text-teal-600" />
                  Ver Conteúdos
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-6 bg-white"
          >
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                >
                  <ChevronRight className="rotate-180" size={24} />
                </button>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{section.title}</h3>
                  <p className="text-xs text-gray-500 font-medium">Lista de aulas disponíveis</p>
                </div>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onCollapse(); }}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-full transition-colors"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {section.topics
                .map((topic, index) => (
                <motion.div
                  key={topic.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  onClick={(e) => { e.stopPropagation(); onTopicSelect(topic); }}
                  className={clsx(
                    "flex rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group/card h-[200px]",
                    currentTopic?.id === topic.id 
                      ? "border-teal-300 ring-2 ring-teal-100 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  {/* Left: Image */}
                  <div className="w-1/2 relative overflow-hidden bg-gray-100">
                    <img
                      src={topicImages[topic.id] || coverImage}
                      alt={topic.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10 pointer-events-none" />
                    {currentTopic?.id === topic.id && (
                      <div className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <PlayCircle size={10} fill="currentColor" />
                        Atual
                      </div>
                    )}
                  </div>

                  {/* Right: Info */}
                  <div className="w-1/2 p-5 flex flex-col justify-between bg-white">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={clsx(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                          currentTopic?.id === topic.id 
                            ? clsx(currentCourse.color, "text-white")
                            : "bg-gray-100 text-gray-500"
                        )}>
                          {topic.id.charAt(0).toUpperCase()}
                        </div>
                        {getLessonsForTopic(topic.id).length > 0 ? (
                          <span className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider flex items-center gap-1">
                            <Layers size={9} />
                            {getLessonsForTopic(topic.id).length} Aulas
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Resumo</span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">
                        {topic.title}
                      </h4>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">
                        {topic.summary}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-[11px] text-gray-400">
                        {(() => {
                          const topicLessons = getLessonsForTopic(topic.id);
                          const completedLessons = topicLessons.filter(l => l.completed).length;
                          return (
                            <>
                              <span className="flex items-center gap-1">
                                <Clock size={11} /> 
                                {topicLessons.length > 0 ? `${topicLessons.length} aulas` : '15 min'}
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 size={11} /> 
                                {completedLessons > 0 ? `${completedLessons}/${topicLessons.length}` : 'Não iniciado'}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <div className="opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <PlayCircle size={16} className="text-teal-500" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function StudyHubView() {
  const { currentCourse, currentTopic, setCurrentTopic } = useApp();
  const { navigateTo } = useStudentNav();
  const { user } = useAuth();
  const { stats: studentStats, bktStates, isConnected } = useStudentDataContext();
  const { plans: backendPlans } = useStudyPlans();
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [pendingReviews, setPendingReviews] = useState(0);

  // Fetch FSRS states to count pending reviews
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const states = await getFsrsStates({ instrument_type: 'flashcard', limit: 500 });
        if (!cancelled) {
          const now = new Date();
          setPendingReviews(states.filter(s => new Date(s.next_review) <= now).length);
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleTopicSelect = (topic: Topic) => {
    setCurrentTopic(topic);
    navigateTo('study');
  };

  const totalSections = currentCourse.semesters.reduce((acc: number, s: Semester) => acc + s.sections.length, 0);
  const totalTopics = currentCourse.semesters.reduce((acc: number, s: Semester) => acc + s.sections.reduce((a: number, sec: Section) => a + sec.topics.length, 0), 0);

  // Real stats for header
  const activePlans = backendPlans.length;
  const streakDays = isConnected && studentStats ? studentStats.currentStreak : 0;
  const avgMastery = isConnected && bktStates.length > 0
    ? Math.round(bktStates.reduce((s, b) => s + b.p_know, 0) / bktStates.length * 100)
    : 0;

  return (
    <div className="h-full overflow-y-auto bg-surface-dashboard">
      {/* ── AXON Page Header ── */}
      <AxonPageHeader
        title="Plano de Estudos"
        subtitle={currentCourse.name}
        statsLeft={
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>{totalSections} seções &middot; {totalTopics} tópicos</span>
            {isConnected && (
              <>
                {activePlans > 0 && (
                  <span className="flex items-center gap-1 text-teal-600">
                    <CalendarCheck size={13} /> {activePlans} {activePlans === 1 ? 'plano' : 'planos'}
                  </span>
                )}
                {pendingReviews > 0 && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Zap size={13} /> {pendingReviews} revisões
                  </span>
                )}
                {avgMastery > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Brain size={13} /> {avgMastery}% domínio
                  </span>
                )}
              </>
            )}
          </div>
        }
        actionButton={
          <button
            onClick={() => navigateTo('study')}
            className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-full text-sm shadow-sm transition-all active:scale-95 shrink-0"
          >
            <PlayCircle size={15} /> Continuar Estudando
          </button>
        }
      />

      {/* ── Content ── */}
      <div className="px-6 py-6 bg-surface-dashboard">
        <div className="max-w-7xl mx-auto space-y-12">
          {currentCourse.semesters.map((semester: Semester, semesterIndex: number) => {
            const semesterHasExpanded = expandedSectionId !== null && semester.sections.some(s => s.id === expandedSectionId);
            const semesterIsHidden = expandedSectionId !== null && !semesterHasExpanded;

            return (
            <motion.div 
              key={semester.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + (semesterIndex * 0.08) }}
              className={clsx(semesterIsHidden && "hidden")}
            >
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                {semester.title}
                <div className="h-px flex-1 bg-gray-200" />
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {semester.sections.map((section) => (
                  <SectionCard 
                    key={section.id}
                    section={section}
                    currentCourse={currentCourse}
                    currentTopic={currentTopic}
                    onTopicSelect={handleTopicSelect}
                    isExpanded={expandedSectionId === section.id}
                    isHidden={expandedSectionId !== null && expandedSectionId !== section.id}
                    onExpand={() => setExpandedSectionId(section.id)}
                    onCollapse={() => setExpandedSectionId(null)}
                  />
                ))}
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}