/**
 * Constants for StudyOrganizerWizard.
 * Step info, subject icons, study methods, day labels.
 */

import React from 'react';
import {
  BookOpen, Video, Zap, GraduationCap, FileText, Box,
  Microscope, Bug, Dna, Heart,
} from 'lucide-react';

export const TOTAL_STEPS = 6;

export const STEP_INFO = [
  { title: 'Materias', desc: 'Vamos a armar tu plan de estudio.' },
  { title: 'Recursos', desc: 'Elegí cómo querés estudiar.' },
  { title: 'Contenidos', desc: 'Seleccioná los tópicos específicos.' },
  { title: 'Fecha Límite', desc: 'Definí cuándo completar.' },
  { title: 'Horas Semanales', desc: 'Organizá tu tiempo.' },
  { title: 'Revisión', desc: 'Confirmá y generá tu plan.' },
];

export const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  anatomy: React.createElement(Heart, { size: 28 }),
  histology: React.createElement(Microscope, { size: 28 }),
  biology: React.createElement(Dna, { size: 28 }),
  microbiology: React.createElement(Bug, { size: 28 }),
};

export const STUDY_METHODS = [
  { id: 'video', label: 'Vídeos', icon: React.createElement(Video, { size: 28 }), color: 'bg-teal-100 text-teal-600 border-teal-200', avgMinutes: 35 },
  { id: 'flashcard', label: 'Flashcards', icon: React.createElement(Zap, { size: 28 }), color: 'bg-amber-100 text-amber-600 border-amber-200', avgMinutes: 20 },
  { id: 'quiz', label: 'Quiz', icon: React.createElement(GraduationCap, { size: 28 }), color: 'bg-purple-100 text-purple-600 border-purple-200', avgMinutes: 15 },
  { id: 'resumo', label: 'Resumo', icon: React.createElement(FileText, { size: 28 }), color: 'bg-emerald-100 text-emerald-600 border-emerald-200', avgMinutes: 40 },
  { id: '3d', label: 'Atlas 3D', icon: React.createElement(Box, { size: 28 }), color: 'bg-orange-100 text-orange-600 border-orange-200', avgMinutes: 15 },
];

export const DAY_LABELS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
