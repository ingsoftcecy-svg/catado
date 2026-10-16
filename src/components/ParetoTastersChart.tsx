import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
  TooltipProps,
} from 'recharts';
import { Users, TrendingUp } from 'lucide-react';
import { AuditRecord, ParetoItem } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';
import { computeParetoDistribution } from '../utils/pareto';

interface ParetoTastersChartProps {
  records: AuditRecord[];
}

/**
 * Formats full taster names into a concise first-name initial-surname display format.
 *
 * Cyclomatic Complexity: 2 (< 7)
 */
function formatTasterDisplayName(fullName: string): string {
  const nameParts = fullName.trim().split(' ');
  if (nameParts.length >= 2) {
    return `${nameParts[0]} ${nameParts[1][0]}.`;
  }
  return fullName.slice(0, 10);
}

/**
 * Pareto 80/20 chart showing panelist contribution volume and workload concentration.
 *
 * Cyclomatic Complexity: 3 (< 7)
 */
export const ParetoTastersChart: React.FC<ParetoTastersChartProps> = ({ records }) => {
  const isDarkMode = useDarkMode();
  const paretoData = computeParetoDistribution(records, (record) => record.Taster);

  const pareto80ThresholdCount =
    paretoData.filter((item) => item.cumulativePercentage <= 80).length + 1;

  const renderCustomTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length > 0) {
      const itemData = payload[0].payload as ParetoItem;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-amber-400/40 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1 z-50">
          <p className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-800 pb-1">
            {itemData.name}
          </p>
          <p className="text-emerald-600 dark:text-emerald-400 font-semibold flex justify-between gap-4">
            <span>Muestras Catadas:</span>
            <span className="font-mono font-bold">
              {itemData.count.toLocaleString()}
            </span>
          </p>
          <p className="text-slate-600 dark:text-slate-300 flex justify-between gap-4">
            <span>% Individual:</span>
            <span className="font-mono font-bold">{itemData.percentage}%</span>
          </p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>% Acumulado:</span>
            <span className="font-mono font-bold">
              {itemData.cumulativePercentage}%
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-3.5 shadow-sm dark:shadow-xl flex flex-col h-full transition-colors">
      {/* Cabecera del Gráfico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-sm lg:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            Pareto de Catadores
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
              (Cantidad de Muestras)
            </span>
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Distribución 80/20 del volumen evaluado por cada panelista
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            Top {pareto80ThresholdCount} cubren el 80%
          </span>
        </div>
      </div>

      {/* Gráfico Recharts Compuesto */}
      <div className="flex-1 min-h-[255px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={paretoData}
            margin={{ top: 12, right: 25, left: 0, bottom: 35 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#1E293B' : '#E2E8F0'}
              vertical={false}
            />

            <XAxis
              dataKey="name"
              stroke={isDarkMode ? '#64748B' : '#94A3B8'}
              tickFormatter={formatTasterDisplayName}
              interval={0}
              angle={-40}
              textAnchor="end"
              height={52}
              tick={{ fontSize: 10, fill: isDarkMode ? '#94A3B8' : '#475569' }}
            />

            {/* Eje Izquierdo: Cantidad */}
            <YAxis
              yAxisId="left"
              stroke={isDarkMode ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDarkMode ? '#94A3B8' : '#475569' }}
              label={{
                value: 'Número de Muestras',
                angle: -90,
                position: 'insideLeft',
                fill: isDarkMode ? '#94A3B8' : '#475569',
                fontSize: 11,
              }}
            />

            {/* Eje Derecho: Porcentaje Acumulado */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="#F5A800"
              tick={{ fontSize: 11, fill: '#F5A800' }}
              tickFormatter={(percentageValue: number) => `${percentageValue}%`}
            />

            <Tooltip content={renderCustomTooltip} />

            {/* Línea de referencia del 80% */}
            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#EF4444"
              strokeDasharray="4 4"
              label={{
                value: 'Regla 80%',
                position: 'top',
                fill: '#EF4444',
                fontSize: 10,
                fontWeight: 'bold',
              }}
            />

            {/* Barras Verdes */}
            <Bar
              yAxisId="left"
              dataKey="count"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            >
              {paretoData.map((entry, index) => (
                <Cell
                  key={`cell-taster-${index}`}
                  fill={entry.cumulativePercentage <= 80 ? '#10B981' : '#047857'}
                />
              ))}
            </Bar>

            {/* Curva de Porcentaje Acumulado */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercentage"
              stroke="#F5A800"
              strokeWidth={2.5}
              dot={{
                r: 3,
                fill: '#F5A800',
                stroke: isDarkMode ? '#070A12' : '#FFFFFF',
                strokeWidth: 1.5,
              }}
              activeDot={{ r: 6, fill: '#FFC72C' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
