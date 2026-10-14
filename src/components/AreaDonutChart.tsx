import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { AuditRecord } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface AreaDonutChartProps {
  records: AuditRecord[];
}

interface AreaDistributionItem {
  name: string;
  value: number;
  percentage: string;
}

const AREA_COLOR_PALETTE: Record<string, string> = {
  CFR: '#002D72', // Corona Deep Navy / Blue
  COC: '#F5A800', // Corona Yellow Gold
  'Sin Área': '#64748B',
};

/**
 * Aggregates audit records into proportional distribution groups by Area.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
function calculateAreaDistribution(records: AuditRecord[]): AreaDistributionItem[] {
  const countsByArea: Record<string, number> = {};

  records.forEach((record) => {
    const areaName = record.Area || 'Sin Área';
    countsByArea[areaName] = (countsByArea[areaName] || 0) + 1;
  });

  const totalRecords = records.length;

  return Object.entries(countsByArea).map(([areaName, count]) => ({
    name: areaName,
    value: count,
    percentage: totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(1) : '0',
  }));
}

/**
 * Donut chart displaying proportion and tasting volume between CFR and COC production areas.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
export const AreaDonutChart: React.FC<AreaDonutChartProps> = ({ records }) => {
  const isDarkMode = useDarkMode();
  const areaDistributionData = calculateAreaDistribution(records);
  const totalAuditsCount = records.length;

  const renderCustomTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length > 0) {
      const distributionItem = payload[0].payload as AreaDistributionItem;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1">
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            Área: {distributionItem.name}
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>Catas:</span>
            <span className="font-mono font-bold">
              {distributionItem.value.toLocaleString()}
            </span>
          </p>
          <p className="text-sky-600 dark:text-sky-400 font-semibold flex justify-between gap-4">
            <span>Participación:</span>
            <span className="font-mono font-bold">{distributionItem.percentage}%</span>
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
              data={areaDistributionData}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
            >
              {areaDistributionData.map((distributionEntry, index) => (
                <Cell
                  key={`cell-area-${index}`}
                  fill={AREA_COLOR_PALETTE[distributionEntry.name] || '#0284C7'}
                  stroke={isDarkMode ? '#0D1424' : '#FFFFFF'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={renderCustomTooltip} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(legendValue: string) => {
                const foundItem = areaDistributionData.find(
                  (item) => item.name === legendValue
                );
                const percentageString = foundItem ? foundItem.percentage : '0';
                return (
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {legendValue} ({percentageString}%)
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Total centrado dentro de la dona */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-2xl font-black text-slate-900 dark:text-white">
            {totalAuditsCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
            Total
          </span>
        </div>
      </div>
    </div>
  );
};
