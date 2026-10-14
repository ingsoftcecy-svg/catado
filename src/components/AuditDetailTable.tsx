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
  onSelectTasterIncident?: (tasterName: string | null) => void;
}

/**
 * Valida si un remark tiene contenido textual significativo.
 * Complejidad Ciclomática: 3 (< 7)
 */
function hasSignificantRemark(remark: string | undefined): boolean {
  if (!remark) return false;
  const trimmedRemark = remark.trim();
  return trimmedRemark !== '' && trimmedRemark !== '-' && trimmedRemark !== '0';
}

/**
 * Filtra los registros que se mostrarán en la tabla combinando catador, estado de validación y remarks.
 * Complejidad Ciclomática: 4 (< 7)
 */
function filterTableRecords(
  sourceRecords: AuditRecord[],
  selectedTaster: string | null,
  activeFilter: 'ALL' | ValidationStatus,
  validationMap?: Map<string, RecordValidationInfo>,
  onlyWithRemarks?: boolean
): AuditRecord[] {
  return sourceRecords.filter((record) => {
    if (selectedTaster && record.Taster !== selectedTaster) {
      return false;
    }

    if (activeFilter !== 'ALL' && validationMap) {
      const recordIdentifier = record.ID || record.DocId;
      const validationInfo = recordIdentifier ? validationMap.get(recordIdentifier) : undefined;
      if (validationInfo?.status !== activeFilter) {
        return false;
      }
    }

    if (onlyWithRemarks && !hasSignificantRemark(record.Remark)) {
      return false;
    }

    return true;
  });
}

/**
 * Calcula los totales por cada tipo de validación para las pastillas informativas.
 * Complejidad Ciclomática: 4 (< 7)
 */
function computeValidationStatusCounts(
  records: AuditRecord[],
  validationMap?: Map<string, RecordValidationInfo>
): { validated: number; single: number; incomplete: number } {
  if (!validationMap) return { validated: 0, single: 0, incomplete: 0 };

  let validatedCount = 0;
  let singleCount = 0;
  let incompleteCount = 0;

  for (const record of records) {
    const recordIdentifier = record.ID || record.DocId;
    const validationInfo = recordIdentifier ? validationMap.get(recordIdentifier) : undefined;

    if (validationInfo?.status === 'VALIDATED') {
      validatedCount++;
    } else if (validationInfo?.status === 'SINGLE') {
      singleCount++;
    } else if (validationInfo?.status === 'INCOMPLETE') {
      incompleteCount++;
    }
  }

  return { validated: validatedCount, single: singleCount, incomplete: incompleteCount };
}

/**
 * Tabla detallada con paginación optimizada (12 registros por página).
 */
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
    return filterTableRecords(
      records,
      selectedTasterIncident,
      activeValidationFilter,
      validationMap,
      onlyWithRemarks
    );
  }, [records, selectedTasterIncident, activeValidationFilter, validationMap, onlyWithRemarks]);

  // Resetear a página 1 automáticamente cuando cambian los registros o filtros aplicados
  useEffect(() => {
    setCurrentPage(1);
  }, [records, selectedTasterIncident, activeValidationFilter, onlyWithRemarks]);

  const totalPages = Math.max(1, Math.ceil(recordsToDisplay.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const currentRecords = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return recordsToDisplay.slice(startIndex, startIndex + pageSize);
  }, [recordsToDisplay, safePage, pageSize]);

  // Contador de registros con observación
  const countWithRemarks = useMemo(() => {
    return records.filter((record) => hasSignificantRemark(record.Remark)).length;
  }, [records]);

  // Conteo de registros por estado de validación
  const countsByStatus = useMemo(() => {
    return computeValidationStatusCounts(records, validationMap);
  }, [records, validationMap]);

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-5 shadow-sm dark:shadow-xl transition-colors space-y-4">
      
      {/* Cabecera y Controles */}
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

        {/* Paginación */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Página <strong className="text-slate-900 dark:text-white">{safePage}</strong> de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((previousPage) => Math.max(1, previousPage - 1))}
              disabled={safePage === 1}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((previousPage) => Math.min(totalPages, previousPage + 1))}
              disabled={safePage === totalPages}
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pastillas de Filtro Rápido */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px] mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Filtro:
        </span>

        {/* Todas */}
        <button
          onClick={() => {
            if (onSelectValidationFilter) onSelectValidationFilter('ALL');
            setOnlyWithRemarks(false);
            if (onSelectTasterIncident) onSelectTasterIncident(null);
          }}
          className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
            activeValidationFilter === 'ALL' && !onlyWithRemarks && !selectedTasterIncident
              ? 'bg-slate-800 text-white dark:bg-slate-700'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#070A12] dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Todas ({records.length.toLocaleString()})
        </button>

        {/* Está Bien (2-3) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => onSelectValidationFilter(activeValidationFilter === 'VALIDATED' ? 'ALL' : 'VALIDATED')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeValidationFilter === 'VALIDATED'
                ? 'bg-emerald-500 text-white font-bold shadow-sm'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Está Bien (2-3) ({countsByStatus.validated.toLocaleString()})</span>
          </button>
        )}

        {/* Catado Mal (1) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => onSelectValidationFilter(activeValidationFilter === 'SINGLE' ? 'ALL' : 'SINGLE')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeValidationFilter === 'SINGLE'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Catado Mal (1) ({countsByStatus.single.toLocaleString()})</span>
          </button>
        )}

        {/* Faltan Columnas (0) */}
        {onSelectValidationFilter && (
          <button
            onClick={() => onSelectValidationFilter(activeValidationFilter === 'INCOMPLETE' ? 'ALL' : 'INCOMPLETE')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeValidationFilter === 'INCOMPLETE'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Faltan Col. (0) ({countsByStatus.incomplete.toLocaleString()})</span>
          </button>
        )}

        {/* Con Remark */}
        <button
          onClick={() => setOnlyWithRemarks((previousValue) => !previousValue)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
            onlyWithRemarks
              ? 'bg-sky-500 text-white font-bold shadow-sm'
              : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Con Remark ({countWithRemarks.toLocaleString()})</span>
        </button>

        {/* Indicador de Filtro por Catador Activo */}
        {selectedTasterIncident && onSelectTasterIncident && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-amber-400/20 text-amber-800 dark:text-amber-300 border border-amber-400/40">
            <span>Catador: <strong>{selectedTasterIncident}</strong></span>
            <button
              onClick={() => onSelectTasterIncident(null)}
              className="hover:opacity-75 p-0.5"
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
            {currentRecords.map((record, index) => {
              const recordIdentifier = record.ID || record.DocId;
              const validationInfo = recordIdentifier && validationMap ? validationMap.get(recordIdentifier) : undefined;
              const hasValidTank = Boolean(record.Tank && record.Tank.trim() !== '' && record.Tank !== '0' && record.Tank !== '-');
              const hasRemark = Boolean(record.Remark && record.Remark.trim() !== '' && record.Remark.trim() !== '-' && record.Remark !== '0');

              return (
                <tr key={`${record.ID || index}_${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {record.ID}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                    {record.Taster}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                    {record.Sample}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                    {hasValidTank ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold border border-slate-200 dark:border-slate-700">
                        {record.Tank}
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold text-[11px]">Sin Tanque (0)</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {record.Shift}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      record.Area === 'CFR'
                        ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/50'
                        : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                    }`}>
                      {record.Area}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Sem {record.SEMANA} • M{record.MES}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {record.OKNOK === 'OK' ? (
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
                    {hasRemark ? (
                      record.OKNOK === 'NOK' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span>{record.Remark}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {record.Remark}
                        </span>
                      )
                    ) : (
                      <span className="text-rose-500 font-bold text-[11px]">Sin Remark (0)</span>
                    )}
                  </td>
                  
                  {/* Columna de Validación del Panel Sensorial */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {validationInfo ? (
                      validationInfo.status === 'VALIDATED' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                          title={validationInfo.reason}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>Está Bien ({validationInfo.count})</span>
                        </span>
                      ) : validationInfo.status === 'SINGLE' ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50"
                          title={validationInfo.reason}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                          <span>Catado Mal (1)</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50"
                          title={validationInfo.reason}
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
