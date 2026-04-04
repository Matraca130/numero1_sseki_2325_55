/**
 * StudyOrganizerWizard — Main component.
 * 6-step wizard for creating study plans with AI optimization.
 * Steps are inline due to tight coupling with parent state.
 */

import React, { useState, useMemo } from 'react';
import { useStudySession, type StudyPlan } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { useTreeCourses } from '@/app/hooks/useTreeCourses';
import { useStudyPlansContext } from '@/app/context/StudyPlansContext';
import { useTopicMasteryContext } from '@/app/context/TopicMasteryContext';
import { useStudyTimeEstimatesContext } from '@/app/context/StudyTimeEstimatesContext';
import { useStudentDataContext } from '@/app/context/StudentDataContext';
import { getAxonToday } from '@/app/utils/constants';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Video, Zap, GraduationCap, FileText, Box,
  ChevronLeft, ChevronRight, Minus, Plus, Calendar,
  Check, Info, AlertTriangle, Sparkles, Brain, Clock,
} from 'lucide-react';
import clsx from 'clsx';
import { headingStyle, components } from '@/app/design-system';
import { useStudyIntelligence } from '@/app/hooks/useStudyIntelligence';
import { TOTAL_STEPS, STEP_INFO, SUBJECT_ICONS, STUDY_METHODS, DAY_LABELS } from './constants';
import { getCourseMasteryPercent, getCourseStudiedTopics, getSubjectColor, getSubjectName } from './helpers';
import { generateStudyPlan } from './plan-generation';

export function StudyOrganizerWizard() {
  const { addStudyPlan, studyPlans } = useStudySession();
  const { createPlanFromWizard } = useStudyPlansContext();
  const { navigateTo } = useStudentNav();
  const { courses } = useTreeCourses();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<{ courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[]>([]);
  const [completionDate, setCompletionDate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPowered, setAiPowered] = useState(false);

  const { topicMastery, courseMastery } = useTopicMasteryContext();
  const { sessionHistory, rawDaily: dailyActivity, rawStats: stats } = useStudentDataContext();
  const selectedCourseId = selectedSubjects.length === 1 ? selectedSubjects[0] : null;
  const { data: studyIntelligence } = useStudyIntelligence(selectedCourseId);

  const difficultyMap = useMemo(() => {
    const map = new Map<string, number>();
    if (studyIntelligence?.topics) for (const t of studyIntelligence.topics) if (t.difficulty_estimate !== null) map.set(t.id, t.difficulty_estimate);
    return map;
  }, [studyIntelligence]);

  const { getEstimate: getTimeEstimate, computeTotalHours, computeWeeklyHours: computeWeeklyHoursEstimate, overallConfidence: timeConfidence, hasRealData: hasTimeData, summary: timeSummary } = useStudyTimeEstimatesContext();

  const totalWeeklyHours = weeklyHours.reduce((a, b) => a + b, 0);
  const estimatedTotalHours = useMemo(() => computeTotalHours(selectedTopics.length, selectedMethods), [selectedTopics.length, selectedMethods, computeTotalHours]);
  const estimatedWeeklyHours = useMemo(() => computeWeeklyHoursEstimate(selectedTopics.length, selectedMethods, completionDate || null), [selectedTopics.length, selectedMethods, completionDate, computeWeeklyHoursEstimate]);
  const estimatedHours = estimatedWeeklyHours ?? estimatedTotalHours;

  const selectedMasteryStats = useMemo(() => {
    let withData = 0, totalMastery = 0, needsReview = 0;
    for (const t of selectedTopics) {
      const m = topicMastery.get(t.topicId);
      if (m && m.totalAttempts > 0) { withData++; totalMastery += m.masteryPercent; if (m.needsReview) needsReview++; }
    }
    return { withData, withoutData: selectedTopics.length - withData, avgMastery: withData > 0 ? Math.round(totalMastery / withData) : 0, needsReview };
  }, [selectedTopics, topicMastery]);

  const existingPlanHours = studyPlans.reduce((sum, p) => sum + p.weeklyHours.reduce((a, b) => a + b, 0), 0);

  const canContinue = () => {
    switch (step) {
      case 0: return selectedSubjects.length > 0;
      case 1: return selectedMethods.length > 0;
      case 2: return selectedTopics.length > 0;
      case 3: return completionDate !== '';
      case 4: return totalWeeklyHours > 0;
      case 5: return true;
      default: return false;
    }
  };

  const goNext = () => { if (step < TOTAL_STEPS - 1) { setDirection(1); setStep(step + 1); } };
  const goBack = () => { if (step > 0) { setDirection(-1); setStep(step - 1); } else navigateTo('schedule'); };

  const handleGeneratePlan = async () => {
    setAiLoading(true); setAiPowered(false);
    const result = await generateStudyPlan({
      selectedSubjects, selectedMethods, selectedTopics, completionDate, weeklyHours,
      topicMastery, difficultyMap, getTimeEstimate, courses, existingPlanCount: studyPlans.length,
      sessionHistory, dailyActivity, stats,
      studyIntelligenceTopics: studyIntelligence?.topics,
    });
    setAiPowered(result.aiPowered); setAiLoading(false);
    addStudyPlan(result.plan); createPlanFromWizard(result.plan); navigateTo('schedule');
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    if (selectedSubjects.includes(id)) setSelectedTopics(prev => prev.filter(t => t.courseId !== id));
  };
  const toggleMethod = (id: string) => { setSelectedMethods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]); };
  const toggleTopic = (courseId: string, courseName: string, sectionTitle: string, topicTitle: string, topicId: string) => {
    setSelectedTopics(prev => {
      const exists = prev.some(t => t.topicId === topicId && t.courseId === courseId);
      if (exists) return prev.filter(t => !(t.topicId === topicId && t.courseId === courseId));
      return [...prev, { courseId, courseName, sectionTitle, topicTitle, topicId }];
    });
  };
  const isSectionSelected = (courseId: string, sectionId: string) => {
    const course = courses.find((c: any) => c.id === courseId);
    if (!course) return false;
    for (const sem of course.semesters) { const section = sem.sections.find((s: any) => s.id === sectionId); if (section) return section.topics.every((t: any) => selectedTopics.some(st => st.topicId === t.id && st.courseId === courseId)); }
    return false;
  };
  const toggleSection = (courseId: string, sectionId: string) => {
    const course = courses.find((c: any) => c.id === courseId);
    if (!course) return;
    for (const sem of course.semesters) {
      const section = sem.sections.find((s: any) => s.id === sectionId);
      if (section) {
        if (isSectionSelected(courseId, sectionId)) {
          setSelectedTopics(prev => prev.filter(t => !(t.courseId === courseId && section.topics.some((st: any) => st.id === t.topicId))));
        } else {
          const newTopics = section.topics.filter((t: any) => !selectedTopics.some(st => st.topicId === t.id && st.courseId === courseId))
            .map((t: any) => ({ courseId, courseName: course.name, sectionTitle: section.title, topicTitle: t.title, topicId: t.id }));
          setSelectedTopics(prev => [...prev, ...newTopics]);
        }
      }
    }
  };
  const updateHour = (dayIdx: number, delta: number) => { setWeeklyHours(prev => { const next = [...prev]; next[dayIdx] = Math.max(0, Math.min(24, next[dayIdx] + delta)); return next; }); };

  // ── Step renderers (inline — too coupled to parent state for clean extraction) ──

  function StepSubjects() {
    const MODULE_LABELS: Record<string, string> = { anatomy: 'MÓDULO I', histology: 'MÓDULO II', biology: 'MÓDULO FINAL', microbiology: 'MÓDULO IV' };
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-3xl text-gray-900" style={headingStyle}>¿Qué materias vas a estudiar?</h2></div>
        <div className="grid grid-cols-2 gap-5">
          {courses.map((course: any) => {
            const isSelected = selectedSubjects.includes(course.id);
            const totalTopics = course.semesters.reduce((sum: number, sem: any) => sum + sem.sections.reduce((s2: number, sec: any) => s2 + sec.topics.length, 0), 0);
            const pct = getCourseMasteryPercent(course.id, courseMastery);
            return (
              <div key={course.id} className={clsx("flex flex-col bg-white rounded-2xl border transition-all duration-200", isSelected ? "border-teal-400 shadow-md" : "border-gray-200 shadow-sm")}>
                <div className="flex items-start gap-3 p-5 pb-0">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">{SUBJECT_ICONS[course.id] || <BookOpen size={20} />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">{course.name}</h3>
                      <span className={clsx("text-sm font-semibold", pct >= 70 ? "text-emerald-500" : pct >= 40 ? "text-amber-500" : pct > 0 ? "text-orange-500" : "text-gray-400")}>{pct}%</span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{MODULE_LABELS[course.id] || 'MÓDULO I'}</p>
                  </div>
                </div>
                <div className="px-5 pt-3 pb-1"><div className="w-full bg-gray-100 rounded-full h-1.5"><div className={clsx("h-1.5 rounded-full transition-all duration-500", pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-teal-400")} style={{ width: `${pct}%` }} /></div></div>
                <div className="flex items-center justify-between px-5 pt-2 pb-3"><span className="text-sm text-gray-500">Progreso</span><span className="text-sm text-gray-500">{getCourseStudiedTopics(course.id, courses, topicMastery)}/{totalTopics} Clases</span></div>
                <div className="px-5 pb-5"><button onClick={() => toggleSubject(course.id)} className={clsx("w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200", isSelected ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-teal-600 text-white hover:bg-teal-700")}>{isSelected ? '✓ Seleccionado' : 'Seleccionar Materia'}</button></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function StepMethods() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-gray-900" style={headingStyle}>¿Qué recursos preferís?</h2>
          <p className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700" onClick={() => { if (selectedMethods.length === STUDY_METHODS.length) setSelectedMethods([]); else setSelectedMethods(STUDY_METHODS.map(m => m.id)); }}>
            {selectedMethods.length === STUDY_METHODS.length ? 'Desmarcar todas' : 'Seleccionar todas →'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5">
          {STUDY_METHODS.map((method) => {
            const isSelected = selectedMethods.includes(method.id);
            return (
              <div key={method.id} className={clsx("flex flex-col bg-white rounded-2xl border transition-all duration-200", isSelected ? "border-teal-400 shadow-md" : "border-gray-200 shadow-sm")}>
                <div className="flex items-start gap-3 p-5 pb-0">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">{React.cloneElement(method.icon as React.ReactElement, { size: 20 })}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between"><h3 className="font-bold text-gray-900">{method.label}</h3>{isSelected && <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center"><Check size={14} className="text-white" /></div>}</div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">~{method.avgMinutes} MIN POR SESIÓN</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-5 pt-4 pb-3"><span className="text-sm text-gray-500">Tipo</span><span className="text-sm text-gray-500">Recurso de Estudio</span></div>
                <div className="px-5 pb-5"><button onClick={() => toggleMethod(method.id)} className={clsx("w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200", isSelected ? "bg-teal-100 text-teal-700 border border-teal-300" : "bg-teal-600 text-white hover:bg-teal-700")}>{isSelected ? '✓ Seleccionado' : 'Seleccionar Recurso'}</button></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function StepTopics() {
    const relevantCourses = courses.filter((c: any) => selectedSubjects.includes(c.id));
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-3xl text-gray-900" style={headingStyle}>Seleccioná los contenidos</h2><span className="text-sm text-gray-500">{selectedTopics.length} tópico{selectedTopics.length !== 1 ? 's' : ''}</span></div>
        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {relevantCourses.map((course: any) => (
            <div key={course.id} className={`${components.card.base} overflow-hidden`}>
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"><div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">{SUBJECT_ICONS[course.id] || <BookOpen size={20} />}</div><div className="flex-1"><h3 className="font-bold text-gray-900">{course.name}</h3></div></div>
              <div className="px-5 py-3 space-y-2">
                {course.semesters.map((sem: any) => (<div key={sem.id} className="space-y-2">{sem.sections.map((section: any) => {
                  const sectionSel = isSectionSelected(course.id, section.id);
                  return (<div key={section.id}>
                    <button onClick={() => toggleSection(course.id, section.id)} className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors", sectionSel ? "bg-teal-50" : "hover:bg-gray-50")}>
                      <div className={clsx("w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0", sectionSel ? "bg-teal-500 border-teal-500" : "border-gray-300")}>{sectionSel && <Check size={12} className="text-white" />}</div>
                      <span className="font-semibold text-gray-800 text-sm flex-1">{section.title}</span><span className="text-xs text-gray-400">{section.topics.length} tópicos</span>
                    </button>
                    <div className="ml-8 space-y-0.5">{section.topics.map((topic: any) => {
                      const isSel = selectedTopics.some(t => t.topicId === topic.id && t.courseId === course.id);
                      const mastery = topicMastery.get(topic.id); const mPct = mastery?.masteryPercent ?? 0; const hasData = mastery && mastery.totalAttempts > 0;
                      return (<button key={topic.id} onClick={() => toggleTopic(course.id, course.name, section.title, topic.title, topic.id)} className={clsx("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors", isSel ? "bg-teal-50 text-teal-700" : "hover:bg-gray-50 text-gray-600")}>
                        <div className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors", isSel ? "bg-teal-500 border-teal-500" : "border-gray-300")}>{isSel && <Check size={10} className="text-white" />}</div>
                        <span className="flex-1">{topic.title}</span>
                        {hasData ? <span className={clsx("text-xs font-semibold px-2 py-0.5 rounded-full", mPct >= 70 ? "bg-emerald-100 text-emerald-700" : mPct >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{mPct}%</span> : <span className="text-xs text-gray-300">--</span>}
                      </button>);
                    })}</div>
                  </div>);
                })}</div>))}
              </div>
            </div>
          ))}
        </div>
        {selectedTopics.length > 0 && (<div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 font-medium flex items-center justify-between"><span>{selectedTopics.length} tópicos</span><button onClick={() => setSelectedTopics([])} className="text-xs text-teal-500 hover:text-teal-700 font-semibold">Limpiar</button></div>)}
      </div>
    );
  }

  function StepDate() {
    const daysRemaining = completionDate ? Math.ceil((new Date(completionDate).getTime() - getAxonToday().getTime()) / (1000 * 60 * 60 * 24)) : null;
    return (
      <div className="space-y-6">
        <div><h2 className="text-3xl text-gray-900 mb-2" style={headingStyle}>¿Cuándo querés completar?</h2><p className="text-gray-500">Definí una fecha límite para completar todo el contenido seleccionado.</p></div>
        <div className={`${components.card.base} p-8`}>
          <div className="flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600"><Calendar size={28} /></div>
            <div className="relative w-72"><input type="date" value={completionDate} onChange={(e) => setCompletionDate(e.target.value)} min="2026-02-08" className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 focus:border-teal-500 focus:outline-none transition-colors bg-white text-center" /></div>
            {daysRemaining !== null && (<div className="flex items-center gap-4"><div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-3 text-center"><p className="text-2xl font-bold text-teal-700">{daysRemaining}</p><p className="text-xs text-gray-500 uppercase tracking-wider">Días</p></div><div className="bg-[#F0F2F5] border border-gray-200 rounded-xl px-5 py-3 text-center"><p className="text-2xl font-bold text-gray-800">{Math.ceil(daysRemaining / 7)}</p><p className="text-xs text-gray-500 uppercase tracking-wider">Semanas</p></div></div>)}
          </div>
        </div>
      </div>
    );
  }

  function StepHours() {
    const confidenceLabel = hasTimeData ? timeConfidence === 'high' ? `Basado en ${timeSummary.totalSessionsAnalyzed} sesiones reales` : timeConfidence === 'medium' ? `Basado en ${timeSummary.totalSessionsAnalyzed} sesiones` : `Basado en ${timeSummary.daysOfActivityAnalyzed} días de actividad` : 'Estimación por defecto';
    return (
      <div className="space-y-6">
        <div><h2 className="text-3xl text-gray-900 mb-2" style={headingStyle}>Organizá tu semana de estudio</h2>
          <p className="text-gray-500">{estimatedWeeklyHours !== null ? (<>Estimamos <span className="font-semibold text-teal-600">{estimatedHours}h/semana</span> para completar en el plazo ({estimatedTotalHours}h total).</>) : (<>Estimamos <span className="font-semibold text-teal-600">{estimatedTotalHours} horas</span> de estudio en total.</>)}</p>
        </div>
        {selectedMethods.length > 0 && (<div className={`${components.card.base} px-5 py-4`}><div className="flex items-center gap-2 mb-3"><Clock size={16} className="text-teal-600" /><span className="text-sm font-semibold text-gray-700">Tiempo por recurso</span><span className={clsx("text-xs px-2 py-0.5 rounded-full font-medium ml-auto", hasTimeData ? timeConfidence === 'high' ? "bg-emerald-100 text-emerald-700" : timeConfidence === 'medium' ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-600" : "bg-gray-100 text-gray-500")}>{confidenceLabel}</span></div>
          <div className="grid grid-cols-2 gap-2">{selectedMethods.map(mId => { const method = STUDY_METHODS.find(m => m.id === mId); const est = getTimeEstimate(mId); return (<div key={mId} className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg bg-[#F0F2F5]"><span className="text-gray-600 flex-1">{method?.label || mId}</span><span className="font-semibold text-gray-800 tabular-nums">{est.estimatedMinutes} min</span></div>); })}</div>
        </div>)}
        <div className={`${components.card.base} ${components.card.paddingLg}`}>
          <div className="grid grid-cols-7 gap-3">{DAY_LABELS.map((day, idx) => (<div key={day} className="flex flex-col items-center gap-3"><span className="font-semibold text-gray-700 text-sm">{day.slice(0, 3)}</span><div className={clsx("rounded-xl p-3 flex flex-col items-center gap-2 w-full border transition-colors", weeklyHours[idx] > 0 ? "bg-teal-50 border-teal-200" : "bg-[#F0F2F5] border-gray-200")}><button onClick={() => updateHour(idx, 1)} className="text-teal-500 hover:text-teal-700 transition-colors p-0.5" disabled={weeklyHours[idx] === 24}><Plus size={16} /></button><span className="text-2xl font-bold text-gray-800 tabular-nums">{weeklyHours[idx]}</span><button onClick={() => updateHour(idx, -1)} className="text-teal-500 hover:text-teal-700 transition-colors p-0.5" disabled={weeklyHours[idx] === 0}><Minus size={16} /></button></div><span className="text-xs text-gray-400">horas</span></div>))}</div>
        </div>
        <div className="flex items-center justify-between"><span className={clsx("inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border", totalWeeklyHours >= estimatedHours ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>{totalWeeklyHours >= estimatedHours ? <Check size={16} /> : <Info size={16} />}Total semanal: {totalWeeklyHours}h / {estimatedHours}h recomendadas</span></div>
        {existingPlanHours > 0 && (<div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm"><div className="flex items-center gap-2 text-amber-700"><AlertTriangle size={16} /><span className="font-medium">Total de horas entre todos los planes:</span></div><span className="font-bold text-amber-800">{existingPlanHours + totalWeeklyHours} horas por semana</span></div>)}
      </div>
    );
  }

  function StepReview() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-3xl text-gray-900 flex items-center gap-2" style={headingStyle}><Sparkles size={24} className="text-teal-500" />¡Tu plan está listo!</h2>{aiPowered && (<div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-700"><Sparkles size={12} />Optimizado con IA</div>)}</div>
        <div className="grid grid-cols-2 gap-5">
          <div className={`${components.card.base} overflow-hidden`}><div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"><div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><BookOpen size={20} /></div><div><h4 className="font-bold text-gray-900">Materias</h4><p className="text-xs text-gray-400 uppercase tracking-wider">{selectedSubjects.length} SELECCIONADAS</p></div></div><div className="px-5 py-4 flex flex-wrap gap-2">{selectedSubjects.map(id => <span key={id} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">{getSubjectName(id, courses)}</span>)}</div></div>
          <div className={`${components.card.base} overflow-hidden`}><div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"><div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><Zap size={20} /></div><div><h4 className="font-bold text-gray-900">Recursos</h4><p className="text-xs text-gray-400 uppercase tracking-wider">{selectedMethods.length} SELECCIONADOS</p></div></div><div className="px-5 py-4 flex flex-wrap gap-2">{selectedMethods.map(id => { const m = STUDY_METHODS.find(m => m.id === id); return <span key={id} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">{m?.label || id}</span>; })}</div></div>
          <div className={`${components.card.base} overflow-hidden`}><div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"><div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><FileText size={20} /></div><div><h4 className="font-bold text-gray-900">Tópicos</h4><p className="text-xs text-gray-400 uppercase tracking-wider">{selectedTopics.length} SELECCIONADOS</p></div></div><div className="px-5 py-4 max-h-36 overflow-y-auto space-y-1.5">{selectedTopics.map((t) => { const mastery = topicMastery.get(t.topicId); const mPct = mastery?.masteryPercent ?? 0; const hasData = mastery && mastery.totalAttempts > 0; return (<div key={t.topicId} className="flex items-center gap-2 text-sm text-gray-600"><div className={clsx("w-2 h-2 rounded-full shrink-0", hasData ? mPct >= 70 ? "bg-emerald-400" : mPct >= 40 ? "bg-amber-400" : "bg-red-400" : "bg-teal-400")} /><span className="flex-1">{t.topicTitle}</span>{hasData && <span className={clsx("text-xs font-semibold", mPct >= 70 ? "text-emerald-600" : mPct >= 40 ? "text-amber-600" : "text-red-600")}>{mPct}%</span>}</div>); })}</div></div>
          <div className={`${components.card.base} overflow-hidden`}><div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"><div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0"><Calendar size={20} /></div><div><h4 className="font-bold text-gray-900">Cronograma</h4></div></div><div className="px-5 py-4 space-y-3 text-sm"><div className="flex justify-between"><span className="text-gray-500">Fecha límite</span><span className="font-bold text-gray-800">{completionDate ? new Date(completionDate).toLocaleDateString('es-AR') : '-'}</span></div><div className="flex justify-between"><span className="text-gray-500">Horas semanales</span><span className="font-bold text-gray-800">{totalWeeklyHours}h</span></div><div className="flex justify-between"><span className="text-gray-500">Total estimado</span><span className="font-bold text-gray-800">~{estimatedTotalHours}h</span></div><div className="flex justify-between"><span className="text-gray-500">Total de tareas</span><span className="font-bold text-gray-800">{selectedTopics.length * selectedMethods.length}</span></div></div></div>
        </div>
        {selectedMasteryStats.withData > 0 && (<div className={clsx("rounded-xl border px-5 py-4 flex items-start gap-4", selectedMasteryStats.avgMastery >= 70 ? "bg-emerald-50 border-emerald-200" : selectedMasteryStats.avgMastery >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200")}><div className={clsx("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", selectedMasteryStats.avgMastery >= 70 ? "bg-emerald-100 text-emerald-600" : selectedMasteryStats.avgMastery >= 40 ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600")}><Brain size={20} /></div><div className="flex-1 min-w-0"><div className="flex items-center gap-3 mb-1"><h4 className="font-bold text-gray-900">Mastery Actual</h4><span className={clsx("text-sm font-bold px-2.5 py-0.5 rounded-full", selectedMasteryStats.avgMastery >= 70 ? "bg-emerald-100 text-emerald-700" : selectedMasteryStats.avgMastery >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700")}>{selectedMasteryStats.avgMastery}%</span></div><p className="text-sm text-gray-600">{selectedMasteryStats.withData} de {selectedTopics.length} tópicos con datos.{selectedMasteryStats.needsReview > 0 && <span className="font-semibold text-amber-700"> {selectedMasteryStats.needsReview} necesitan revisión.</span>}</p></div></div>)}
      </div>
    );
  }

  const renderStep = () => { switch (step) { case 0: return StepSubjects(); case 1: return StepMethods(); case 2: return StepTopics(); case 3: return StepDate(); case 4: return StepHours(); case 5: return StepReview(); default: return null; } };
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="flex h-full bg-white">
      <div className="w-72 bg-gradient-to-b from-teal-50 to-slate-50 border-r border-gray-200 p-8 flex flex-col shrink-0">
        <div className="mb-8"><span className="text-sm font-medium text-gray-500">{step + 1} de {TOTAL_STEPS}</span></div>
        <div className="flex-1"><h3 className="text-lg font-semibold text-gray-900 mb-2" style={headingStyle}>{STEP_INFO[step].desc}</h3>
          <div className="mt-8 space-y-3">{STEP_INFO.map((s, i) => (<div key={i} className="flex items-center gap-3"><div className={clsx("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all", i < step ? "bg-teal-500 text-white" : i === step ? "bg-teal-600 text-white shadow-md shadow-teal-200" : "bg-gray-200 text-gray-500")}>{i < step ? <Check size={14} /> : i + 1}</div><span className={clsx("text-sm transition-colors", i === step ? "font-semibold text-gray-900" : i < step ? "font-medium text-teal-600" : "font-medium text-gray-400")}>{s.title}</span></div>))}</div>
        </div>
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto p-10 bg-[#F0F2F5]">
          <AnimatePresence mode="wait" custom={direction}><motion.div key={step} custom={direction} initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -direction * 40 }} transition={{ duration: 0.25, ease: 'easeInOut' }}>{renderStep()}</motion.div></AnimatePresence>
        </div>
        <div className="border-t border-gray-200 px-10 py-5">
          <div className="w-full bg-gray-200 rounded-full h-1 mb-5"><motion.div className="h-1 bg-teal-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} /></div>
          <div className="flex justify-between items-center">
            <button onClick={goBack} className="flex items-center gap-2 px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"><ChevronLeft size={18} />Volver</button>
            {step < TOTAL_STEPS - 1 ? (
              <button onClick={goNext} disabled={!canContinue()} className={clsx("flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all", canContinue() ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200" : "bg-gray-200 text-gray-400 cursor-not-allowed")}>Continuar<ChevronRight size={18} /></button>
            ) : (
              <button onClick={handleGeneratePlan} disabled={aiLoading} className={clsx("flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg shadow-teal-200 transition-all", aiLoading ? "bg-teal-500 text-white cursor-wait" : "bg-teal-600 text-white hover:bg-teal-700")}>
                {aiLoading ? (<><Sparkles size={18} className="animate-pulse" />Claude esta analizando tu perfil...</>) : (<><Sparkles size={18} />Generar Plan de Estudio</>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
