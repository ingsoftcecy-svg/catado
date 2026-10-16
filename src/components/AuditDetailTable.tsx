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
  Filter,
  RotateCcw
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

interface ColumnFiltersState {
  id: string;
  taster: string;
  sample: string;
  tank: string;
  shift: string;
  area: string;
  weekMonth: string;
  result: string;
  remark: string;
  validation: string;
}

const INITIAL_COLUMN_FILTERS: ColumnFiltersState = {
  id: '',
  taster: 'ALL',
  sample: 'ALL',
  tank: '',
  shift: 'ALL',
  area: 'ALL',
  weekMonth: 'ALL',
  result: 'ALL',
  remark: '',
  validation: 'ALL',
};

/**
 * Normaliza texto para comparación insensible a mayúsculas y acentos.
 * Complejidad Ciclomática: 2 (< 7)
 */
function normalizeColumnText(value: string | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Valida si un tanque tiene un valor significativo registrado.
 * Complejidad Ciclomática: 3 (< 7)
 */
function hasValidTankValue(tank: string | undefined): boolean {
  if (!tank) return false;
  const trimmedTank = tank.trim();
  return trimmedTank !== '' && trimmedTank !== '0' && trimmedTank !== '-';
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
 * Obtiene la etiqueta formateada de Semana y Mes para un registro.
 * Complejidad Ciclomática: 1 (< 7)
 */
function getWeekMonthLabel(record: AuditRecord): string {
  return `Sem ${record.SEMANA} • M${record.MES}`;
}

/**
 * Evalúa coincidencia parcial de texto en una columna.
 * Complejidad Ciclomática: 2 (< 7)
 */
function matchesTextColumn(cellText: string, filterQuery: string): boolean {
  if (!filterQuery.trim()) return true;
  return normalizeColumnText(cellText).includes(normalizeColumnText(filterQuery));
}

/**
 * Evalúa coincidencia exacta de selector en una columna.
 * Complejidad Ciclomática: 2 (< 7)
 */
function matchesSelectColumn(cellValue: string, selectedOption: string): boolean {
  return selectedOption === 'ALL' || cellValue === selectedOption;
}

/**
 * Evalúa las primeras 5 columnas de la tabla (ID, Catador, Muestra, Tanque, Turno).
 * Complejidad Ciclomática: 5 (< 7)
 */
function matchesPrimaryColumns(record: AuditRecord, colFilters: ColumnFiltersState): boolean {
  const tankText = hasValidTankValue(record.Tank) ? String(record.Tank).trim() : 'Sin Tanque (0)';
  return (
    matchesTextColumn(record.ID || '', colFilters.id) &&
    matchesSelectColumn(record.Taster || '', colFilters.taster) &&
    matchesSelectColumn(record.Sample || '', colFilters.sample) &&
    matchesTextColumn(tankText, colFilters.tank) &&
    matchesSelectColumn(record.Shift || '', colFilters.shift)
  );
}

/**
 * Evalúa las últimas 5 columnas de la tabla (Área, Sem/Mes, Resultado, Remark, Validación).
 * Complejidad Ciclomática: 5 (< 7)
 */
function matchesSecondaryColumns(
  record: AuditRecord,
  colFilters: ColumnFiltersState,
  validationStatus?: ValidationStatus
): boolean {
  const remarkText = hasSignificantRemark(record.Remark) ? String(record.Remark).trim() : 'Sin Remark (0)';
  return (
    matchesSelectColumn(record.Area || '', colFilters.area) &&
    matchesSelectColumn(getWeekMonthLabel(record), colFilters.weekMonth) &&
    matchesSelectColumn(record.OKNOK || '', colFilters.result) &&
    matchesTextColumn(remarkText, colFilters.remark) &&
    matchesSelectColumn(validationStatus || '', colFilters.validation)
  );
}

/**
 * Verifica si algún filtro de columna se encuentra activo.
 * Complejidad Ciclomática: 3 (< 7)
 */
function hasAnyActiveColumnFilter(colFilters: ColumnFiltersState): boolean {
  const hasTextFilter = Boolean(colFilters.id.trim() || colFilters.tank.trim() || colFilters.remark.trim());
  const hasSelectFilter = [
    colFilters.taster,
    colFilters.sample,
    colFilters.shift,
    colFilters.area,
    colFilters.weekMonth,
    colFilters.result,
    colFilters.validation,
  ].some((val) => val !== 'ALL');
  return hasTextFilter || hasSelectFilter;
}

/**
 * Filtra los registros que se mostrarán en la tabla combinando catador, estado de validación, remarks y filtros por columna.
 * Complejidad Ciclomática: 5 (< 7)
 */
function filterTableRecords(
  sourceRecords: AuditRecord[],
  selectedTaster: string | null,
  activeFilter: 'ALL' | ValidationStatus,
  colFilters: ColumnFiltersState,
  validationMap?: Map<string, RecordValidationInfo>,
  onlyWithRemarks?: boolean
): AuditRecord[] {
  return sourceRecords.filter((record) => {
    if (selectedTaster && record.Taster !== selectedTaster) return false;

    const recordIdentifier = record.ID || record.DocId;
    const validationInfo = recordIdentifier && validationMap ? validationMap.get(recordIdentifier) : undefined;

    if (activeFilter !== 'ALL' && validationMap && validationInfo?.status !== activeFilter) {
      return false;
    }

    if (onlyWithRemarks && !hasSignificantRemark(record.Remark)) return false;

    return (
      matchesPrimaryColumns(record, colFilters) &&
      matchesSecondaryColumns(record, colFilters, validationInfo?.status)
    );
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
 * Tabla detallada con paginación optimizada (12 registros por página) y filtros individuales por columna.
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
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(INITIAL_COLUMN_FILTERS);
  const pageSize = 12;

  const updateColumnFilter = <K extends keyof ColumnFiltersState>(key: K, value: ColumnFiltersState[K]) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetColumnFilters = () => {
    setColumnFilters(INITIAL_COLUMN_FILTERS);
  };

  // Opciones únicas para los selectores de cada columna
  const columnOptions = useMemo(() => {
    const tasters = new Set<string>();
    const samples = new Set<string>();
    const shifts = new Set<string>();
    const areas = new Set<string>();
    const weekMonths = new Set<string>();

    records.forEach((record) => {
      if (record.Taster) tasters.add(record.Taster);
      if (record.Sample) samples.add(record.Sample);
      if (record.Shift) shifts.add(record.Shift);
      if (record.Area) areas.add(record.Area);
      weekMonths.add(getWeekMonthLabel(record));
    });

    return {
      tasters: Array.from(tasters).sort(),
      samples: Array.from(samples).sort(),
      shifts: Array.from(shifts).sort(),
      areas: Array.from(areas).sort(),
      weekMonths: Array.from(weekMonths),
    };
  }, [records]);

  // Filtrado reactivo de la tabla combinando validación, catador, remark y filtros de columna
  const recordsToDisplay = useMemo(() => {
    return filterTableRecords(
      records,
      selectedTasterIncident,
      activeValidationFilter,
      columnFilters,
      validationMap,
      onlyWithRemarks
    );
  }, [records, selectedTasterIncident, activeValidationFilter, columnFilters, validationMap, onlyWithRemarks]);

  // Resetear a página 1 automáticamente cuando cambian los registros o filtros aplicados
  useEffect(() => {
    setCurrentPage(1);
  }, [records, selectedTasterIncident, activeValidationFilter, onlyWithRemarks, columnFilters]);

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

  const isAnyColumnFiltered = useMemo(() => hasAnyActiveColumnFilter(columnFilters), [columnFilters]);

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
            resetColumnFilters();
          }}
          className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
            activeValidationFilter === 'ALL' && !onlyWithRemarks && !selectedTasterIncident && !isAnyColumnFiltered
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

        {/* Botón para limpiar filtros de columnas cuando hay alguno activo */}
        {isAnyColumnFiltered && (
          <button
            type="button"
            onClick={resetColumnFilters}
            className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 transition-colors"
            title="Limpiar todos los filtros de las columnas"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Limpiar filtros de columna</span>
          </button>
        )}
      </div>

      {/* Tabla con scroll horizontal responsivo */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 dark:bg-[#070A12] text-slate-700 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-2.5 px-3 align-top min-w-[140px]">
                <div className="mb-1.5">ID Muestra</div>
                <input
                  type="text"
                  value={columnFilters.id}
                  onChange={(e) => updateColumnFilter('id', e.target.value)}
                  placeholder="Filtrar ID..."
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </th>
              <th className="py-2.5 px-3 align-top min-w-[170px]">
                <div className="mb-1.5">Catador</div>
                <select
                  value={columnFilters.taster}
                  onChange={(e) => updateColumnFilter('taster', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todos</option>
                  {columnOptions.tasters.map((taster) => (
                    <option key={taster} value={taster}>
                      {taster}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-2.5 px-3 align-top min-w-[160px]">
                <div className="mb-1.5">Muestra / Etapa</div>
                <select
                  value={columnFilters.sample}
                  onChange={(e) => updateColumnFilter('sample', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todas</option>
                  {columnOptions.samples.map((sample) => (
                    <option key={sample} value={sample}>
                      {sample}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-2.5 px-3 align-top min-w-[140px]">
                <div className="mb-1.5">Tanque</div>
                <input
                  type="text"
                  value={columnFilters.tank}
                  onChange={(e) => updateColumnFilter('tank', e.target.value)}
                  placeholder="Filtrar tanque..."
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </th>
              <th className="py-2.5 px-3 align-top min-w-[125px]">
                <div className="mb-1.5">Turno</div>
                <select
                  value={columnFilters.shift}
                  onChange={(e) => updateColumnFilter('shift', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todos</option>
                  {columnOptions.shifts.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-2.5 px-3 align-top min-w-[85px]">
                <div className="mb-1.5">Área</div>
                <select
                  value={columnFilters.area}
                  onChange={(e) => updateColumnFilter('area', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todas</option>
                  {columnOptions.areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-2.5 px-3 align-top min-w-[115px]">
                <div className="mb-1.5">Sem / Mes</div>
                <select
                  value={columnFilters.weekMonth}
                  onChange={(e) => updateColumnFilter('weekMonth', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todos</option>
                  {columnOptions.weekMonths.map((wm) => (
                    <option key={wm} value={wm}>
                      {wm}
                    </option>
                  ))}
                </select>
              </th>
              <th className="py-2.5 px-3 align-top text-center min-w-[100px]">
                <div className="mb-1.5">Resultado</div>
                <select
                  value={columnFilters.result}
                  onChange={(e) => updateColumnFilter('result', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todos</option>
                  <option value="OK">OK</option>
                  <option value="NOK">NOK</option>
                </select>
              </th>
              <th className="py-2.5 px-3 align-top min-w-[150px]">
                <div className="mb-1.5">Remark / Observación</div>
                <input
                  type="text"
                  value={columnFilters.remark}
                  onChange={(e) => updateColumnFilter('remark', e.target.value)}
                  placeholder="Filtrar remark..."
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </th>
              <th className="py-2.5 px-3 align-top text-center min-w-[140px]">
                <div className="mb-1.5">Validación Panel</div>
                <select
                  value={columnFilters.validation}
                  onChange={(e) => updateColumnFilter('validation', e.target.value)}
                  className="w-full bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-normal normal-case text-slate-800 dark:text-slate-100 focus:outline-none focus:border-amber-400"
                >
                  <option value="ALL">Todas</option>
                  <option value="VALIDATED">Está Bien (2-3)</option>
                  <option value="SINGLE">Catado Mal (1)</option>
                  <option value="INCOMPLETE">Faltan Col. (0)</option>
                </select>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
            {currentRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-8 text-center text-slate-500 dark:text-slate-400">
                  No se encontraron muestras con los filtros seleccionados.
                </td>
              </tr>
            ) : currentRecords.map((record, index) => {
              const recordIdentifier = record.ID || record.DocId;
              const validationInfo = recordIdentifier && validationMap ? validationMap.get(recordIdentifier) : undefined;
              const hasValidTank = hasValidTankValue(record.Tank);
              const hasRemark = hasSignificantRemark(record.Remark);

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
