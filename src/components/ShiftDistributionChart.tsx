import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  TooltipProps,
} from 'recharts';
import { Clock } from 'lucide-react';
import { AuditRecord } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface ShiftDistributionChartProps {
  records: AuditRecord[];
}

interface ShiftDistributionItem {
  shift: string;
  count: number;
  percentage: string;
}

const ORDERED_SHIFTS = ['Middle Shift', 'Morning Shift', 'Evening Shift'];

/**
 * Computes frequency counts and percentage share for each operational shift.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
function calculateShiftDistribution(records: AuditRecord[]): ShiftDistributionItem[] {
  const countsByShift: Record<string, number> = {};

  records.forEach((record) => {
    const shiftName = record.Shift || 'Sin Turno';
    countsByShift[shiftName] = (countsByShift[shiftName] || 0) + 1;
  });

  const totalRecords = records.length;

  return ORDERED_SHIFTS.map((shiftName) => {
    const shiftCount = countsByShift[shiftName] || 0;
    const percentageString =
      totalRecords > 0 ? ((shiftCount / totalRecords) * 100).toFixed(1) : '0';

    return {
      shift: shiftName,
      count: shiftCount,
      percentage: percentageString,
    };
  });
}

/**
 * Returns brand accent color corresponding to the shift name.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
function getShiftColorTheme(shiftName: string): string {
  if (shiftName.includes('Middle')) {
    return '#0284C7'; // Sky/Blue
  }
  if (shiftName.includes('Morning')) {
    return '#F5A800'; // Corona Gold
  }
  return '#6366F1'; // Indigo/Purple
}

/**
 * Bar chart component visualizing tasting workload distribution across factory shifts.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
export const ShiftDistributionChart: React.FC<ShiftDistributionChartProps> = ({
  records,
}) => {
  const isDarkMode = useDarkMode();
  const shiftDistributionData = calculateShiftDistribution(records);

  const renderCustomTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length > 0) {
      const shiftItem = payload[0].payload as ShiftDistributionItem;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-sky-500/40 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            {shiftItem.shift}
          </p>
          <p className="text-sky-600 dark:text-sky-400 font-semibold flex justify-between gap-4">
            <span>Catas Realizadas:</span>
            <span className="font-mono font-bold">
              {shiftItem.count.toLocaleString()}
            </span>
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>Participación:</span>
            <span className="font-mono font-bold">{shiftItem.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col h-full transition-colors">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" />
            Catados por Turno
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Carga de evaluación distribuida en turnos de trabajo
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={shiftDistributionData}
            margin={{ top: 15, right: 20, left: 0, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#1E293B' : '#E2E8F0'}
              vertical={false}
            />
            <XAxis
              dataKey="shift"
              stroke={isDarkMode ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDarkMode ? '#94A3B8' : '#475569' }}
            />
            <YAxis
              stroke={isDarkMode ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDarkMode ? '#94A3B8' : '#475569' }}
              tickFormatter={(tastingCount: number) =>
                tastingCount >= 1000
                  ? `${(tastingCount / 1000).toFixed(1)}k`
                  : String(tastingCount)
              }
            />
            <Tooltip content={renderCustomTooltip} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {shiftDistributionData.map((entry, index) => (
                <Cell
                  key={`cell-shift-${index}`}
                  fill={getShiftColorTheme(entry.shift)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
