import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MessageSquare,
  X,
  Filter
} from 'lucide-react';
import { AuditRecord, ValidationStatus, RecordValidationInfo } from '../types/audit';

interface AuditDetailTableProps {
  records: AuditRecord[];
  validationMap?: Map<string, RecordValidationInfo>;
  activeValidationFilter?: 'ALL' | ValidationStatus;
  onSelectValidationFilter?: (filter: 'ALL' | ValidationStatus) => void;
  selectedTasterIncident?: string | null;
  onSelectTasterIncident?: (taster: string | null) => void;
}

export const AuditDetailTable: React.FC<AuditDetailTableProps> = ({
  records,
  validationMap,
  activeValidationFilter = 'ALL',
  onSelectValidationFilter,
  selectedTasterIncident = null,
  onSelectTasterIncident,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [onlyWithRemarks, setOnlyWithRemarks] = useState(false);
  const pageSize = 12;

  // Filtrado reactivo de la tabla combinando validación, catador y remark
  const recordsToDisplay = useMemo(() => {
    let result = records;

    if (selectedTasterIncident) {
      result = result.filter((r) => r.Taster === selectedTasterIncident);
    }

    if (activeValidationFilter !== 'ALL' && validationMap) {
      result = result.filter((r) => {
        const idKey = r.ID || r.DocId;
        const info = idKey ? validationMap.get(idKey) : undefined;
        return info?.status === activeValidationFilter;
      });
    }

    if (onlyWithRemarks) {
      result = result.filter((r) => r.Remark && r.Remark.trim() !== '' && r.Remark.trim() !== '-');
    }

    return result;
  }, [records, selectedTasterIncident, activeValidationFilter, validationMap, onlyWithRemarks]);

  // Resetear a página 1 automáticamente cuando cambian los registros o filtros aplicados
  useEffect(() => {
    setCurrentPage(1);
  }, [records, selectedTasterIncident, activeValidationFilter, onlyWithRemarks]);

  const totalPages = Math.max(1, Math.ceil(recordsToDisplay.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const currentRecords = useMemo(() => {
    return recordsToDisplay.slice(
      (safePage - 1) * pageSize,
      safePage * pageSize
    );
  }, [recordsToDisplay, safePage, pageSize]);

  // Contadores para pastillas
  const countWithRemarks = useMemo(() => {
    return records.filter((r) => r.Remark && r.Remark.trim() !== '' && r.Remark.trim() !== '-').length;
  }, [records]);

  const countsByStatus = useMemo(() => {
    if (!validationMap) return { validated: 0, single: 0, incomplete: 0 };
    let validated = 0;
    let single = 0;
    let incomplete = 0;
    for (const r of records) {
      const idKey = r.ID || r.DocId;
      const info = idKey ? validationMap.get(idKey) : undefined;
      if (info?.status === 'VALIDATED') validated++;
      else if (info?.status === 'SINGLE') single++;
      else if (info?.status === 'INCOMPLETE') incomplete++;
    }
    return { validated, single, incomplete };
  }, [records, validationMap]);

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-5 shadow-sm dark:shadow-xl transition-colors space-y-4">
      
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-amber-500" />
            Registro Detallado de Auditorías
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mostrando {recordsToDisplay.length.toLocaleString()} muestras
            {selectedTasterIncident ? ` de ${selectedTasterIncident}` : ''}
            {activeValidationFilter !== 'ALL' ? ` (${activeValidationFilter})` : ''}
          </p>
        </div>

        {/* Acciones y Paginación */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Paginación */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Página <strong className="text-slate-900 dark:text-white">{safePage}</strong> de {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Página siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Pastillas de Filtro Rápido de Validación */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px] mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filtro:
        </span>

        {/* Todos */}
        <button
          onClick={() => {
            if (onSelectValidationFilter) onSelectValidationFilter('ALL');
            if (onSelectTasterIncident) onSelectTasterIncident(null);
            setOnlyWithRemarks(false);
            setCurrentPage(1);
          }}
          className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
            activeValidationFilter === 'ALL' && !selectedTasterIncident && !onlyWithRemarks
              ? 'bg-slate-900 text-white dark:bg-slate-700 shadow-sm'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Todos ({records.length.toLocaleString()})
        </button>

        {/* ⚠️ Catado Mal (1) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => {
              onSelectValidationFilter(activeValidationFilter === 'SINGLE' ? 'ALL' : 'SINGLE');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all border ${
              activeValidationFilter === 'SINGLE'
                ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
            }`}
            title="Ver muestras que salieron en 1 (Está mal el catado)"
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Catado Mal 1 ({countsByStatus.single.toLocaleString()})</span>
          </button>
        )}

        {/* ❌ Faltan Columnas (0) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => {
              onSelectValidationFilter(activeValidationFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all border ${
              activeValidationFilter === 'INCOMPLETE'
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100'
            }`}
            title="Ver muestras que salieron en 0 (No completaron Tanque o Remark)"
          >
            <XCircle className="w-3 h-3" />
            <span>Faltan Col. 0 ({countsByStatus.incomplete.toLocaleString()})</span>
          </button>
        )}

        {/* ✅ Está Bien (2 y 3) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => {
              onSelectValidationFilter(activeValidationFilter === 'VALIDATED' ? 'ALL' : 'VALIDATED');
              setCurrentPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all border ${
              activeValidationFilter === 'VALIDATED'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
            }`}
            title="Ver muestras que salieron en 2 o 3 (Está bien)"
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Está Bien 2-3 ({countsByStatus.validated.toLocaleString()})</span>
          </button>
        )}

        {/* 💬 Solo con Remark */}
        <button
          onClick={() => {
            setOnlyWithRemarks(!onlyWithRemarks);
            setCurrentPage(1);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all border ${
            onlyWithRemarks
              ? 'bg-sky-500 text-white border-sky-500 font-bold shadow-sm'
              : 'bg-slate-100 dark:bg-[#070A12] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-sky-400'
          }`}
          title="Ver solo muestras con texto en Remark"
        >
          <MessageSquare className="w-3 h-3 text-sky-500" />
          <span>Con Remark ({countWithRemarks.toLocaleString()})</span>
        </button>

        {/* Pastilla de Catador Seleccionado */}
        {selectedTasterIncident && onSelectTasterIncident && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-sm">
            <span>Catador: {selectedTasterIncident}</span>
            <button
              onClick={() => onSelectTasterIncident(null)}
              className="p-0.5 hover:bg-amber-600 rounded"
              title="Quitar filtro de catador"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Tabla con scroll horizontal responsivo */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-[#070A12] text-slate-700 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-3">ID Muestra</th>
              <th className="py-3 px-3">Catador</th>
              <th className="py-3 px-3">Muestra / Etapa</th>
              <th className="py-3 px-3">Tanque</th>
              <th className="py-3 px-3">Turno</th>
              <th className="py-3 px-3">Área</th>
              <th className="py-3 px-3">Sem / Mes</th>
              <th className="py-3 px-3 text-center">Resultado</th>
              <th className="py-3 px-3">Remark / Observación</th>
              <th className="py-3 px-3 text-center">Validación Panel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {currentRecords.map((item, idx) => {
              const idKey = item.ID || item.DocId;
              const val = idKey && validationMap ? validationMap.get(idKey) : undefined;

              return (
                <tr key={(item.ID || idx) + String(idx)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {item.ID}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {item.Taster}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                    {item.Sample}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {item.Tank && item.Tank.trim() !== '' && item.Tank !== '0' && item.Tank !== '-' ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700">
                        {item.Tank}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold text-[11px]">Sin Tanque (0)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {item.Shift}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.Area === 'CFR'
                        ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50'
                        : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                    }`}>
                      {item.Area}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Sem {item.SEMANA} • M{item.MES}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {item.OKNOK === 'OK' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                        <AlertTriangle className="w-3 h-3" />
                        NOK
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {item.Remark && item.Remark.trim() !== '' && item.Remark.trim() !== '-' && item.Remark !== '0' ? (
                      item.OKNOK === 'NOK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span>{item.Remark}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.Remark}
                        </span>
                      )
                    ) : (
                      <span className="text-rose-500 font-bold text-[11px]">Sin Remark (0)</span>
                    )}
                  </td>
                  
                  {/* Nueva Columna de Validación */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {val ? (
                      val.status === 'VALIDATED' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                          title={val.reason}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Está Bien ({val.count})</span>
                        </span>
                      ) : val.status === 'SINGLE' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                          title={val.reason}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Catado Mal (1)</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                          title={val.reason}
                        >
                          <XCircle className="w-3 h-3 text-rose-500" />
                          <span>Faltan Col. (0)</span>
                        </span>
                      )
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">-</span>
                    )}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
