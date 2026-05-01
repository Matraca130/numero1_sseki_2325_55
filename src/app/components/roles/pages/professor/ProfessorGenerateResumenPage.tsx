// ============================================================
// Axon — Professor: Generar resumen (M3)
//
// Form that lets a profesor upload a PDF and trigger an Atlas
// generation run via `POST /atlas/generate` (see SPEC §2 M3).
//
// Fields:
//   - mode (`contenido` | `estudio`) — radio
//   - subject — dropdown bound to `public.courses` filtered by
//     `selectedInstitution.id` and `is_active=true` (SPEC §0.1 #2,
//     §5 R9 frontend invariant).
//   - topic — free-text label stored in `atlas.runs.topic`.
//   - file — PDF (≤ 25MB, validated client-side via Zod).
//   - generate_images — checkbox (passed through to the worker).
//
// On success: navigate to `/professor/mis-generaciones/${run_id}`,
// the deep-link target M4 wires up. In this PR M4's page is a
// placeholder, but the URL structure is stable.
//
// Form pattern follows `src/app/components/calendar/ExamForm.tsx`:
// react-hook-form + zod + shadcn/ui.
// ============================================================

import React, { useCallback, useMemo } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/app/context/AuthContext';
import { useCourses } from '@/app/hooks/useCourses';
import { useGenerateRun } from '@/app/hooks/useGenerateRun';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Checkbox } from '@/app/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/app/components/ui/radio-group';
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

// ── Constants ──────────────────────────────────────────────

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB

// ── Schema ─────────────────────────────────────────────────

const generateRunSchema = z.object({
  mode: z.enum(['contenido', 'estudio']),
  subject: z.string().min(1, 'Selecciona un curso'),
  topic: z
    .string()
    .min(1, 'El tema es obligatorio')
    .max(200, 'Maximo 200 caracteres'),
  generate_images: z.boolean(),
  file: z
    .instanceof(File, { message: 'Adjunta un PDF' })
    .refine((f) => f.size > 0, 'El archivo esta vacio')
    .refine((f) => f.size <= MAX_PDF_BYTES, 'El PDF debe pesar 25MB o menos')
    .refine(
      // Browsers reliably set `File.type` for PDFs from native pickers; do
      // not fall back to extension sniffing (a non-PDF renamed `*.pdf`
      // would otherwise pass validation).
      (f) => f.type === 'application/pdf',
      'Solo se aceptan archivos PDF',
    ),
});

type GenerateRunFormValues = z.infer<typeof generateRunSchema>;

// ── Component ──────────────────────────────────────────────

export function ProfessorGenerateResumenPage() {
  const { selectedInstitution, role } = useAuth();
  const navigate = useNavigate();
  const generateRun = useGenerateRun();
  const coursesQuery = useCourses();

  const defaultValues = useMemo<Partial<GenerateRunFormValues>>(
    () => ({
      mode: 'contenido',
      subject: '',
      topic: '',
      generate_images: false,
    }),
    [],
  );

  const form = useForm<GenerateRunFormValues>({
    // Cast: zod v4 + RHF resolver typing edge case (see RHF#11910).
    // Scope the cast via `unknown` instead of `any` so we keep type
    // checking on the rest of the form while bypassing the broken
    // generic-inference between `@hookform/resolvers/zod` and zod v4.
    resolver: zodResolver(generateRunSchema) as unknown as Resolver<GenerateRunFormValues>,
    defaultValues,
  });

  const onSubmit = useCallback(
    async (values: GenerateRunFormValues) => {
      if (!selectedInstitution?.id) {
        form.setError('root', {
          message: 'No se pudo identificar la institucion activa.',
        });
        return;
      }
      try {
        const result = await generateRun.mutateAsync({
          mode: values.mode,
          topic: values.topic,
          subject: values.subject,
          generate_images: values.generate_images,
          file: values.file,
          institutionId: selectedInstitution.id,
        });
        toast.success('Generacion iniciada', {
          description: 'Te redirigimos al estado de la corrida.',
        });
        navigate(`/professor/mis-generaciones/${result.run_id}`);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'No se pudo iniciar la generacion. Intenta de nuevo.';
        toast.error('Error al generar', { description: message });
        form.setError('root', { message });
      }
    },
    [generateRun, navigate, selectedInstitution?.id, form],
  );

  // Defense-in-depth role check; route is already wrapped by RequireRole.
  if (role && role !== 'professor') {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Solo los profesores pueden generar resumenes.
      </div>
    );
  }

  const courses = coursesQuery.data ?? [];
  const isSubmitting = generateRun.isPending || form.formState.isSubmitting;

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
          <Sparkles size={20} />
        </div>
        <div>
          <h1
            className="font-semibold"
            style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)' }}
          >
            Generar resumen
          </h1>
          <p className="text-sm text-muted-foreground">
            Sube un PDF y Atlas generara un resumen para tu curso.
          </p>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Mode */}
          <FormField
            control={form.control}
            name="mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modo</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-col gap-2 sm:flex-row sm:gap-6"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="contenido" /> Contenido
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value="estudio" /> Estudio
                    </label>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Subject */}
          <FormField
            control={form.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Curso</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue
                        placeholder={
                          coursesQuery.isLoading
                            ? 'Cargando cursos...'
                            : courses.length === 0
                            ? 'No hay cursos activos'
                            : 'Selecciona un curso'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {courses.map((c) => (
                      // Submit course NAME (not id) — the Atlas worker resolves
                      // course_name → topic_id (see SPEC R3).
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {coursesQuery.isError && (
                  <p className="text-xs text-destructive">
                    No se pudieron cargar los cursos: {coursesQuery.error.message}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Topic */}
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tema</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: Capitulo 3 — Cinetica quimica"
                    className="min-h-[44px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* File */}
          <FormField
            control={form.control}
            name="file"
            render={({ field: { onChange, value: _value, ...rest } }) => (
              <FormItem>
                <FormLabel>PDF (max. 25MB)</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="application/pdf"
                    className="min-h-[44px]"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      onChange(f);
                    }}
                    {...rest}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Generate images */}
          <Controller
            control={form.control}
            name="generate_images"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-3 space-y-0 min-h-[44px]">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    className="size-5"
                  />
                </FormControl>
                <FormLabel className="cursor-pointer">
                  Generar imagenes (mas lento)
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Root error */}
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
              disabled={isSubmitting || !selectedInstitution?.id}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Generar resumen
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
