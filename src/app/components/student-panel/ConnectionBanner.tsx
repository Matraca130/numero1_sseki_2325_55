// ============================================================
// Axon — Connection Status Banner
// Shows connection/seeding status for StudentDataPanel.
// Extracted from StudentDataPanel.tsx for modularization.
// ============================================================
import React from 'react';
import { Database, AlertCircle, Loader2, RefreshCw, Zap } from 'lucide-react';

interface ConnectionBannerProps {
  loading: boolean;
  error: string | null;
  seeding: boolean;
  onSeed: () => void;
  onRefresh: () => void;
}

export function ConnectionBanner({ loading, error, seeding, onSeed, onRefresh }: ConnectionBannerProps) {
  return (
    <div className={`border-b px-8 py-4 ${error ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${error ? 'bg-red-500' : 'bg-amber-500'}`}>
          {loading ? (
            <Loader2 size={20} className="animate-spin text-white" />
          ) : error ? (
            <AlertCircle size={20} className="text-white" />
          ) : (
            <Database size={20} className="text-white" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900">
            {loading ? 'Conectando a Supabase...' : error ? 'Error de Conexion' : 'Base de Datos Vacia'}
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {loading
              ? 'Verificando datos del estudiante...'
              : error
              ? error
              : 'Hace clic en "Cargar Datos Demo" para popular la base'}
          </p>
        </div>
        <div className="flex gap-2">
          {!loading && (
            <button
              onClick={onSeed}
              disabled={seeding}
              className="px-4 py-2 bg-axon-accent hover:bg-axon-hover text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {seeding ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Cargar Datos Demo
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}