import React, { useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';
import { AuditRecord, ValidationStatus } from '../types/audit';
import {
  computeValidationMap,
  computeTasterIncidents,
  getRecordDateKey,
} from '../utils/validationRules';

interface ValidationAuditPanelProps {
  records: AuditRecord[];
  selectedDate: string; // 'ALL' o 'YYYY-MM-DD'
  onSelectDate: (date: string) => void;
  activeValidationFilter: 'ALL' | ValidationStatus;
  onSelectValidationFilter: (filter: 'ALL' | ValidationStatus) => void;
  selectedTasterIncident: string | null;
  onSelectTasterIncident: (taster: string | null) => void;
}

export const ValidationAuditPanel: React.FC<ValidationAuditPanelProps> = ({
  records,
  selectedDate,
  onSelectDate,
  activeValidationFilter,
  onSelectValidationFilter,
  selectedTasterIncident,
  onSelectTasterIncident,
}) => {
  // Lista de fechas únicas disponibles
  const availableDates = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const d = getRecordDateKey(r);
      if (d !== 'SIN_FECHA') set.add(d);
    });
    return Array.from(set).sort().reverse();
  }, [records]);

  // Registros del día seleccionado ("este día") o periodo actual
  const recordsInDateScope = useMemo(() => {
    if (selectedDate === 'ALL') return records;
    return records.filter((r) => getRecordDateKey(r) === selectedDate);
  }, [records, selectedDate]);

  // Mapa de validación calculado
  const validationMap = useMemo(() => {
    return computeValidationMap(recordsInDateScope);
  }, [recordsInDateScope]);

  // Contadores
  const stats = useMemo(() => {
    let validated = 0;
    let single = 0;
    let incomplete = 0;

    for (const r of recordsInDateScope) {
      const idKey = r.ID || r.DocId;
      const info = idKey ? validationMap.get(idKey) : undefined;
      if (!info) continue;

      if (info.status === 'VALIDATED') validated++;
      else if (info.status === 'SINGLE') single++;
      else if (info.status === 'INCOMPLETE') incomplete++;
    }

    const total = recordsInDateScope.length;
    return {
      total,
      validated,
      single,
      incomplete,
      totalUnvalidated: single + incomplete,
      validatedPercent: total > 0 ? ((validated / total) * 100).toFixed(1) : '0',
      singlePercent: total > 0 ? ((single / total) * 100).toFixed(1) : '0',
      incompletePercent: total > 0 ? ((incomplete / total) * 100).toFixed(1) : '0',
    };
  }, [recordsInDateScope, validationMap]);

  // Catadores con incidencias
  const tasterIncidents = useMemo(() => {
    return computeTasterIncidents(recordsInDateScope, validationMap);
  }, [recordsInDateScope, validationMap]);

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-4 lg:p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
      
      {/* Cabecera Limpia */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Validación de Catados
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {selectedDate === 'ALL' ? (
              <span>Periodo actual: <strong>{stats.totalUnvalidated.toLocaleString()}</strong> catados sin validar (en 1 o en 0).</span>
            ) : (
              <span>En este día ({selectedDate}) tienes <strong>{stats.totalUnvalidated}</strong> catados sin validar (en 1 o en 0).</span>
            )}
          </p>
        </div>

        {/* Selector de Día */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            Día:
          </label>
          <select
            value={selectedDate}
            onChange={(e) => {
              onSelectDate(e.target.value);
              onSelectTasterIncident(null);
            }}
            className="bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todo el periodo</option>
            {availableDates.map((dateStr) => (
              <option key={dateStr} value={dateStr}>
                {dateStr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Tarjetas de Estado Tipo Semáforo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* 🟢 Está Bien (2 y 3) */}
        <button
          onClick={() => onSelectValidationFilter(activeValidationFilter === 'VALIDATED' ? 'ALL' : 'VALIDATED')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeValidationFilter === 'VALIDATED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-[#070A12] dark:hover:bg-[#111A2E] border-slate-200 dark:border-slate-800'
          }`}
          title="Ver catados que salieron en 2 y 3 (Está bien)"
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Está Bien (2 y 3)
            </span>
            <span>{stats.validatedPercent}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.validated.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Catados validados correctamente
          </div>
        </button>

        {/* 🟡 Está Mal el Catado (1) */}
        <button
          onClick={() => onSelectValidationFilter(activeValidationFilter === 'SINGLE' ? 'ALL' : 'SINGLE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeValidationFilter === 'SINGLE'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-[#070A12] dark:hover:bg-[#111A2E] border-slate-200 dark:border-slate-800'
          }`}
          title="Ver muestras que salieron en 1 (Está mal el catado)"
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-400">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Está Mal el Catado (1)
            </span>
            <span>{stats.singlePercent}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.single.toLocaleString()}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
            Salió en 1: catado no validado
          </div>
        </button>

        {/* 🔴 Faltan Columnas (0) */}
        <button
          onClick={() => onSelectValidationFilter(activeValidationFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeValidationFilter === 'INCOMPLETE'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-500/20'
              : 'bg-slate-50/70 hover:bg-slate-100 dark:bg-[#070A12] dark:hover:bg-[#111A2E] border-slate-200 dark:border-slate-800'
          }`}
          title="Ver muestras que salieron en 0 (Faltan columnas de Tanque o Remark)"
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              Faltan Columnas (0)
            </span>
            <span>{stats.incompletePercent}%</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {stats.incomplete.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-700 dark:text-rose-400 mt-0.5">
            Salió en 0: no completaron Tanque o Remark
          </div>
        </button>

      </div>

      {/* Lista de Personas con Catados en 1 o en 0 */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-500" />
            Personas con Catados en 1 o en 0:
          </span>

          {selectedTasterIncident && (
            <button
              onClick={() => onSelectTasterIncident(null)}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Viendo solo a: <strong>{selectedTasterIncident}</strong></span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {tasterIncidents.length === 0 ? (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Todos los catados de este periodo están bien (salieron en 2 o 3).</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tasterIncidents.map((inc) => {
              const isSelected = selectedTasterIncident === inc.taster;
              return (
                <button
                  key={inc.taster}
                  onClick={() => onSelectTasterIncident(isSelected ? null : inc.taster)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm font-bold ring-2 ring-amber-400/30'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#070A12] dark:hover:bg-[#111A2E] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  }`}
                  title={`Clic para ver las ${inc.totalIncidents} muestras de ${inc.taster}`}
                >
                  <span className="truncate max-w-[180px]">{inc.taster}</span>
                  <div className="flex items-center gap-1 text-[11px]">
                    {inc.singleCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold">
                        {inc.singleCount} mal (1)
                      </span>
                    )}
                    {inc.incompleteCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold">
                        {inc.incompleteCount} vacíos (0)
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
};
