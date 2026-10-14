import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { CalendarDays, BarChart2, AlertCircle } from 'lucide-react';
import { AuditRecord } from '../types/audit';
import { useDarkMode } from '../hooks/useDarkMode';

interface WeeklyTrendChartProps {
  records: AuditRecord[];
}

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export const WeeklyTrendChart: React.FC<WeeklyTrendChartProps> = ({ records }) => {
  const isDark = useDarkMode();
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');

  // Procesamiento Semanal
  const weeklyData = useMemo(() => {
    const weeklyMap: Record<number, { semana: number; CFR: number; COC: number; Otros: number; total: number }> = {};

    records.forEach((r) => {
      // Extraer semana robustamente (puede venir como número o string)
      let wk = Number(r.SEMANA);
      if (isNaN(wk) || wk <= 0) {
        // Intentar deducir semana por fecha
        if (r.FECHADOR) {
          const d = new Date(r.FECHADOR);
          const oneJan = new Date(d.getFullYear(), 0, 1);
          wk = Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
        } else {
          wk = 1;
        }
      }

      if (!weeklyMap[wk]) {
        weeklyMap[wk] = { semana: wk, CFR: 0, COC: 0, Otros: 0, total: 0 };
      }

      const areaClean = String(r.Area || '').trim().toUpperCase();
      if (areaClean === 'CFR') {
        weeklyMap[wk].CFR++;
      } else if (areaClean === 'COC') {
        weeklyMap[wk].COC++;
      } else {
        weeklyMap[wk].Otros++;
      }
      weeklyMap[wk].total++;
    });

    return Object.values(weeklyMap).sort((a, b) => a.semana - b.semana);
  }, [records]);

  // Procesamiento Mensual
  const monthlyData = useMemo(() => {
    const monthlyMap: Record<number, { mesNum: number; mes: string; CFR: number; COC: number; Otros: number; total: number }> = {};

    records.forEach((r) => {
      let m = Number(r.MES);
      if (isNaN(m) || m <= 0 || m > 12) {
        if (r.FECHADOR) {
          m = new Date(r.FECHADOR).getMonth() + 1;
        } else {
          m = 9;
        }
      }

      if (!monthlyMap[m]) {
        monthlyMap[m] = {
          mesNum: m,
          mes: MONTH_NAMES[m - 1] || `M${m}`,
          CFR: 0,
          COC: 0,
          Otros: 0,
          total: 0
        };
      }

      const areaClean = String(r.Area || '').trim().toUpperCase();
      if (areaClean === 'CFR') {
        monthlyMap[m].CFR++;
      } else if (areaClean === 'COC') {
        monthlyMap[m].COC++;
      } else {
        monthlyMap[m].Otros++;
      }
      monthlyMap[m].total++;
    });

    return Object.values(monthlyMap).sort((a, b) => a.mesNum - b.mesNum);
  }, [records]);

  const activeData = viewMode === 'weekly' ? weeklyData : monthlyData;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#0B101D] border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xl dark:shadow-2xl text-xs space-y-1 z-50">
          <p className="font-bold text-slate-900 dark:text-white text-sm border-b border-slate-100 dark:border-slate-800 pb-1">
            {viewMode === 'weekly' ? `Semana ${label}` : `Mes de ${label}`}
          </p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-4 font-semibold">
              <span>{p.name}:</span>
              <span className="font-mono font-bold">{p.value.toLocaleString()} catas</span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-sky-500" />
            Evolución Temporal de Catados
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">(Desglose por Área)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comportamiento y volumen a través del tiempo entre CFR y COC
          </p>
        </div>

        {/* Selector Semanal / Mensual */}
        <div className="flex bg-slate-100 dark:bg-[#070A12] p-1 rounded-xl border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('weekly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'weekly'
                ? 'bg-[#002D72] text-white shadow-md border border-sky-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Por Semana
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'monthly'
                ? 'bg-[#002D72] text-white shadow-md border border-sky-500/50'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            Por Mes
          </button>
        </div>
      </div>

      {/* Contenedor del Gráfico con Altura Fija Explícita (340px) para evitar error de 0px en Recharts */}
      <div className="w-full h-[340px] relative">
        {activeData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <p className="text-xs">No hay datos temporales registrados para el filtro actual.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            {viewMode === 'weekly' ? (
              <BarChart data={weeklyData} margin={{ top: 15, right: 25, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} />
                <XAxis
                  dataKey="semana"
                  stroke={isDark ? '#64748B' : '#94A3B8'}
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                  tickFormatter={(w) => `Sem ${w}`}
                />
                <YAxis
                  stroke={isDark ? '#64748B' : '#94A3B8'}
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="CFR" fill="#0284C7" name="Área CFR" radius={[6, 6, 0, 0]} maxBarSize={45} />
                <Bar dataKey="COC" fill="#F5A800" name="Área COC" radius={[6, 6, 0, 0]} maxBarSize={45} />
              </BarChart>
            ) : (
              <LineChart data={monthlyData} margin={{ top: 15, right: 25, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1E293B' : '#E2E8F0'} vertical={false} />
                <XAxis
                  dataKey="mes"
                  stroke={isDark ? '#64748B' : '#94A3B8'}
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                />
                <YAxis
                  stroke={isDark ? '#64748B' : '#94A3B8'}
                  tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#475569' }}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="CFR"
                  name="Área CFR"
                  stroke="#0284C7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0284C7' }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="COC"
                  name="Área COC"
                  stroke="#F5A800"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#F5A800' }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
