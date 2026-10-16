import React from 'react';
import { Filter, Calendar, Layers, Clock, RotateCcw, Search, CheckCircle2, X, Lock } from 'lucide-react';
import { FilterState } from '../types/audit';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  availableYears: number[];
  availableMonths: number[];
  availableWeeks: number[];
  availableAreas: string[];
  availableShifts: string[];
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Obtiene las clases de estilo para cada botón de área (bloqueando CFR).
 * Complejidad Ciclomática: 4 (< 7)
 */
function getAreaButtonClasses(isBlocked: boolean, isSelected: boolean, isMissingData: boolean): string {
  if (isBlocked) {
    return 'text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed select-none bg-transparent';
  }
  if (isSelected) {
    return isMissingData
      ? 'bg-rose-600 text-white shadow-sm font-bold'
      : 'bg-[#002D72] text-white shadow-sm';
  }
  if (isMissingData) {
    return 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 font-bold';
  }
  return 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white';
}

/**
 * Barra de Filtros interactiva para Año, Mes, Semana, Área, Turno y Búsqueda global.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableYears,
  availableMonths,
  availableWeeks,
  availableAreas,
  availableShifts,
}) => {
  /**
   * Restablece todos los filtros a sus valores predeterminados
   */
  const handleResetFilters = () => {
    onFilterChange({
      year: 'ALL',
      month: 'ALL',
      week: 'ALL',
      area: 'ALL',
      shift: 'ALL',
      status: 'ALL',
      tasterSearch: '',
    });
  };

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-xl p-2.5 lg:p-3 shadow-sm dark:shadow-xl space-y-2 transition-colors">
      
      {/* Fila Principal de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-end">
        
        {/* Filtro: AÑO */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-amber-500" />
            Año
          </label>
          <div className="flex bg-slate-100 dark:bg-[#070A12] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onFilterChange({ ...filters, year: 'ALL' })}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filters.year === 'ALL'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            {availableYears.map((yearOption) => (
              <button
                key={yearOption}
                onClick={() => onFilterChange({ ...filters, year: yearOption })}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                  filters.year === yearOption
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {yearOption}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro: MES */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-500" />
            Mes
          </label>
          <select
            value={filters.month}
            onChange={(changeEvent) =>
              onFilterChange({
                ...filters,
                month: changeEvent.target.value === 'ALL' ? 'ALL' : Number(changeEvent.target.value),
              })
            }
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todos los Meses</option>
            {availableMonths.map((monthNumber) => (
              <option key={monthNumber} value={monthNumber}>
                {MONTH_NAMES[monthNumber - 1] || `Mes ${monthNumber}`} ({monthNumber})
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: SEMANA */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-500" />
            Semana
          </label>
          <select
            value={filters.week}
            onChange={(changeEvent) =>
              onFilterChange({
                ...filters,
                week: changeEvent.target.value === 'ALL' ? 'ALL' : Number(changeEvent.target.value),
              })
            }
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todas las Semanas</option>
            {availableWeeks.map((weekNumber) => (
              <option key={weekNumber} value={weekNumber}>
                Semana {weekNumber}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: ÁREA (CFR Bloqueado / Solo COC) */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-sky-500" />
            Área
          </label>
          <div className="flex bg-slate-100 dark:bg-[#070A12] p-0.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, area: 'ALL' })}
              className={`flex-1 py-1 text-[11px] font-semibold rounded-md transition-all ${
                filters.area === 'ALL'
                  ? 'bg-[#002D72] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
            {availableAreas.map((areaName) => {
              const isCfrBlocked = areaName.trim().toUpperCase() === 'CFR';
              const isMissingData = areaName.trim() === '#N/D' || areaName.includes('#N/D');
              const isSelected = filters.area === areaName && !isCfrBlocked;
              const buttonClasses = getAreaButtonClasses(isCfrBlocked, isSelected, isMissingData);

              return (
                <button
                  key={areaName}
                  type="button"
                  disabled={isCfrBlocked}
                  onClick={() => {
                    if (isCfrBlocked) return;
                    onFilterChange({ ...filters, area: areaName });
                  }}
                  title={isCfrBlocked ? 'Área CFR bloqueada temporalmente' : `Filtrar por ${areaName}`}
                  className={`flex-1 py-1 px-1.5 text-[11px] font-semibold rounded-md transition-all flex items-center justify-center gap-1 ${buttonClasses}`}
                >
                  {isCfrBlocked && <Lock className="w-2.5 h-2.5" />}
                  <span>{areaName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro: TURNO */}
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            Turno
          </label>
          <select
            value={filters.shift}
            onChange={(changeEvent) => onFilterChange({ ...filters, shift: changeEvent.target.value })}
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todos los Turnos</option>
            {availableShifts.map((shiftName) => (
              <option key={shiftName} value={shiftName}>
                {shiftName}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Fila Secundaria: Búsqueda rápida por catador + Toggle OK/NOK + Reset */}
      <div className="pt-1.5 flex flex-col md:flex-row items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* Buscador de catador, muestra, tanque, etc. */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.tasterSearch}
            onChange={(changeEvent) => onFilterChange({ ...filters, tasterSearch: changeEvent.target.value })}
            placeholder="Buscar por catador, muestra, tanque, remark, ID..."
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-7 py-1 text-[11px] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {filters.tasterSearch.trim() !== '' && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, tasterSearch: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Pastillas de Estado OK / NOK */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase mr-0.5">Resultado:</span>
          
          <button
            onClick={() => onFilterChange({ ...filters, status: 'ALL' })}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
              filters.status === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => onFilterChange({ ...filters, status: 'OK' })}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
              filters.status === 'OK'
                ? 'bg-emerald-500 text-white font-bold shadow-sm'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Solo OK
          </button>

          <button
            onClick={() => onFilterChange({ ...filters, status: 'NOK' })}
            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-all ${
              filters.status === 'NOK'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-800'
            }`}
          >
            Solo NOK
          </button>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            className="ml-auto md:ml-2 flex items-center gap-1 px-2.5 py-0.5 text-[11px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md transition-colors font-semibold"
            title="Restablecer filtros por defecto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restablecer</span>
          </button>
        </div>

      </div>

    </div>
  );
};
