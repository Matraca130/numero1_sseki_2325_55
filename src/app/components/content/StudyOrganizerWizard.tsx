import React, { useState, useMemo } from 'react';
import { useApp, type StudyPlan, type StudyPlanTask } from '@/app/context/AppContext';
import { useStudentNav } from '@/app/hooks/useStudentNav';
import { courses } from '@/app/data/courses';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen, Video, Zap, GraduationCap, FileText, Box,
  ChevronLeft, ChevronRight, Minus, Plus, Calendar,
  Check, Info, AlertTriangle, Sparkles,
  Microscope, Bug, Dna, Heart
} from 'lucide-react';
import clsx from 'clsx';
import { headingStyle, components } from '@/app/design-system';

// ──────────── Constants ────────────
const TOTAL_STEPS = 6;

const STEP_INFO = [
  { title: 'Matérias', desc: 'Vamos montar seu plano de estudo.' },
  { title: 'Recursos', desc: 'Escolha como você quer estudar.' },
  { title: 'Conteúdos', desc: 'Selecione os tópicos específicos.' },
  { title: 'Data Limite', desc: 'Defina quando concluir.' },
  { title: 'Horas Semanais', desc: 'Organize seu tempo.' },
  { title: 'Revisão', desc: 'Confirme e gere seu plano.' },
];

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  anatomy: <Heart size={28} />,
  histology: <Microscope size={28} />,
  biology: <Dna size={28} />,
  microbiology: <Bug size={28} />,
};

const STUDY_METHODS = [
  { id: 'video', label: 'Vídeos', icon: <Video size={28} />, color: 'bg-teal-100 text-teal-600 border-teal-200', avgMinutes: 35 },
  { id: 'flashcard', label: 'Flashcards', icon: <Zap size={28} />, color: 'bg-amber-100 text-amber-600 border-amber-200', avgMinutes: 20 },
  { id: 'quiz', label: 'Quiz', icon: <GraduationCap size={28} />, color: 'bg-purple-100 text-purple-600 border-purple-200', avgMinutes: 15 },
  { id: 'resumo', label: 'Resumo', icon: <FileText size={28} />, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', avgMinutes: 40 },
  { id: '3d', label: 'Atlas 3D', icon: <Box size={28} />, color: 'bg-orange-100 text-orange-600 border-orange-200', avgMinutes: 15 },
];

const DAY_LABELS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// ──────────── Helper ────────────
function getSubjectColor(id: string): string {
  const c = courses.find(c => c.id === id);
  return c?.color || 'bg-gray-500';
}

function getSubjectName(id: string): string {
  const c = courses.find(c => c.id === id);
  return c?.name || id;
}

// ──────────── Main Component ────────────
export function StudyOrganizerWizard() {
  const { addStudyPlan, studyPlans } = useApp();
  const { navigateTo } = useStudentNav();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back

  // Wizard state
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<{ courseId: string; courseName: string; sectionTitle: string; topicTitle: string; topicId: string }[]>([]);
  const [completionDate, setCompletionDate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  const totalWeeklyHours = weeklyHours.reduce((a, b) => a + b, 0);

  // Estimate required hours
  const estimatedHours = useMemo(() => {
    const totalTasks = selectedTopics.length * selectedMethods.length;
    const avgMinPerTask = selectedMethods.reduce((sum, mId) => {
      const m = STUDY_METHODS.find(m => m.id === mId);
      return sum + (m?.avgMinutes || 25);
    }, 0) / Math.max(selectedMethods.length, 1);
    return Math.ceil((totalTasks * avgMinPerTask) / 60);
  }, [selectedTopics, selectedMethods]);

  // Existing plan hours
  const existingPlanHours = studyPlans.reduce((sum, p) => {
    return sum + p.weeklyHours.reduce((a, b) => a + b, 0);
  }, 0);

  // Navigation
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

  const goNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDirection(-1);
      setStep(step - 1);
    } else {
      navigateTo('schedule');
    }
  };

  // Generate plan
  const generatePlan = () => {
    const tasks: StudyPlanTask[] = [];
    const today = new Date(2026, 1, 7); // Feb 7, 2026
    const endDate = new Date(completionDate);
    let currentDay = new Date(today);
    let taskIndex = 0;

    // Create all task items: topic × method
    const allItems: { topicTitle: string; sectionTitle: string; courseName: string; courseId: string; method: string; minutes: number }[] = [];
    for (const topic of selectedTopics) {
      for (const methodId of selectedMethods) {
        const method = STUDY_METHODS.find(m => m.id === methodId);
        allItems.push({
          topicTitle: topic.topicTitle,
          sectionTitle: topic.sectionTitle,
          courseName: topic.courseName,
          courseId: topic.courseId,
          method: methodId,
          minutes: method?.avgMinutes || 25,
        });
      }
    }

    // Distribute tasks across days
    let itemIdx = 0;
    while (currentDay <= endDate && itemIdx < allItems.length) {
      const dayOfWeek = currentDay.getDay(); // 0=Sun ... 6=Sat
      // Map to our weeklyHours array: [Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5, Sun=6]
      const hoursIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const availableMinutes = weeklyHours[hoursIdx] * 60;

      if (availableMinutes > 0) {
        let usedMinutes = 0;
        while (usedMinutes < availableMinutes && itemIdx < allItems.length) {
          const item = allItems[itemIdx];
          if (usedMinutes + item.minutes <= availableMinutes + 10) { // small tolerance
            tasks.push({
              id: `task-${taskIndex++}`,
              date: new Date(currentDay),
              title: `${item.topicTitle}`,
              subject: item.courseName,
              subjectColor: getSubjectColor(item.courseId),
              method: item.method,
              estimatedMinutes: item.minutes,
              completed: false,
            });
            usedMinutes += item.minutes;
            itemIdx++;
          } else {
            break;
          }
        }
      }

      currentDay.setDate(currentDay.getDate() + 1);
    }

    // If items remain, distribute on the last days
    while (itemIdx < allItems.length) {
      const item = allItems[itemIdx];
      tasks.push({
        id: `task-${taskIndex++}`,
        date: new Date(endDate),
        title: `${item.topicTitle}`,
        subject: item.courseName,
        subjectColor: getSubjectColor(item.courseId),
        method: item.method,
        estimatedMinutes: item.minutes,
        completed: false,
      });
      itemIdx++;
    }

    const plan: StudyPlan = {
      id: `plan-${Date.now()}`,
      name: `Plano de Estudo ${studyPlans.length + 1}`,
      subjects: selectedSubjects.map(id => ({ id, name: getSubjectName(id), color: getSubjectColor(id) })),
      methods: selectedMethods,
      selectedTopics,
      completionDate: endDate,
      weeklyHours,
      tasks,
      createdAt: new Date(2026, 1, 7),
      totalEstimatedHours: estimatedHours,
    };

    addStudyPlan(plan);
    navigateTo('schedule');
  };

  // Toggle subject
  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    // Also remove topics from deselected subjects
    if (selectedSubjects.includes(id)) {
      setSelectedTopics(prev => prev.filter(t => t.courseId !== id));
    }
  };

  // Toggle method
  const toggleMethod = (id: string) => {
    setSelectedMethods(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  // Toggle topic
  const toggleTopic = (courseId: string, courseName: string, sectionTitle: string, topicTitle: string, topicId: string) => {
    setSelectedTopics(prev => {
      const exists = prev.some(t => t.topicId === topicId && t.courseId === courseId);
      if (exists) return prev.filter(t => !(t.topicId === topicId && t.courseId === courseId));
      return [...prev, { courseId, courseName, sectionTitle, topicTitle, topicId }];
    });
  };

  // Check if all topics of a section are selected
  const isSectionSelected = (courseId: string, sectionId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return false;
    for (const sem of course.semesters) {
      const section = sem.sections.find(s => s.id === sectionId);
      if (section) {
        return section.topics.every(t => selectedTopics.some(st => st.topicId === t.id && st.courseId === courseId));
      }
    }
    return false;
  };

  // Toggle all topics of a section
  const toggleSection = (courseId: string, sectionId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    for (const sem of course.semesters) {
      const section = sem.sections.find(s => s.id === sectionId);
      if (section) {
        const allSelected = isSectionSelected(courseId, sectionId);
        if (allSelected) {
          setSelectedTopics(prev => prev.filter(t => !(t.courseId === courseId && section.topics.some(st => st.id === t.topicId))));
        } else {
          const newTopics = section.topics
            .filter(t => !selectedTopics.some(st => st.topicId === t.id && st.courseId === courseId))
            .map(t => ({
              courseId,
              courseName: course.name,
              sectionTitle: section.title,
              topicTitle: t.title,
              topicId: t.id,
            }));
          setSelectedTopics(prev => [...prev, ...newTopics]);
        }
      }
    }
  };

  // Update hour for a specific day
  const updateHour = (dayIdx: number, delta: number) => {
    setWeeklyHours(prev => {
      const next = [...prev];
      next[dayIdx] = Math.max(0, Math.min(24, next[dayIdx] + delta));
      return next;
    });
  };

  // ──────────── Render Steps ────────────

  const renderStep = () => {
    switch (step) {
      case 0: return <StepSubjects />;
      case 1: return <StepMethods />;
      case 2: return <StepTopics />;
      case 3: return <StepDate />;
      case 4: return <StepHours />;
      case 5: return <StepReview />;
      default: return null;
    }
  };

  // Step 1: Select Subjects
  function StepSubjects() {
    // Map course IDs to module labels
    const MODULE_LABELS: Record<string, string> = {
      anatomy: 'MÓDULO I',
      histology: 'MÓDULO II',
      biology: 'MÓDULO FINAL',
      microbiology: 'MÓDULO IV',
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-gray-900" style={headingStyle}>Quais matérias você vai estudar?</h2>
          <p className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700">Selecionar todas →</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {courses.map((course) => {
            const isSelected = selectedSubjects.includes(course.id);
            const totalSections = course.semesters.reduce((sum, sem) => sum + sem.sections.length, 0);
            const totalTopics = course.semesters.reduce((sum, sem) => sum + sem.sections.reduce((s2, sec) => s2 + sec.topics.length, 0), 0);

            return (
              <div
                key={course.id}
                className={clsx(
                  "flex flex-col bg-white rounded-2xl border transition-all duration-200",
                  isSelected
                    ? "border-teal-400 shadow-md"
                    : "border-gray-200 shadow-sm"
                )}
              >
                {/* Top: Icon + Name + Percentage */}
                <div className="flex items-start gap-3 p-5 pb-0">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    {SUBJECT_ICONS[course.id] || <BookOpen size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">{course.name}</h3>
                      <span className="text-sm font-semibold text-gray-400">0%</span>
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{MODULE_LABELS[course.id] || 'MÓDULO I'}</p>
                  </div>
                </div>

                {/* Progress row */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <span className="text-sm text-gray-500">Progresso</span>
                  <span className="text-sm text-gray-500">0/{totalTopics} Aulas</span>
                </div>

                {/* Button */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => toggleSubject(course.id)}
                    className={clsx(
                      "w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200",
                      isSelected
                        ? "bg-teal-100 text-teal-700 border border-teal-300"
                        : "bg-teal-600 text-white hover:bg-teal-700"
                    )}
                  >
                    {isSelected ? '✓ Selecionado' : 'Selecionar Matéria'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 2: Select Methods
  function StepMethods() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-gray-900" style={headingStyle}>Quais recursos você prefere?</h2>
          <p className="text-sm text-teal-600 font-medium cursor-pointer hover:text-teal-700" onClick={() => {
            if (selectedMethods.length === STUDY_METHODS.length) setSelectedMethods([]);
            else setSelectedMethods(STUDY_METHODS.map(m => m.id));
          }}>
            {selectedMethods.length === STUDY_METHODS.length ? 'Desmarcar todas' : 'Selecionar todas →'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {STUDY_METHODS.map((method) => {
            const isSelected = selectedMethods.includes(method.id);
            return (
              <div
                key={method.id}
                className={clsx(
                  "flex flex-col bg-white rounded-2xl border transition-all duration-200",
                  isSelected
                    ? "border-teal-400 shadow-md"
                    : "border-gray-200 shadow-sm"
                )}
              >
                {/* Top: Icon + Name */}
                <div className="flex items-start gap-3 p-5 pb-0">
                  <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                    {React.cloneElement(method.icon as React.ReactElement, { size: 20 })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-gray-900">{method.label}</h3>
                      {isSelected && (
                        <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">~{method.avgMinutes} MIN POR SESSÃO</p>
                  </div>
                </div>

                {/* Info row */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3">
                  <span className="text-sm text-gray-500">Tipo</span>
                  <span className="text-sm text-gray-500">Recurso de Estudo</span>
                </div>

                {/* Button */}
                <div className="px-5 pb-5">
                  <button
                    onClick={() => toggleMethod(method.id)}
                    className={clsx(
                      "w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-200",
                      isSelected
                        ? "bg-teal-100 text-teal-700 border border-teal-300"
                        : "bg-teal-600 text-white hover:bg-teal-700"
                    )}
                  >
                    {isSelected ? '✓ Selecionado' : 'Selecionar Recurso'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Step 3: Select Topics
  function StepTopics() {
    const relevantCourses = courses.filter(c => selectedSubjects.includes(c.id));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-gray-900" style={headingStyle}>Selecione os conteúdos</h2>
          <span className="text-sm text-gray-500">{selectedTopics.length} tópico{selectedTopics.length !== 1 ? 's' : ''} selecionado{selectedTopics.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {relevantCourses.map((course) => (
            <div key={course.id} className={`${components.card.base} overflow-hidden`}>
              {/* Course header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                  {SUBJECT_ICONS[course.id] || <BookOpen size={20} />}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{course.name}</h3>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    {course.semesters.reduce((s, sem) => s + sem.sections.reduce((s2, sec) => s2 + sec.topics.length, 0), 0)} tópicos disponíveis
                  </p>
                </div>
              </div>

              {/* Sections */}
              <div className="px-5 py-3 space-y-2">
                {course.semesters.map((sem) => (
                  <div key={sem.id} className="space-y-2">
                    {sem.sections.map((section) => {
                      const sectionSelected = isSectionSelected(course.id, section.id);
                      return (
                        <div key={section.id}>
                          <button
                            onClick={() => toggleSection(course.id, section.id)}
                            className={clsx(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                              sectionSelected ? "bg-teal-50" : "hover:bg-gray-50"
                            )}
                          >
                            <div className={clsx(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                              sectionSelected ? "bg-teal-500 border-teal-500" : "border-gray-300"
                            )}>
                              {sectionSelected && <Check size={12} className="text-white" />}
                            </div>
                            <span className="font-semibold text-gray-800 text-sm flex-1">{section.title}</span>
                            <span className="text-xs text-gray-400">{section.topics.length} tópicos</span>
                          </button>

                          <div className="ml-8 space-y-0.5">
                            {section.topics.map((topic) => {
                              const isSelected = selectedTopics.some(t => t.topicId === topic.id && t.courseId === course.id);
                              return (
                                <button
                                  key={topic.id}
                                  onClick={() => toggleTopic(course.id, course.name, section.title, topic.title, topic.id)}
                                  className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors",
                                    isSelected ? "bg-teal-50 text-teal-700" : "hover:bg-gray-50 text-gray-600"
                                  )}
                                >
                                  <div className={clsx(
                                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                    isSelected ? "bg-teal-500 border-teal-500" : "border-gray-300"
                                  )}>
                                    {isSelected && <Check size={10} className="text-white" />}
                                  </div>
                                  <span>{topic.title}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {selectedTopics.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 text-sm text-teal-700 font-medium flex items-center justify-between">
            <span>{selectedTopics.length} tópico{selectedTopics.length !== 1 ? 's' : ''} selecionado{selectedTopics.length !== 1 ? 's' : ''}</span>
            <button onClick={() => setSelectedTopics([])} className="text-xs text-teal-500 hover:text-teal-700 font-semibold">Limpar</button>
          </div>
        )}
      </div>
    );
  }

  // Step 4: Set Completion Date
  function StepDate() {
    const daysRemaining = completionDate
      ? Math.ceil((new Date(completionDate).getTime() - new Date(2026, 1, 7).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl text-gray-900 mb-2" style={headingStyle}>Quando deseja concluir?</h2>
          <p className="text-gray-500">Defina uma data limite para completar todo o conteúdo selecionado.</p>
        </div>

        <div className={`${components.card.base} p-8`}>
          <div className="flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Calendar size={28} />
            </div>

            <div className="relative w-72">
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                min="2026-02-08"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-700 focus:border-teal-500 focus:outline-none transition-colors bg-white text-center"
                placeholder="Escolher data"
              />
            </div>

            {daysRemaining !== null && (
              <div className="flex items-center gap-4">
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-teal-700">{daysRemaining}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Dias</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 text-center">
                  <p className="text-2xl font-bold text-gray-800">{Math.ceil(daysRemaining / 7)}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Semanas</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 5: Set Weekly Hours
  function StepHours() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl text-gray-900 mb-2" style={headingStyle}>
            Organize sua semana de estudos
          </h2>
          <p className="text-gray-500">
            Estimamos <span className="font-semibold text-teal-600">{estimatedHours} horas</span> de estudo por semana. Ajuste as horas diárias abaixo.
          </p>
        </div>

        <div className={`${components.card.base} ${components.card.paddingLg}`}>
          <div className="grid grid-cols-7 gap-3">
            {DAY_LABELS.map((day, idx) => (
              <div key={day} className="flex flex-col items-center gap-3">
                <span className="font-semibold text-gray-700 text-sm">{day.slice(0, 3)}</span>
                <div className={clsx(
                  "rounded-xl p-3 flex flex-col items-center gap-2 w-full border transition-colors",
                  weeklyHours[idx] > 0 ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200"
                )}>
                  <button
                    onClick={() => updateHour(idx, 1)}
                    className="text-teal-500 hover:text-teal-700 transition-colors p-0.5"
                    disabled={weeklyHours[idx] === 24}
                  >
                    <Plus size={16} />
                  </button>
                  <span className="text-2xl font-bold text-gray-800 tabular-nums">{weeklyHours[idx]}</span>
                  <button
                    onClick={() => updateHour(idx, -1)}
                    className="text-teal-500 hover:text-teal-700 transition-colors p-0.5"
                    disabled={weeklyHours[idx] === 0}
                  >
                    <Minus size={16} />
                  </button>
                </div>
                <span className="text-xs text-gray-400">horas</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary row */}
        <div className="flex items-center justify-between">
          <span className={clsx(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border",
            totalWeeklyHours >= estimatedHours
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            {totalWeeklyHours >= estimatedHours ? <Check size={16} /> : <Info size={16} />}
            Total semanal: {totalWeeklyHours}h / {estimatedHours}h recomendadas
          </span>
        </div>

        {existingPlanHours > 0 && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={16} />
              <span className="font-medium">Total de horas entre todos os planos:</span>
            </div>
            <span className="font-bold text-amber-800">{existingPlanHours + totalWeeklyHours} horas por semana</span>
          </div>
        )}
      </div>
    );
  }

  // Step 6: Review
  function StepReview() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl text-gray-900 flex items-center gap-2" style={headingStyle}>
            <Sparkles size={24} className="text-teal-500" />
            Seu plano está pronto!
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Subjects */}
          <div className={`${components.card.base} overflow-hidden`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <BookOpen size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Matérias</h4>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{selectedSubjects.length} SELECIONADAS</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {selectedSubjects.map(id => (
                <span key={id} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                  {getSubjectName(id)}
                </span>
              ))}
            </div>
          </div>

          {/* Methods */}
          <div className={`${components.card.base} overflow-hidden`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <Zap size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Recursos</h4>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{selectedMethods.length} SELECIONADOS</p>
              </div>
            </div>
            <div className="px-5 py-4 flex flex-wrap gap-2">
              {selectedMethods.map(id => {
                const m = STUDY_METHODS.find(m => m.id === id);
                return (
                  <span key={id} className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                    {m?.label || id}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Topics */}
          <div className={`${components.card.base} overflow-hidden`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Tópicos</h4>
                <p className="text-xs text-gray-400 uppercase tracking-wider">{selectedTopics.length} SELECIONADOS</p>
              </div>
            </div>
            <div className="px-5 py-4 max-h-36 overflow-y-auto space-y-1.5">
              {selectedTopics.map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                  <span>{t.topicTitle}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className={`${components.card.base} overflow-hidden`}>
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">Cronograma</h4>
                <p className="text-xs text-gray-400 uppercase tracking-wider">RESUMO</p>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Data limite</span>
                <span className="font-bold text-gray-800">{completionDate ? new Date(completionDate).toLocaleDateString('pt-BR') : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horas semanais</span>
                <span className="font-bold text-gray-800">{totalWeeklyHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Horas estimadas</span>
                <span className="font-bold text-gray-800">{estimatedHours}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total de tarefas</span>
                <span className="font-bold text-gray-800">{selectedTopics.length * selectedMethods.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ──────────── Main Render ────────────
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="flex h-full bg-white">
      {/* Left Sidebar - Step Info */}
      <div className="w-72 bg-gradient-to-b from-teal-50 to-slate-50 border-r border-gray-200 p-8 flex flex-col shrink-0">
        <div className="mb-8">
          <span className="text-sm font-medium text-gray-500">{step + 1} de {TOTAL_STEPS}</span>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2" style={headingStyle}>{STEP_INFO[step].desc}</h3>

          {/* Step indicators */}
          <div className="mt-8 space-y-3">
            {STEP_INFO.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={clsx(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  i < step ? "bg-teal-500 text-white" :
                  i === step ? "bg-teal-600 text-white shadow-md shadow-teal-200" :
                  "bg-gray-200 text-gray-500"
                )}>
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span className={clsx(
                  "text-sm transition-colors",
                  i === step ? "font-semibold text-gray-900" :
                  i < step ? "font-medium text-teal-600" :
                  "font-medium text-gray-400"
                )}>
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 bg-gray-50">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="border-t border-gray-200 px-10 py-5">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-5">
            <motion.div
              className="h-1 bg-teal-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={goBack}
              className="flex items-center gap-2 px-6 py-3 border-2 border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <ChevronLeft size={18} />
              Voltar
            </button>

            {step < TOTAL_STEPS - 1 ? (
              <button
                onClick={goNext}
                disabled={!canContinue()}
                className={clsx(
                  "flex items-center gap-2 px-8 py-3 rounded-xl font-bold transition-all",
                  canContinue()
                    ? "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-200"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                )}
              >
                Continuar
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={generatePlan}
                className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all"
              >
                <Sparkles size={18} />
                Gerar Plano de Estudo
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}