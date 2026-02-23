import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import {
  createStudySession,
  updateStudySession,
  submitReview,
} from '@/app/services/platformApi';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, FileText, ArrowLeft, MoreVertical, PanelRightClose, PanelRight,
  Plus, Trash2, Maximize, Minimize, Highlighter, MousePointer2,
} from 'lucide-react';
import clsx from 'clsx';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { SummarySession as SummarySessionWithAnnotations } from '@/app/components/content/SummarySessionNew';
import { getLessonsForTopic } from '@/app/data/lessonData';
import { LessonGridView } from '@/app/components/content/LessonGridView';
import { Lesson } from '@/app/data/courses';
import { Quote, StickyNote, Edit3 } from 'lucide-react';

interface AnnotationBlock {
  id: string;
  title: string;
  selectedText: string;
  note: string;
  timestamp: string;
  color: 'yellow' | 'blue' | 'green' | 'pink';
}

export function StudyView() {
  const { currentTopic, currentCourse, setStudySessionActive, setSidebarOpen } = useApp();
  const { navigateTo } = useStudentNav();
  const [session, setSession] = useState<'selection' | 'video' | 'summary' | 'flashcards'>('selection');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  // Check if this topic has lessons
  const lessons = currentTopic ? getLessonsForTopic(currentTopic.id) : [];
  const hasLessons = lessons.length > 0;

  // Reset to selection view when topic changes
  useEffect(() => {
    setSession('selection');
    setActiveLesson(null);
  }, [currentTopic]);

  // Notify context when a content session (video/summary/flashcards) is active
  useEffect(() => {
    setStudySessionActive(session !== 'selection');
    return () => setStudySessionActive(false);
  }, [session, setStudySessionActive]);

  if (!currentTopic) return null;

  const handleBack = () => {
    setSession('selection');
    setActiveLesson(null);
  };
  
  const handleBackToTopics = () => {
    setSidebarOpen(true);
    navigateTo('study-hub');
  };
  
  const handleStartFlashcards = () => setSession('flashcards');

  const handleSelectLesson = (lesson: Lesson, mode: 'video' | 'summary') => {
    setActiveLesson(lesson);
    setSession(mode);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-10 pointer-events-none bg-teal-400" />

      <AnimatePresence mode="wait">
        {session === 'selection' && hasLessons && (
          <LessonGridView
            key="lesson-grid"
            topic={currentTopic}
            courseColor={currentCourse.color}
            accentColor={currentCourse.accentColor}
            onSelectLesson={handleSelectLesson}
            onBack={handleBackToTopics}
          />
        )}

        {session === 'selection' && !hasLessons && (
          <SelectionScreen 
            key="selection" 
            onSelect={setSession} 
            topic={currentTopic} 
            courseColor={currentCourse.color}
            accentColor={currentCourse.accentColor}
          />
        )}
        
        {session === 'video' && (
          <VideoSession 
            key="video" 
            onBack={handleBack} 
            topic={currentTopic}
            courseColor={currentCourse.color}
            accentColor={currentCourse.accentColor}
            activeLesson={activeLesson}
          />
        )}
        
        {session === 'summary' && (
          <SummarySessionWithAnnotations 
            key="summary" 
            onBack={handleBack}
            onStartFlashcards={handleStartFlashcards}
            topic={currentTopic}
            courseColor={currentCourse.color}
            accentColor={currentCourse.accentColor}
          />
        )}

        {session === 'flashcards' && (
          <FlashcardsSession
            key="flashcards"
            onBack={() => setSession('summary')}
            topic={currentTopic}
            courseColor={currentCourse.color}
            accentColor={currentCourse.accentColor}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SelectionScreen({ onSelect, topic, courseColor, accentColor }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex-1 w-full overflow-y-auto z-10"
    >
      <div className="flex flex-col items-center justify-center min-h-full p-8">
        <div className="text-center max-w-2xl mb-12">
        <motion.span 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-teal-50 border border-teal-200 mb-4 inline-block text-teal-600"
        >
          Sessão de Estudo
        </motion.span>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">{topic.title}</h1>
        <p className="text-lg text-gray-500 line-clamp-2">{topic.summary}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* Video Card */}
        <button 
          onClick={() => onSelect('video')}
          className="group relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-gray-900 group-hover:scale-105 transition-transform duration-700">
            <img 
              src="https://images.unsplash.com/photo-1768644675767-40b294727e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodW1hbiUyMGFuYXRvbXklMjBtZWRpY2FsJTIwc3R1ZHl8ZW58MXx8fHwxNzY5MDMzMDMxfDA&ixlib=rb-4.1.0&q=80&w=1080" 
              alt="Video" 
              className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
            />
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Play size={32} className="ml-1 fill-current" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Videoaula</h3>
            <p className="text-white/70 text-sm font-medium">Assistir explicação visual</p>
          </div>
        </button>

        {/* Summary Card */}
        <button 
          onClick={() => onSelect('summary')}
          className="group relative h-64 md:h-80 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 bg-white border border-gray-100"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-teal-500 transition-colors duration-300" />
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 group-hover:bg-gray-50 transition-colors" />
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-900 p-6">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300 bg-teal-50">
              <FileText size={32} className="text-teal-600" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Resumo Didático</h3>
            <p className="text-gray-500 text-sm font-medium">Ler material completo</p>
          </div>
        </button>
      </div>
      </div>
    </motion.div>
  );
}

function VideoSession({ onBack, topic, courseColor, accentColor, activeLesson }: any) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes'>('summary');
  const [noteContent, setNoteContent] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Annotation blocks system
  const [annotations, setAnnotations] = useState<AnnotationBlock[]>([
    {
      id: '1',
      title: 'Anatomia — Revisão',
      selectedText: 'Conceitos fundamentais da anatomia',
      note: 'Revisar antes da prova — foco nas relações topográficas.',
      timestamp: '06/02/2026 14:30',
      color: 'yellow',
    },
  ]);
  const [selectionPopup, setSelectionPopup] = useState<{ text: string; x: number; y: number } | null>(null);
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  const annotationColors = {
    yellow: { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-400', text: 'text-amber-700', highlight: 'bg-amber-100' },
    blue: { bg: 'bg-teal-50', border: 'border-teal-200', accent: 'bg-teal-400', text: 'text-teal-700', highlight: 'bg-teal-100' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-400', text: 'text-emerald-700', highlight: 'bg-emerald-100' },
    pink: { bg: 'bg-pink-50', border: 'border-pink-200', accent: 'bg-pink-400', text: 'text-pink-700', highlight: 'bg-pink-100' },
  };

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0 && summaryRef.current?.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = summaryRef.current.getBoundingClientRect();
      setSelectionPopup({
        text: selection.toString().trim(),
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
      });
    } else {
      // Small delay to allow clicking the popup button
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.toString().trim().length === 0) {
          setSelectionPopup(null);
        }
      }, 200);
    }
  }, []);

  const createAnnotation = (selectedText: string) => {
    const colors: AnnotationBlock['color'][] = ['yellow', 'blue', 'green', 'pink'];
    const newAnnotation: AnnotationBlock = {
      id: Date.now().toString(),
      title: '',
      selectedText,
      note: '',
      timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      color: colors[annotations.length % colors.length],
    };
    setAnnotations(prev => [newAnnotation, ...prev]);
    setEditingAnnotation(newAnnotation.id);
    setSelectionPopup(null);
    setActiveTab('notes');
    window.getSelection()?.removeAllRanges();
  };

  const updateAnnotationNote = (id: string, note: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, note } : a));
  };

  const updateAnnotationTitle = (id: string, title: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, title } : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const changeAnnotationColor = (id: string, color: AnnotationBlock['color']) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, color } : a));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(() => {
        setIsFullscreen(true);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(() => {
          setIsFullscreen(false);
        });
      }
    }
  };

  // Reusable Video Player Content
  const VideoPlayerContent = () => (
    <div className="flex-1 relative flex items-center justify-center group bg-black">
        <img 
        src="https://images.unsplash.com/photo-1768644675767-40b294727e10?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxodW1hbiUyMGFuYXRvbXklMjBtZWRpY2FsJTIwc3R1ZHl8ZW58MXx8fHwxNzY5MDMzMDMxfDA&ixlib=rb-4.1.0&q=80&w=1080" 
        className="absolute inset-0 w-full h-full object-contain opacity-80"
        alt="Video Content"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        <button className="relative z-10 w-20 h-20 bg-white/10 backdrop-blur-md border border-white/20 rounded-full flex items-center justify-center hover:scale-110 transition-transform group-hover:bg-white/20">
        <Play size={32} className="text-white ml-1 fill-white" />
        </button>

        {/* Controls Bar — YouTube-style */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-3 space-y-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden cursor-pointer hover:h-1.5 transition-all">
            <div className={clsx("h-full w-1/3 rounded-full relative", courseColor)} style={{ backgroundColor: 'currentColor' }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
            </div>
        </div>
        <div className="flex items-center justify-between text-white/90 font-medium">
            <div className="flex items-center gap-3">
                <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Play">
                  <Play size={18} fill="currentColor" />
                </button>
                <span className="text-xs">04:20 / 12:45</span>
            </div>
            <div className="flex items-center gap-1">
                <button className="px-2 py-1 text-xs hover:bg-white/10 rounded-md transition-colors">1.0x</button>
                <button className="px-2 py-1 text-xs hover:bg-white/10 rounded-md transition-colors">HD</button>
                <div className="w-px h-4 bg-white/20 mx-1" />
                <button 
                    onClick={() => setShowSidebar(!showSidebar)}
                    className={clsx(
                        "p-1.5 rounded-md transition-colors",
                        showSidebar ? "bg-white/25 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                    )}
                    title={showSidebar ? "Ocultar anotações" : "Mostrar anotações"}
                >
                    {showSidebar ? <PanelRightClose size={18} /> : <PanelRight size={18} />}
                </button>
                <button 
                    onClick={toggleFullscreen}
                    className="p-1.5 text-white/80 hover:bg-white/10 hover:text-white rounded-md transition-colors"
                    title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                </button>
                <button className="p-1.5 text-white/80 hover:bg-white/10 hover:text-white rounded-md transition-colors" title="Mais opções">
                    <MoreVertical size={18} />
                </button>
            </div>
        </div>
        </div>
    </div>
  );

  const content = (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={clsx(
        "flex flex-col h-full bg-black z-20",
        isFullscreen && "fixed inset-0 z-50 w-screen h-screen"
      )}
    >
      {/* Video Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-white/10 backdrop-blur-md border-b border-white/10 shrink-0 z-30">
        <button 
          onClick={() => {
            if (isFullscreen) toggleFullscreen();
            onBack();
          }}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors py-2 px-3 hover:bg-white/10 rounded-lg"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <span className="text-white font-medium truncate max-w-[60%]">{activeLesson ? `${topic.title} — ${activeLesson.title}` : topic.title}</span>
        <div className="w-[88px]" /> {/* Spacer to balance the header */}
      </div>

      {/* Split Content */}
      <div className="flex-1 relative overflow-hidden">
        {showSidebar ? (
            <PanelGroup direction="horizontal" autoSaveId="video-session-split">
                <Panel defaultSize={70} minSize={30} className="relative bg-gray-900 flex flex-col">
                    <VideoPlayerContent />
                </Panel>
                
                <PanelResizeHandle className="w-1.5 bg-black hover:bg-blue-500 transition-colors cursor-col-resize flex items-center justify-center z-40 focus:outline-none focus:bg-blue-500">
                    <div className="w-0.5 h-8 bg-gray-700 rounded-full" />
                </PanelResizeHandle>
                
                <Panel defaultSize={30} minSize={20} className="bg-white flex flex-col border-l border-gray-800">
                    <div className="flex items-center border-b border-gray-200 bg-gray-50/50">
                        <button 
                            onClick={() => setActiveTab('summary')}
                            className={clsx(
                                "flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors relative",
                                activeTab === 'summary' ? clsx("border-current bg-white", accentColor) : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            Resumo
                        </button>
                        <button 
                            onClick={() => setActiveTab('notes')}
                            className={clsx(
                                "flex-1 py-3.5 text-sm font-medium border-b-2 transition-colors relative",
                                activeTab === 'notes' ? clsx("border-current bg-white", accentColor) : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            )}
                        >
                            Anotações
                            {annotations.length > 0 && (
                              <span className={clsx("ml-1.5 inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-[10px] font-bold text-white", courseColor)}>
                                {annotations.length}
                              </span>
                            )}
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-white">
                        {activeTab === 'summary' ? (
                            <div className="p-6 relative" ref={summaryRef} onMouseUp={handleTextSelection}>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{topic.title}</h3>
                                <p className="text-gray-500 leading-relaxed text-sm mb-6 select-text cursor-text">{topic.summary}</p>
                                
                                <div className="prose prose-sm prose-slate max-w-none select-text cursor-text">
                                    <h4 className="text-gray-900 font-bold mb-2">Pontos Principais</h4>
                                    <ul className="list-disc pl-4 space-y-1 text-gray-600">
                                        <li>Conceitos fundamentais da anatomia</li>
                                        <li>Relações estruturais importantes</li>
                                        <li>Aplicações clínicas relevantes</li>
                                    </ul>
                                    
                                    <h4 className="text-gray-900 font-bold mt-6 mb-2">Transcrição Automática</h4>
                                    <p className="text-gray-500 text-xs leading-relaxed">
                                        [00:00] Bem-vindos a aula de hoje. Vamos começar analisando...
                                        <br/>
                                        [00:45] Observem como esta estrutura se conecta com...
                                        <br/>
                                        [02:15] É fundamental entender a vascularização...
                                    </p>
                                </div>

                                {/* Dica de seleção */}
                                {annotations.length === 0 && (
                                  <div className="mt-6 flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                                    <MousePointer2 size={12} />
                                    <span>Selecione um trecho de texto para criar uma anotação</span>
                                  </div>
                                )}

                                {/* Selection popup */}
                                <AnimatePresence>
                                  {selectionPopup && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute z-50"
                                      style={{ left: selectionPopup.x, top: selectionPopup.y, transform: 'translate(-50%, -100%)' }}
                                    >
                                      <div className="bg-gray-900 rounded-lg shadow-xl flex items-center overflow-hidden">
                                        <button
                                          onMouseDown={(e) => { e.preventDefault(); createAnnotation(selectionPopup.text); }}
                                          className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-gray-700 transition-colors text-xs font-medium"
                                        >
                                          <StickyNote size={13} />
                                          Anotar
                                        </button>
                                        <div className="w-px h-5 bg-gray-700" />
                                        <button
                                          onMouseDown={(e) => { e.preventDefault(); createAnnotation(selectionPopup.text); }}
                                          className="flex items-center gap-1.5 px-3 py-2 text-white hover:bg-gray-700 transition-colors text-xs font-medium"
                                        >
                                          <Highlighter size={13} />
                                          Destacar
                                        </button>
                                      </div>
                                      <div className="w-2.5 h-2.5 bg-gray-900 rotate-45 mx-auto -mt-1.5" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="flex flex-col h-full">
                                {/* Annotation blocks header */}
                                <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                                  <span className="text-xs text-gray-400 font-medium">{annotations.length} anotação(ões)</span>
                                  <button
                                    onClick={() => {
                                      const newAnnotation: AnnotationBlock = {
                                        id: Date.now().toString(),
                                        title: '',
                                        selectedText: '',
                                        note: '',
                                        timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
                                        color: 'yellow',
                                      };
                                      setAnnotations(prev => [newAnnotation, ...prev]);
                                      setEditingAnnotation(newAnnotation.id);
                                    }}
                                    className={clsx("flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-all hover:shadow-md active:scale-95", courseColor)}
                                  >
                                    <Plus size={13} />
                                    Nota livre
                                  </button>
                                </div>

                                {/* Annotation blocks list */}
                                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                                  <AnimatePresence>
                                    {annotations.length === 0 ? (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-16 text-center"
                                      >
                                        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                                          <StickyNote size={24} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500 font-medium mb-1">Nenhuma anotação</p>
                                        <p className="text-xs text-gray-400 max-w-[200px]">Selecione um trecho no Resumo ou crie uma nota livre</p>
                                      </motion.div>
                                    ) : (
                                      annotations.map((annotation) => {
                                        const colors = annotationColors[annotation.color];
                                        return (
                                          <motion.div
                                            key={annotation.id}
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, x: 40 }}
                                            layout
                                            className={clsx("rounded-xl border overflow-hidden group transition-shadow hover:shadow-md", colors.bg, colors.border)}
                                          >
                                            {/* Annotation color bar + title + actions */}
                                            <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                              {/* Editable title */}
                                              <input
                                                type="text"
                                                value={annotation.title}
                                                onChange={(e) => updateAnnotationTitle(annotation.id, e.target.value)}
                                                placeholder="Título..."
                                                className={clsx(
                                                  "flex-1 min-w-0 bg-transparent text-xs text-gray-800 placeholder-gray-400 border-none outline-none py-0.5 truncate",
                                                  annotation.title ? "font-semibold" : "font-normal italic"
                                                )}
                                              />
                                              <div className="flex items-center gap-1.5 shrink-0">
                                                {(['yellow', 'blue', 'green', 'pink'] as const).map(c => (
                                                  <button
                                                    key={c}
                                                    onClick={() => changeAnnotationColor(annotation.id, c)}
                                                    className={clsx(
                                                      "w-3.5 h-3.5 rounded-full border-2 transition-transform hover:scale-125",
                                                      annotationColors[c].accent,
                                                      annotation.color === c ? "border-gray-600 scale-110" : "border-transparent"
                                                    )}
                                                  />
                                                ))}
                                              </div>
                                              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                  onClick={() => setEditingAnnotation(editingAnnotation === annotation.id ? null : annotation.id)}
                                                  className="p-1 rounded hover:bg-black/5 transition-colors"
                                                  title="Editar"
                                                >
                                                  <Edit3 size={12} className="text-gray-500" />
                                                </button>
                                                <button
                                                  onClick={() => deleteAnnotation(annotation.id)}
                                                  className="p-1 rounded hover:bg-red-50 transition-colors"
                                                  title="Excluir"
                                                >
                                                  <Trash2 size={12} className="text-red-400" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Quoted text */}
                                            {annotation.selectedText && (
                                              <div className={clsx("mx-3 px-3 py-2 rounded-lg border-l-[3px] mb-2", colors.highlight, colors.border.replace('border-', 'border-l-'))}>
                                                <div className="flex items-start gap-1.5">
                                                  <Quote size={11} className={clsx("mt-0.5 shrink-0", colors.text)} />
                                                  <p className={clsx("text-xs leading-relaxed italic", colors.text)}>&ldquo;{annotation.selectedText}&rdquo;</p>
                                                </div>
                                              </div>
                                            )}

                                            {/* Note content */}
                                            <div className="px-3 pb-2">
                                              {editingAnnotation === annotation.id ? (
                                                <textarea
                                                  autoFocus
                                                  value={annotation.note}
                                                  onChange={(e) => updateAnnotationNote(annotation.id, e.target.value)}
                                                  onBlur={() => setEditingAnnotation(null)}
                                                  onKeyDown={(e) => { if (e.key === 'Escape') setEditingAnnotation(null); }}
                                                  className={clsx("w-full resize-none rounded-lg border px-3 py-2 text-xs text-gray-700 leading-relaxed focus:outline-none focus:ring-2 focus:ring-offset-1 bg-white/80", colors.border, `focus:ring-${annotation.color}-300`)}
                                                  placeholder="Escreva sua anotação..."
                                                  rows={3}
                                                />
                                              ) : (
                                                <p
                                                  onClick={() => setEditingAnnotation(annotation.id)}
                                                  className={clsx("text-xs text-gray-700 leading-relaxed cursor-text min-h-[20px] px-1 py-0.5 rounded hover:bg-white/50 transition-colors", !annotation.note && "text-gray-400 italic")}
                                                >
                                                  {annotation.note || 'Clique para adicionar anotação...'}
                                                </p>
                                              )}
                                            </div>

                                            {/* Timestamp */}
                                            <div className="px-3 pb-2 flex items-center justify-between">
                                              <span className="text-[10px] text-gray-400">{annotation.timestamp}</span>
                                            </div>
                                          </motion.div>
                                        );
                                      })
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Footer */}
                                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/80">
                                  <span className="text-[10px] text-gray-400">Salvo automaticamente</span>
                                </div>
                            </div>
                        )}
                    </div>
                </Panel>
            </PanelGroup>
        ) : (
            <div className="w-full h-full bg-gray-900 flex flex-col">
                 <VideoPlayerContent />
            </div>
        )}
      </div>
    </motion.div>
  );

  if (isFullscreen) {
    return createPortal(content, document.body);
  }

  return content;
}

function FlashcardsSession({ onBack, topic, courseColor, accentColor }: any) {
    const { recordSessionComplete } = useStudentDataContext();
    const [currentCard, setCurrentCard] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [sessionRatings, setSessionRatings] = useState<number[]>([]);

    // Backend session tracking (fire-and-forget)
    const backendSessionId = useRef<string | null>(null);
    const sessionStart = useRef<string>(new Date().toISOString());
    const cardStartTime = useRef<number>(Date.now());

    // Create real backend session on mount
    useEffect(() => {
      (async () => {
        try {
          const session = await createStudySession({
            session_type: 'review',
            instrument_type: 'flashcard',
          });
          backendSessionId.current = session.id;
          console.log('[FlashcardsSession] Backend session created:', session.id);
        } catch (err) {
          console.warn('[FlashcardsSession] Failed to create backend session:', err);
        }
      })();
    }, []);

    // Close backend session + record stats on unmount
    const closeSession = useCallback(() => {
      const sessionId = backendSessionId.current;
      if (!sessionId || sessionRatings.length === 0) return;
      const correctCount = sessionRatings.filter(r => r >= 4).length;
      const timeSpentSeconds = Math.round(
        (Date.now() - new Date(sessionStart.current).getTime()) / 1000
      );

      // Close backend session (fire-and-forget)
      updateStudySession(sessionId, {
        ended_at: new Date().toISOString(),
        items_reviewed: sessionRatings.length,
        correct_count: correctCount,
      }).catch(() => {});

      // Record to daily-activities + student-stats
      recordSessionComplete({
        reviewsCount: sessionRatings.length,
        correctCount,
        timeSpentSeconds,
        type: 'flashcard',
      });
    }, [sessionRatings, recordSessionComplete]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().then(() => {
            setIsFullscreen(true);
          }).catch(() => {
            setIsFullscreen(true);
          });
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
              setIsFullscreen(false);
            }).catch(() => {
              setIsFullscreen(false);
            });
          }
        }
      };
    
    // Mock Data for Flashcards
    const flashcards = [
        { id: 1, front: "Qual a principal função desta estrutura anatômica?", back: "Sustentação mecânica e proteção de órgãos vitais." },
        { id: 2, front: "Quais nervos passam por esta região?", back: "Nervo Vago e Nervo Frênico." },
        { id: 3, front: "Defina o conceito de vascularização colateral.", back: "Circulação alternativa ao redor de uma via bloqueada." },
    ];

    const handleRate = (level: number) => {
        const responseTimeMs = Date.now() - cardStartTime.current;
        const card = flashcards[currentCard];

        // Submit review to real backend (fire-and-forget)
        if (backendSessionId.current && card) {
          submitReview({
            session_id: backendSessionId.current,
            item_id: String(card.id),
            instrument_type: 'flashcard',
            subtopic_id: topic?.id || '',
            keyword_id: String(card.id),
            grade: Math.max(1, Math.min(4, level)) as 1 | 2 | 3 | 4,
            response_time_ms: responseTimeMs,
          }).catch(err => {
            console.warn('[FlashcardsSession] Review submit failed:', err);
          });
        }

        setSessionRatings(prev => [...prev, level]);
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentCard((prev) => (prev + 1) % flashcards.length);
            cardStartTime.current = Date.now();
        }, 300);
    };

    const content = (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx(
                "flex flex-col h-full bg-gray-100 z-20",
                isFullscreen && "fixed inset-0 z-50 w-screen h-screen"
            )}
        >
             {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200 shrink-0">
                <button 
                onClick={() => {
                    if (isFullscreen) toggleFullscreen();
                    closeSession();
                    onBack();
                }}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors py-2 px-3 hover:bg-gray-50 rounded-lg"
                >
                <ArrowLeft size={18} />
                <span className="text-sm font-medium hidden sm:inline">Encerrar Sessão</span>
                <span className="text-sm font-medium sm:hidden">Sair</span>
                </button>
                <div className="text-center">
                    <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider block">Flashcards</span>
                    <span className="text-sm font-bold text-gray-900">{currentCard + 1} / {flashcards.length}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={toggleFullscreen}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
                    >
                        {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                    </button>
                </div> 
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-4 md:p-12 relative overflow-hidden">
                <div className="w-full max-w-5xl aspect-[4/3] md:aspect-[3/2] relative perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
                    <motion.div 
                        className="w-full h-full relative preserve-3d transition-transform duration-700"
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                    >
                        {/* Front */}
                        <div className="absolute inset-0 bg-white rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 md:p-16 text-center backface-hidden border border-gray-100">
                             <span className="mb-4 md:mb-8 px-3 py-1 md:px-4 md:py-1.5 bg-gray-100 text-gray-500 rounded-full text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest">Pergunta</span>
                             <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 leading-tight max-w-4xl select-none">
                                {flashcards[currentCard].front}
                             </h3>
                             <p className="absolute bottom-6 md:bottom-10 text-gray-400 text-xs sm:text-sm md:text-base font-medium animate-pulse">Clique para virar</p>
                        </div>

                        {/* Back */}
                        <div 
                            className={clsx(
                                "absolute inset-0 rounded-3xl shadow-2xl flex flex-col items-center justify-center p-6 md:p-16 text-center backface-hidden border border-white/20 text-white",
                                courseColor
                            )}
                            style={{ transform: "rotateY(180deg)" }}
                        >
                             <span className="mb-4 md:mb-8 px-3 py-1 md:px-4 md:py-1.5 bg-white/20 text-white rounded-full text-xs sm:text-sm md:text-base font-bold uppercase tracking-widest">Resposta</span>
                             <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight max-w-4xl select-none">
                                {flashcards[currentCard].back}
                             </h3>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Footer Controls (SM-2 Inspired) */}
            <div className="min-h-[6rem] py-4 bg-white border-t border-gray-200 flex items-center justify-center gap-4 px-4 shrink-0 overflow-x-auto">
                {!isFlipped ? (
                    <button 
                        onClick={() => setIsFlipped(true)}
                        className="px-8 py-3 md:py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl w-full max-w-md text-sm sm:text-base md:text-lg"
                    >
                        Mostrar Resposta
                    </button>
                ) : (
                    <div className="flex gap-2 w-full max-w-4xl justify-center">
                        <button onClick={() => handleRate(1)} className="flex-1 py-3 px-1 md:px-2 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors text-xs sm:text-sm md:text-base flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs opacity-70 uppercase tracking-wider hidden sm:inline">1</span>
                            <span className="line-clamp-1">Não Sei</span>
                        </button>
                        <button onClick={() => handleRate(2)} className="flex-1 py-3 px-1 md:px-2 bg-orange-100 text-orange-700 font-bold rounded-xl hover:bg-orange-200 transition-colors text-xs sm:text-sm md:text-base flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs opacity-70 uppercase tracking-wider hidden sm:inline">2</span>
                            <span className="line-clamp-1">Difícil</span>
                        </button>
                        <button onClick={() => handleRate(3)} className="flex-1 py-3 px-1 md:px-2 bg-yellow-100 text-yellow-700 font-bold rounded-xl hover:bg-yellow-200 transition-colors text-xs sm:text-sm md:text-base flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs opacity-70 uppercase tracking-wider hidden sm:inline">3</span>
                            <span className="line-clamp-1">Dúvida</span>
                        </button>
                        <button onClick={() => handleRate(4)} className="flex-1 py-3 px-1 md:px-2 bg-lime-100 text-lime-700 font-bold rounded-xl hover:bg-lime-200 transition-colors text-xs sm:text-sm md:text-base flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs opacity-70 uppercase tracking-wider hidden sm:inline">4</span>
                            <span className="line-clamp-1">Bom</span>
                        </button>
                        <button onClick={() => handleRate(5)} className="flex-1 py-3 px-1 md:px-2 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-colors text-xs sm:text-sm md:text-base flex flex-col items-center gap-1">
                            <span className="text-[10px] sm:text-xs opacity-70 uppercase tracking-wider hidden sm:inline">5</span>
                            <span className="line-clamp-1">Perfeito</span>
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );

    if (isFullscreen) {
        return createPortal(content, document.body);
    }

    return content;
}