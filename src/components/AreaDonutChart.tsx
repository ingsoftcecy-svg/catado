import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { AuditRecord } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface AreaDonutChartProps {
  records: AuditRecord[];
}

export const AreaDonutChart: React.FC<AreaDonutChartProps> = ({ records }) => {
  const isDark = useDarkMode();
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    const area = r.Area || 'Sin Área';
    counts[area] = (counts[area] || 0) + 1;
  });

  const total = records.length;
  const COLORS: Record<string, string> = {
    CFR: '#002D72', // Corona Deep Navy / Blue
    COC: '#F5A800', // Corona Yellow Gold
    'Sin Área': '#64748B'
  };

  const data = Object.entries(counts).map(([name, value]) => ({
    name,
    value,
    percentage: total > 0 ? ((value / total) * 100).toFixed(1) : '0',
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white text-sm">Área: {item.name}</p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>Catas:</span>
            <span className="font-mono font-bold">{item.value.toLocaleString()}</span>
          </p>
          <p className="text-sky-600 dark:text-sky-400 font-semibold flex justify-between gap-4">
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
      <div className="flex items-center justify-between mb-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-amber-500" />
            % de Uso por Área
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Distribución proporcional entre CFR y COC
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-[260px] w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-area-${index}`}
                  fill={COLORS[entry.name] || '#0284C7'}
                  stroke={isDark ? '#0D1424' : '#FFFFFF'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {value} ({entry.payload.percentage}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total centrado dentro de la dona */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-2xl font-black text-slate-900 dark:text-white">{total.toLocaleString()}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">Total</span>
        </div>
      </div>
    </div>
  );
};
