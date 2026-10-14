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
  Cell
} from 'recharts';
import { Wine, AlertCircle } from 'lucide-react';
import { AuditRecord, ParetoItem } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface ParetoSamplesChartProps {
  records: AuditRecord[];
}

export const ParetoSamplesChart: React.FC<ParetoSamplesChartProps> = ({ records }) => {
  const isDark = useDarkMode();
  // 1. Agrupar por tipo de muestra
  const counts: Record<string, number> = {};
  records.forEach((r) => {
    counts[r.Sample] = (counts[r.Sample] || 0) + 1;
  });

  const total = records.length;

  // 2. Ordenar descendentemente
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));

  // 3. Porcentaje acumulado
  let cumCount = 0;
  const paretoData: ParetoItem[] = sorted.map((item) => {
    cumCount += item.count;
    const percentage = total > 0 ? (item.count / total) * 100 : 0;
    const cumulativePercentage = total > 0 ? (cumCount / total) * 100 : 0;
    return {
      name: item.name,
      count: item.count,
      percentage: Number(percentage.toFixed(1)),
      cumulativePercentage: Number(cumulativePercentage.toFixed(1)),
    };
  });

  const pareto80Count = paretoData.filter((d) => d.cumulativePercentage <= 80).length + 1;

  const formatSampleName = (str: string) => {
    if (str.length > 18) {
      return str.slice(0, 15) + '...';
    }
    return str;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ParetoItem;
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-amber-400/40 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1 z-50 max-w-xs">
          <p className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-800 pb-1">{data.name}</p>
          <p className="text-amber-600 dark:text-amber-400 font-semibold flex justify-between gap-4">
            <span>Muestras Catadas:</span>
            <span className="font-mono font-bold">{data.count.toLocaleString()}</span>
          </p>
          <p className="text-slate-600 dark:text-slate-300 flex justify-between gap-4">
            <span>% del Total:</span>
            <span className="font-mono font-bold">{data.percentage}%</span>
          </p>
          <p className="text-sky-600 dark:text-sky-400 font-semibold flex justify-between gap-4">
            <span>% Acumulado:</span>
            <span className="font-mono font-bold">{data.cumulativePercentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col h-full transition-colors">
      
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wine className="w-4 h-4 text-amber-500" />
            TOP de Muestras Catadas
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Pareto por Producto / Etapa)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Concentración de catas por matriz cervecera y proceso
          </p>
        </div>

        <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5" />
          Top {pareto80Count} etapas concentran el 80%
        </span>
      </div>

      {/* Gráfico */}
      <div className="flex-1 min-h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={paretoData}
            margin={{ top: 20, right: 30, left: 0, bottom: 65 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} />
            
            <XAxis
              dataKey="name"
              stroke={isDark ? '#64748B' : '#94A3B8'}
              tickFormatter={formatSampleName}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#475569' }}
            />

            <YAxis
              yAxisId="left"
              stroke={isDark ? '#64748B' : '#94A3B8'}
              tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
              label={{
                value: 'Número de Muestras',
                angle: -90,
                position: 'insideLeft',
                fill: isDark ? '#94A3B8' : '#475569',
                fontSize: 11,
              }}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              stroke="#0284C7"
              tick={{ fontSize: 11, fill: '#0284C7' }}
              tickFormatter={(v) => `${v}%`}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              yAxisId="right"
              y={80}
              stroke="#EF4444"
              strokeDasharray="4 4"
              label={{
                value: '80%',
                position: 'top',
                fill: '#EF4444',
                fontSize: 10,
                fontWeight: 'bold',
              }}
            />

            {/* Barras Amarillo Corona / Ámbar */}
            <Bar
              yAxisId="left"
              dataKey="count"
              radius={[6, 6, 0, 0]}
              maxBarSize={45}
            >
              {paretoData.map((entry, index) => (
                <Cell
                  key={`cell-sample-${index}`}
                  fill={entry.cumulativePercentage <= 80 ? '#F5A800' : '#B45309'}
                />
              ))}
            </Bar>

            {/* Curva de porcentaje acumulado en Azul Cielo */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePercentage"
              stroke="#0284C7"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#0284C7', stroke: isDark ? '#070A12' : '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#0369A1' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};
