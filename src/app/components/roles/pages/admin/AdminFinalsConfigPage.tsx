// ============================================================
// Axon — AdminFinalsConfigPage (FinalsConfigPanel)
//
// Admin CRUD for finals periods: list, create, edit, delete.
// Uses /admin/finals-periods endpoints.
//
// Backend contract:
//   GET    /admin/finals-periods?institution_id=X
//   POST   /admin/finals-periods  { institution_id, finals_period_start, finals_period_end, course_id? }
//   PATCH  /admin/finals-periods/:id  { finals_period_start?, finals_period_end?, course_id? }
//   DELETE /admin/finals-periods/:id
// ============================================================

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Calendar,
  Loader2, AlertCircle, GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { headingStyle, components } from '@/app/design-system';
import { toast } from 'sonner';
import { apiCall } from '@/app/lib/api';
import { usePlatformData } from '@/app/context/PlatformDataContext';

// ── Types ─────────────────────────────────────────────────────

interface FinalsPeriod {
  id: string;
  institution_id: string;
  course_id: string | null;
  finals_period_start: string;
  finals_period_end: string;
  created_by: string | null;
  created_at: string;
}

interface FinalsPeriodForm {
  course_id: string;
  finals_period_start: string;
  finals_period_end: string;
}

// ── API ───────────────────────────────────────────────────────

const FINALS_KEY = ['admin-finals-periods'] as const;

async function fetchFinalsPeriods(institutionId: string): Promise<FinalsPeriod[]> {
  return await apiCall<FinalsPeriod[]>(
    `/admin/finals-periods?institution_id=${institutionId}`,
  );
}

async function createFinalsPeriod(
  data: FinalsPeriodForm & { institution_id: string },
): Promise<FinalsPeriod> {
  return await apiCall<FinalsPeriod>('/admin/finals-periods', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateFinalsPeriod(
  id: string,
  data: Partial<FinalsPeriodForm>,
): Promise<FinalsPeriod> {
  return await apiCall<FinalsPeriod>(`/admin/finals-periods/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function deleteFinalsPeriod(id: string): Promise<void> {
  await apiCall(`/admin/finals-periods/${id}`, { method: 'DELETE' });
}

// ── Component ─────────────────────────────────────────────────

const EMPTY_FORM: FinalsPeriodForm = {
  course_id: '',
  finals_period_start: '',
  finals_period_end: '',
};

export function AdminFinalsConfigPage() {
  const queryClient = useQueryClient();
  const { courses, institutionId } = usePlatformData();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FinalsPeriodForm>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: periods = [], isLoading, error } = useQuery({
    queryKey: [...FINALS_KEY, institutionId],
    queryFn: () => fetchFinalsPeriods(institutionId!),
    enabled: !!institutionId,
    staleTime: 2 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: FinalsPeriodForm) =>
      createFinalsPeriod({ ...data, institution_id: institutionId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINALS_KEY });
      setShowForm(false);
      setFormData(EMPTY_FORM);
    },
    onError: () => toast.error('Error al crear el periodo de finales.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FinalsPeriodForm> }) =>
      updateFinalsPeriod(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FINALS_KEY }),
    onError: () => toast.error('Error al actualizar el periodo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFinalsPeriod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FINALS_KEY });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Error al eliminar el periodo de finales.'),
  });

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.finals_period_start || !formData.finals_period_end) return;
    if (formData.finals_period_end <= formData.finals_period_start) {
      toast.error('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }
    createMutation.mutate(formData);
  }, [formData, createMutation]);

  const courseName = (courseId: string | null) => {
    if (!courseId) return 'Todos los cursos';
    return courses?.find((c: { id: string; name: string }) => c.id === courseId)?.name ?? courseId;
  };

  if (!institutionId) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertCircle size={18} />
          <span className="text-[14px]">Selecciona una institucion para ver los periodos de finales.</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={18} />
          <span className="text-[14px]">Error al cargar los periodos de finales.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-semibold text-[#1a2332]" style={headingStyle}>
            Periodos de Finales
          </h1>
          <p className="text-[13px] text-[#9ba3b2] mt-1">
            Configura los periodos de examenes finales para tu institucion.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B3B36] text-white text-[12px] font-semibold hover:bg-[#244e47] transition-colors"
        >
          <Plus size={14} />
          Agregar periodo
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="overflow-hidden mb-6"
          >
            <div className={`${components.card.base} ${components.card.padding} space-y-4`}>
              <h3 className="text-[14px] font-semibold text-[#1a2332]" style={headingStyle}>
                Nuevo periodo
              </h3>

              <div>
                <label className="text-[12px] font-medium text-[#4a5565] block mb-1">Curso (opcional)</label>
                <select
                  value={formData.course_id}
                  onChange={e => setFormData(f => ({ ...f, course_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-[#1a2332] focus:outline-none focus:ring-2 focus:ring-teal-400"
                >
                  <option value="">Todos los cursos</option>
                  {courses?.map((c: { id: string; name: string }) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] font-medium text-[#4a5565] block mb-1">Fecha inicio</label>
                  <input
                    type="date"
                    required
                    value={formData.finals_period_start}
                    onChange={e => setFormData(f => ({ ...f, finals_period_start: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-[#1a2332] focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="text-[12px] font-medium text-[#4a5565] block mb-1">Fecha fin</label>
                  <input
                    type="date"
                    required
                    value={formData.finals_period_end}
                    onChange={e => setFormData(f => ({ ...f, finals_period_end: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-[13px] text-[#1a2332] focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2a8c7a] text-white text-[12px] font-semibold hover:bg-[#244e47] transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Crear periodo
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setFormData(EMPTY_FORM); }}
                  className="text-[12px] font-medium text-[#9ba3b2] hover:text-[#4a5565] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Periods list */}
      {periods.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-[#9ba3b2]">
          <Calendar size={40} className="mb-3 text-[#dfe2e8]" />
          <p className="text-[13px] font-medium text-[#4a5565]">No hay periodos configurados</p>
          <p className="text-[12px] mt-1">Agrega un periodo de finales para activar la preparacion de examenes.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((period, i) => (
            <motion.div
              key={period.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className={`${components.card.base} px-4 py-3 flex items-center gap-4`}
            >
              <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                <GraduationCap size={16} className="text-teal-500" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#1a2332] truncate">
                  {courseName(period.course_id)}
                </div>
                <div className="text-[11px] text-[#9ba3b2]">
                  {format(parseISO(period.finals_period_start), "d MMM yyyy", { locale: es })}
                  {' — '}
                  {format(parseISO(period.finals_period_end), "d MMM yyyy", { locale: es })}
                </div>
              </div>

              {/* Delete */}
              {deleteConfirm === period.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => deleteMutation.mutate(period.id)}
                    disabled={deleteMutation.isPending}
                    className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded-md hover:bg-red-50"
                  >
                    {deleteMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Eliminar'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="text-[11px] text-[#9ba3b2] hover:text-[#4a5565] px-2 py-1"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(period.id)}
                  className="p-1.5 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-red-50 text-[#d1d5dc] hover:text-red-500 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminFinalsConfigPage;
