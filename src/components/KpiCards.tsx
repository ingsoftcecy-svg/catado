import React from 'react';
import { Activity, Award, CheckCircle, Clock, Wine } from 'lucide-react';
import { AuditRecord } from '../types/audit';

interface KpiCardsProps {
  filteredRecords: AuditRecord[];
  allRecords: AuditRecord[];
  onFilterStatus?: (status: 'ALL' | 'OK' | 'NOK') => void;
}

/**
 * Calculates frequency count of records grouped by an extraction key.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
function calculateFrequencyMap(
  records: AuditRecord[],
  extractCategory: (record: AuditRecord) => string
): Record<string, number> {
  const counts: Record<string, number> = {};

  records.forEach((record) => {
    const category = extractCategory(record) || 'N/A';
    counts[category] = (counts[category] || 0) + 1;
  });

  return counts;
}

/**
 * Finds the top category and count based on highest frequency.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
function findDominantCategory(
  records: AuditRecord[],
  extractCategory: (record: AuditRecord) => string
): [string, number] {
  const frequencyMap = calculateFrequencyMap(records, extractCategory);
  const sortedEntries = Object.entries(frequencyMap).sort(
    ([, countA], [, countB]) => countB - countA
  );

  return sortedEntries[0] || ['N/A', 0];
}

/**
 * KPI summary banner displaying key high-level sensory metrics:
 * Total samples, conformity percentage, top taster, dominant sample, and peak shift.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
export const KpiCards: React.FC<KpiCardsProps> = ({
  filteredRecords,
  allRecords,
  onFilterStatus,
}) => {
  const totalSamples = filteredRecords.length;
  const approvedOkCount = filteredRecords.filter(
    (record) => record.OKNOK === 'OK'
  ).length;
  const deviationsNokCount = totalSamples - approvedOkCount;
  const conformityPercentage =
    totalSamples > 0 ? ((approvedOkCount / totalSamples) * 100).toFixed(1) : '100';

  const [dominantTasterName, dominantTasterCount] = findDominantCategory(
    filteredRecords,
    (record) => record.Taster
  );

  const [dominantSampleName, dominantSampleCount] = findDominantCategory(
    filteredRecords,
    (record) => record.Sample
  );

  const [dominantShiftName, dominantShiftCount] = findDominantCategory(
    filteredRecords,
    (record) => record.Shift
  );

  const totalProportionPercentage =
    allRecords.length > 0
      ? `${((totalSamples / allRecords.length) * 100).toFixed(0)}% del total`
      : '';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 lg:gap-3">
      {/* KPI Principal: TOTAL DE MUESTRAS CATADAS */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#002D72] via-[#001D4A] to-[#070A12] border border-amber-400/80 p-3 lg:p-3.5 shadow-md shadow-amber-500/10 group">
        <div className="absolute top-0 right-0 w-20 h-20 bg-amber-400/10 rounded-full blur-xl group-hover:bg-amber-400/20 transition-all"></div>
        <div className="flex items-center justify-between text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">
          <span>Total Muestras</span>
          <span className="p-0.5 rounded-md bg-amber-400/20 text-amber-400">
            <Activity className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-none">
          {totalSamples.toLocaleString()}
        </div>
        <div className="mt-1.5 text-[10px] text-amber-200/80 flex items-center justify-between font-medium">
          <span>Recuento de ID</span>
          <span>{totalProportionPercentage}</span>
        </div>
      </div>

      {/* KPI 2: Conformidad Sensorial (% OK) */}
      <div className="rounded-xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] p-3 lg:p-3.5 shadow-sm relative overflow-hidden transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1">
          <span>Conformidad Sensorial</span>
          <span className="p-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <CheckCircle className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none flex items-baseline gap-1.5">
          {conformityPercentage}%
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">OK</span>
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <button
            onClick={() => onFilterStatus && onFilterStatus('OK')}
            className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline cursor-pointer transition-colors"
            title="Ver solo aprobadas (OK)"
          >
            {approvedOkCount.toLocaleString()} Aprobadas
          </button>
          <button
            onClick={() => onFilterStatus && onFilterStatus('NOK')}
            className="text-rose-700 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800/40 hover:underline cursor-pointer transition-all"
            title="¡Haz clic aquí para ver estas desviaciones!"
          >
            {deviationsNokCount} Desviaciones
          </button>
        </div>
      </div>

      {/* KPI 3: Catador Líder */}
      <div className="rounded-xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] p-3 lg:p-3.5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider mb-1">
          <span>Catador Más Activo</span>
          <span className="p-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/40">
            <Award className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={dominantTasterName}>
          {dominantTasterName}
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Volumen analizado</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            {dominantTasterCount.toLocaleString()} catas
          </span>
        </div>
      </div>

      {/* KPI 4: Muestra más evaluada */}
      <div className="rounded-xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] p-3 lg:p-3.5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider mb-1">
          <span>Muestra Principal</span>
          <span className="p-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
            <Wine className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={dominantSampleName}>
          {dominantSampleName}
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Frecuencia</span>
          <span className="text-sky-600 dark:text-sky-400 font-bold">
            {dominantSampleCount.toLocaleString()} muestras
          </span>
        </div>
      </div>

      {/* KPI 5: Turno dominante */}
      <div className="rounded-xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] p-3 lg:p-3.5 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider mb-1">
          <span>Turno con Mayor Carga</span>
          <span className="p-0.5 rounded-md bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/40">
            <Clock className="w-3.5 h-3.5" />
          </span>
        </div>
        <div className="text-sm font-black text-slate-900 dark:text-white truncate">
          {dominantShiftName}
        </div>
        <div className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
          <span>Muestras evaluadas</span>
          <span className="text-purple-600 dark:text-purple-300 font-bold">
            {dominantShiftCount.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
