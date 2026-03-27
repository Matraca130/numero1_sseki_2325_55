// ============================================================
// Axon — ExamForm
//
// [S-2] Calendar v2 — Create / Edit exam event form.
//
// Fields: title, date, time, location, course_id, is_final,
//         exam_type
//
// Validation: Zod + react-hook-form.
// Submit: POST /exam-events (create) or PATCH /exam-events/:id (edit).
// Delete: with AlertDialog confirmation.
// On success: invalidateQueries(['calendar-data']) to refresh.
// ============================================================

import { useEffect, useMemo, useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';

import { apiCall } from '@/app/lib/api';
import type { CalendarEvent } from '@/app/hooks/useCalendarEvents';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/app/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

// ── Schema ─────────────────────────────────────────────────

const examFormSchema = z.object({
  title: z
    .string()
    .min(1, 'El titulo es obligatorio')
    .max(200, 'Maximo 200 caracteres'),
  date: z.string().min(1, 'La fecha es obligatoria'),
  time: z.string().optional().default(''),
  location: z.string().optional().default(''),
  course_id: z.string().min(1, 'Selecciona un curso'),
  is_final: z.boolean().default(true),
  exam_type: z.string().min(1, 'Selecciona un tipo'),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

// ── Exam types ─────────────────────────────────────────────

const EXAM_TYPES = [
  { value: 'written', label: 'Escrito' },
  { value: 'oral', label: 'Oral' },
  { value: 'practical', label: 'Practico' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'review', label: 'Revision' },
  { value: 'recovery', label: 'Recuperatorio' },
] as const;

// ── Types ──────────────────────────────────────────────────

export interface ExamFormProps {
  /** Existing exam for edit mode, or null for create mode */
  exam: CalendarEvent | null;
  /** All events (for lookup if needed) */
  events?: CalendarEvent[];
  /** Called when the form is closed (after save, delete, or cancel) */
  onClose: () => void;
  /** Available courses for the select (id + name) */
  courses?: Array<{ id: string; name: string }>;
}

// ── Component ──────────────────────────────────────────────

export function ExamForm({ exam, onClose, courses = [] }: ExamFormProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isEditMode = exam !== null;

  const defaultValues = useMemo<ExamFormValues>(
    () => ({
      title: exam?.title ?? '',
      date: exam?.date ?? '',
      time: exam?.time ?? '',
      location: exam?.location ?? '',
      course_id: exam?.course_id ?? '',
      is_final: exam?.is_final ?? true,
      exam_type: exam?.exam_type ?? 'written',
    }),
    [exam],
  );

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues,
  });

  // Reset form when exam changes (edit → create or vice versa)
  useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  // ── Submit ───────────────────────────────────────────────

  const onSubmit = useCallback(
    async (values: ExamFormValues) => {
      if (form.formState.isSubmitting) return;
      setIsSubmitting(true);
      try {
        if (isEditMode && exam) {
          await apiCall(`/exam-events/${exam.id}`, {
            method: 'PATCH',
            body: JSON.stringify(values),
          });
        } else {
          await apiCall('/exam-events', {
            method: 'POST',
            body: JSON.stringify(values),
          });
        }
        // Refresh calendar data
        await queryClient.invalidateQueries({ queryKey: ['calendar-data'] });
        onClose();
      } catch (err) {
        console.error('[ExamForm] Submit error:', err);
        form.setError('root', {
          message: err instanceof Error ? err.message : 'Error al guardar el examen. Intenta de nuevo.',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditMode, exam, queryClient, onClose, form],
  );

  // ── Delete ───────────────────────────────────────────────

  const handleDelete = useCallback(async () => {
    if (!exam) return;
    setIsDeleting(true);
    try {
      await apiCall(`/exam-events/${exam.id}`, {
        method: 'DELETE',
      });
      await queryClient.invalidateQueries({ queryKey: ['calendar-data'] });
      setShowDeleteDialog(false);
      onClose();
    } catch (err) {
      console.error('[ExamForm] Delete error:', err);
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Error al eliminar el examen. Intenta de nuevo.',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [exam, queryClient, onClose, form]);

  // ── Render ───────────────────────────────────────────────

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-4">
          <h2
            className="font-semibold"
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1rem, 2.5vw, 1.25rem)' }}
          >
            {isEditMode ? 'Editar examen' : 'Nuevo examen'}
          </h2>

          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titulo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Parcial de Algebra"
                    className="min-h-[44px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha</FormLabel>
                <FormControl>
                  <Input type="date" className="min-h-[44px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Time */}
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora (opcional)</FormLabel>
                <FormControl>
                  <Input type="time" className="min-h-[44px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Location */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ubicacion (opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Aula 305"
                    className="min-h-[44px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Course */}
          <FormField
            control={form.control}
            name="course_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Curso</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Selecciona un curso" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Exam type */}
          <FormField
            control={form.control}
            name="exam_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de examen</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXAM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Is final */}
          <FormField
            control={form.control}
            name="is_final"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0 min-h-[44px]">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-5"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer">Es examen final</FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Root error message */}
          {form.formState.errors.root && (
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400">
              {form.formState.errors.root.message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1 rounded-full min-h-[44px]"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEditMode ? 'Guardar cambios' : 'Crear examen'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full min-h-[44px]"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>

          {/* Delete button (edit mode only) */}
          {isEditMode && (
            <Button
              type="button"
              variant="destructive"
              className="w-full rounded-full min-h-[44px]"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="size-4" />
              Eliminar examen
            </Button>
          )}
        </form>
      </Form>

      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar examen</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente
              el examen &ldquo;{exam?.title}&rdquo; del calendario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
