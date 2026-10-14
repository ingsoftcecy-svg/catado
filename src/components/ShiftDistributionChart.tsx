import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell
} from 'recharts';
import { Clock } from 'lucide-react';
import { AuditRecord } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface ShiftDistributionChartProps {
  records: AuditRecord[];
}

export const ShiftDistributionChart: React.FC<ShiftDistributionChartProps> = ({ records }) => {
  const isDark = useDarkMode();
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.Shift] = (counts[r.Shift] || 0) + 1;
  });

  const total = records.length;
  const shiftOrder = ['Middle Shift', 'Morning Shift', 'Evening Shift'];

  const data = shiftOrder.map((shift) => {
    const count = counts[shift] || 0;
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
    return {
      shift,
      count,
      percentage,
    };
  });

  const getShiftColor = (shift: string) => {
    if (shift.includes('Middle')) return '#0284C7'; // Sky/Blue
    if (shift.includes('Morning')) return '#F5A800'; // Corona Gold
    return '#6366F1'; // Indigo/Purple
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-sky-500/40 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white text-sm">{item.shift}</p>
          <p className="text-sky-600 dark:text-sky-400 font-semibold flex justify-between gap-4">
            <span>Catas Realizadas:</span>
            <span className="font-mono font-bold">{item.count.toLocaleString()}</span>
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>Participación:</span>
            <span className="font-mono font-bold">{item.percentage}%</span>
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
          <BarChart data={data} margin={{ top: 15, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} />
            <XAxis
              dataKey="shift"
              stroke={isDark ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
            />
            <YAxis
              stroke={isDark ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getShiftColor(entry.shift)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
