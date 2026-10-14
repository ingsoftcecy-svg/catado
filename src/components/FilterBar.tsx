import React from 'react';
import { Filter, Calendar, Layers, Clock, RotateCcw, Search, CheckCircle2, X } from 'lucide-react';
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

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  availableYears,
  availableMonths,
  availableWeeks,
  availableAreas,
  availableShifts,
}) => {
  const handleReset = () => {
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
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-4 lg:p-5 shadow-sm dark:shadow-xl space-y-4 transition-colors">
      
      {/* Fila Principal de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end">
        
        {/* Filtro: AÑO */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            Año
          </label>
          <div className="flex bg-slate-100 dark:bg-[#070A12] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onFilterChange({ ...filters, year: 'ALL' })}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filters.year === 'ALL'
                  ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Todos
            </button>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => onFilterChange({ ...filters, year: yr })}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  filters.year === yr
                    ? 'bg-amber-400 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro: MES */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-sky-500" />
            Mes
          </label>
          <select
            value={filters.month}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                month: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
              })
            }
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todos los Meses</option>
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {MONTH_NAMES[m - 1] || `Mes ${m}`} ({m})
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: SEMANA */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-amber-500" />
            Semana
          </label>
          <select
            value={filters.week}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                week: e.target.value === 'ALL' ? 'ALL' : Number(e.target.value),
              })
            }
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todas las Semanas</option>
            {availableWeeks.map((wk) => (
              <option key={wk} value={wk}>
                Semana {wk}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro: ÁREA (CFR / COC) */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            Área
          </label>
          <div className="flex bg-slate-100 dark:bg-[#070A12] p-1 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onFilterChange({ ...filters, area: 'ALL' })}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filters.area === 'ALL'
                  ? 'bg-[#002D72] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Todas
            </button>
            {availableAreas.map((area) => {
              const isNd = area.trim() === '#N/D' || area.includes('#N/D');
              const isSelected = filters.area === area;
              return (
                <button
                  key={area}
                  onClick={() => onFilterChange({ ...filters, area })}
                  className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition-all ${
                    isSelected
                      ? isNd
                        ? 'bg-rose-600 text-white shadow-sm font-bold'
                        : 'bg-[#002D72] text-white shadow-sm'
                      : isNd
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 hover:bg-rose-100 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                  }`}
                >
                  {area}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro: TURNO */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Turno
          </label>
          <select
            value={filters.shift}
            onChange={(e) => onFilterChange({ ...filters, shift: e.target.value })}
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-amber-400 transition-colors"
          >
            <option value="ALL">Todos los Turnos</option>
            {availableShifts.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

      </div>

      {/* Fila Secundaria: Búsqueda rápida por catador + Toggle OK/NOK + Reset */}
      <div className="pt-2 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
        
        {/* Buscador de catador, muestra, tanque, etc. */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.tasterSearch}
            onChange={(e) => onFilterChange({ ...filters, tasterSearch: e.target.value })}
            placeholder="Buscar por catador, muestra, tanque, remark, ID..."
            className="w-full bg-slate-50 dark:bg-[#070A12] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
          />
          {filters.tasterSearch.trim() !== '' && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, tasterSearch: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Pastillas de Estado OK / NOK */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase mr-1">Resultado:</span>
          
          <button
            onClick={() => onFilterChange({ ...filters, status: 'ALL' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filters.status === 'ALL'
                ? 'bg-slate-800 text-white dark:bg-slate-700'
                : 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:hover:text-white'
            }`}
          >
            Todos
          </button>

          <button
            onClick={() => onFilterChange({ ...filters, status: 'OK' })}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filters.status === 'OK'
                ? 'bg-emerald-500 text-white font-bold shadow-sm'
                : 'text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Solo OK
          </button>

          <button
            onClick={() => onFilterChange({ ...filters, status: 'NOK' })}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              filters.status === 'NOK'
                ? 'bg-rose-500 text-white font-bold shadow-sm'
                : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-800'
            }`}
          >
            Solo NOK
          </button>

          {/* Reset Filters */}
          <button
            onClick={handleReset}
            className="ml-auto md:ml-3 flex items-center gap-1.5 px-3 py-1 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors font-semibold"
            title="Restablecer filtros por defecto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>

      </div>

    </div>
  );
};
