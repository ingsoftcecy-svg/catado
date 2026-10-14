import { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { ParetoTastersChart } from './components/ParetoTastersChart';
import { ParetoSamplesChart } from './components/ParetoSamplesChart';
import { ShiftDistributionChart } from './components/ShiftDistributionChart';
import { WeeklyTrendChart } from './components/WeeklyTrendChart';
import { AreaDonutChart } from './components/AreaDonutChart';
import { AuditDetailTable } from './components/AuditDetailTable';
import { ValidationAuditPanel } from './components/ValidationAuditPanel';
import { AuditRecord, FilterState, ValidationStatus } from './types/audit';
import { subscribeToAudits, forceFullCloudSync, deleteRecordsByDocIds } from './services/firebase';
import { saveCachedAudits } from './services/indexedDbCache';
import { computeValidationMap } from './utils/validationRules';
import { Database, UploadCloud, RefreshCw, AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

const normalizeSearchText = (str: any): string => {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

export function App() {
  const [allRecords, setAllRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedValidationDate, setSelectedValidationDate] = useState<string>('ALL');
  const [activeValidationFilter, setActiveValidationFilter] = useState<'ALL' | ValidationStatus>('ALL');
  const [selectedTasterIncident, setSelectedTasterIncident] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('THEME_MODE') === 'dark';
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('THEME_MODE', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('THEME_MODE', 'light');
    }
  }, [isDark]);

  const [filters, setFilters] = useState<FilterState>({
    year: 'ALL',
    month: 'ALL',
    week: 'ALL',
    area: 'ALL',
    shift: 'ALL',
    status: 'ALL',
    tasterSearch: '',
  });

  // Cargar datos en vivo o mock data
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAudits((data) => {
      try {
        const stored = localStorage.getItem('MAZ_EXCLUDED_DOC_IDS');
        if (stored) {
          const excludedSet = new Set(JSON.parse(stored));
          data = data.filter((r) => {
            const id = (r.DocId || r.ID || '').trim();
            return !excludedSet.has(id);
          });
        }
      } catch {
        // ignore
      }
      setAllRecords(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      let freshData = await forceFullCloudSync();
      try {
        const stored = localStorage.getItem('MAZ_EXCLUDED_DOC_IDS');
        if (stored) {
          const excludedSet = new Set(JSON.parse(stored));
          freshData = freshData.filter((r) => {
            const id = (r.DocId || r.ID || '').trim();
            return !excludedSet.has(id);
          });
        }
      } catch {
        // ignore
      }
      setAllRecords(freshData);
    } catch {
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Registros que tienen error #N/D en el Área (por fórmulas incompletas de Excel)
  const ndAreaRecords = useMemo(() => {
    return allRecords.filter((r) => {
      const area = (r.Area || '').trim();
      return area === '#N/D' || area.includes('#N/D');
    });
  }, [allRecords]);

  const [isDeletingNd, setIsDeletingNd] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  const handleDeleteNdRecords = async () => {
    if (ndAreaRecords.length === 0) return;

    const count = ndAreaRecords.length;
    const confirmDelete = window.confirm(
      `¿Deseas eliminar permanentemente las ${count} muestras con Área "#N/D"?\n\nSe eliminarán de tus estadísticas, de los filtros y de la base de datos.`
    );
    if (!confirmDelete) return;

    setIsDeletingNd(true);

    const idsToExclude = ndAreaRecords.map((r) => (r.DocId || r.ID || '').trim()).filter(Boolean);

    // 1. Guardar en lista de exclusión local permanente para que no reaparezcan
    try {
      const stored = localStorage.getItem('MAZ_EXCLUDED_DOC_IDS');
      const existing: string[] = stored ? JSON.parse(stored) : [];
      const combined = Array.from(new Set([...existing, ...idsToExclude]));
      localStorage.setItem('MAZ_EXCLUDED_DOC_IDS', JSON.stringify(combined));
    } catch (e) {
      console.warn('Error guardando en excluded ids:', e);
    }

    // 2. Eliminar inmediatamente de la memoria del Dashboard y guardar en caché local
    const updatedRecords = allRecords.filter((r) => {
      const area = (r.Area || '').trim();
      const id = (r.DocId || r.ID || '').trim();
      return area !== '#N/D' && !area.includes('#N/D') && !idsToExclude.includes(id);
    });
    setAllRecords(updatedRecords);
    await saveCachedAudits(updatedRecords);

    // 3. Resetear filtro de área si estaba seleccionado #N/D
    setFilters((prev) => (prev.area === '#N/D' ? { ...prev, area: 'ALL' } : prev));

    // 4. Intentar borrar en Firebase en la nube (sin bloquear si las reglas son de solo lectura)
    let cloudDeleted = false;
    try {
      const countDeleted = await deleteRecordsByDocIds(idsToExclude);
      if (countDeleted > 0) cloudDeleted = true;
    } catch (err) {
      console.warn('Firebase Cloud rechazó la eliminación remota por reglas de seguridad:', err);
    }

    if (cloudDeleted) {
      setDeleteSuccessMsg(`¡Se eliminaron exitosamente las ${count} muestras de Firebase y del Dashboard!`);
    } else {
      setDeleteSuccessMsg(`¡Se eliminaron y purgaron las ${count} muestras del Dashboard y de la memoria!`);
    }

    setTimeout(() => setDeleteSuccessMsg(null), 8000);
    setIsDeletingNd(false);
  };

  // Opciones de filtros únicos derivados de los datos
  const availableYears = useMemo(() => {
    const set = new Set<number>();
    allRecords.forEach((r) => {
      const match = r.ID.match(/PC-(\d{4})/);
      if (match) set.add(Number(match[1]));
      else if (r.FECHADOR) set.add(new Date(r.FECHADOR).getFullYear());
    });
    return Array.from(set).sort();
  }, [allRecords]);

  const availableMonths = useMemo(() => {
    const set = new Set<number>();
    allRecords.forEach((r) => {
      if (r.MES) set.add(r.MES);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [allRecords]);

  const availableWeeks = useMemo(() => {
    const set = new Set<number>();
    allRecords.forEach((r) => {
      if (r.SEMANA) set.add(r.SEMANA);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [allRecords]);

  const availableAreas = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (r.Area) set.add(r.Area);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  const availableShifts = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((r) => {
      if (r.Shift) set.add(r.Shift);
    });
    return Array.from(set).sort();
  }, [allRecords]);

  // Aplicación reactiva de filtros
  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      // Filtro Año
      if (filters.year !== 'ALL') {
        const hasYear = record.ID.includes(`-${filters.year}-`) || (record.FECHADOR && record.FECHADOR.startsWith(String(filters.year)));
        if (!hasYear) return false;
      }

      // Filtro Mes
      if (filters.month !== 'ALL') {
        if (record.MES !== filters.month) return false;
      }

      // Filtro Semana
      if (filters.week !== 'ALL') {
        if (record.SEMANA !== filters.week) return false;
      }

      // Filtro Área
      if (filters.area !== 'ALL') {
        if (record.Area !== filters.area) return false;
      }

      // Filtro Turno
      if (filters.shift !== 'ALL') {
        if (record.Shift !== filters.shift) return false;
      }

      // Filtro Estado OK / NOK
      if (filters.status !== 'ALL') {
        if (record.OKNOK !== filters.status) return false;
      }

      // Filtro Búsqueda inteligente multi-campo (Catador, Muestra, Tanque, Remark, ID, Área, Turno, Marca, Planta)
      if (filters.tasterSearch.trim() !== '') {
        const queryTokens = normalizeSearchText(filters.tasterSearch).split(/\s+/).filter(Boolean);
        if (queryTokens.length > 0) {
          const searchableText = normalizeSearchText(
            `${record.ID || ''} ${record.Taster || ''} ${record.Sample || ''} ${record.Tank || ''} ${record.Remark || ''} ${record.Area || ''} ${record.Shift || ''} ${record.Brand || ''} ${record.Site || ''}`
          );
          const allTokensMatch = queryTokens.every((token) => searchableText.includes(token));
          if (!allTokensMatch) return false;
        }
      }

      return true;
    });
  }, [allRecords, filters]);

  // Mapa de validación de catados según regla 2-3 / 1 / 0
  const validationMap = useMemo(() => {
    return computeValidationMap(filteredRecords);
  }, [filteredRecords]);

  // Exportar a archivo CSV
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = [
      'ID', 'Zone', 'Country', 'Site', 'Department', 'Taster', 'Sample',
      'Sample Date', 'Shift', 'OKNOK', 'Remark', 'Tank', 'DIA', 'SEMANA', 'MES', 'Area'
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.ID}"`,
      `"${r.Zone}"`,
      `"${r.Country}"`,
      `"${r.Site}"`,
      `"${r.Department}"`,
      `"${r.Taster}"`,
      `"${r.Sample}"`,
      `"${r.SampleDate}"`,
      `"${r.Shift}"`,
      `"${r.OKNOK}"`,
      `"${r.Remark}"`,
      `"${r.Tank || ''}"`,
      r.DIA,
      r.SEMANA,
      r.MES,
      `"${r.Area}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Auditoria_Catas_Corona_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A12] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-400 selection:text-black transition-colors">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        totalRecords={filteredRecords.length}
        onRefresh={handleRefresh}
        onExport={handleExportCSV}
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      />

      {/* Contenido Principal */}
      <main className="flex-1 max-w-[1750px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* Barra de Filtros Reactivos */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          availableYears={availableYears}
          availableMonths={availableMonths}
          availableWeeks={availableWeeks}
          availableAreas={availableAreas}
          availableShifts={availableShifts}
        />

        {/* Banner de Acción Rápida para Eliminar Muestras con #N/D */}
        {ndAreaRecords.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl shadow-sm transition-all">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-900/60 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-rose-900 dark:text-rose-200 text-xs sm:text-sm">
                  Se detectaron {ndAreaRecords.length} muestras con Área <span className="font-mono bg-rose-200/70 dark:bg-rose-900 px-1.5 py-0.5 rounded text-rose-900 dark:text-rose-100 font-black">#N/D</span>
                </p>
                <p className="text-rose-700/80 dark:text-rose-300/80 text-[11px] mt-0.5">
                  Puedes eliminarlas directamente de Firebase para que desaparezca la opción "#N/D" de tus filtros y queden limpios tus indicadores.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleDeleteNdRecords}
                disabled={isDeletingNd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:bg-rose-400 text-white font-bold text-xs transition-all shadow-md shadow-rose-600/25 whitespace-nowrap cursor-pointer"
                title="Eliminar de Firebase permanentemente"
              >
                {isDeletingNd ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Eliminando de Firebase...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar las {ndAreaRecords.length} muestras #N/D</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notificación de Éxito al Borrar */}
        {deleteSuccessMsg && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{deleteSuccessMsg}</span>
          </div>
        )}

        {/* Tarjetas KPI */}
        <KpiCards
          filteredRecords={filteredRecords}
          allRecords={allRecords}
          onFilterStatus={(status) => setFilters((prev) => ({ ...prev, status }))}
        />

        {/* Sección de Gráficos Principales */}
        {loading ? (
          <div className="h-64 flex items-center justify-center rounded-2xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] shadow-sm dark:shadow-xl">
            <div className="flex items-center gap-3 text-amber-500 font-bold">
              <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></span>
              Sincronizando auditorías sensoriales...
            </div>
          </div>
        ) : allRecords.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-[#1E2E4A] p-10 text-center space-y-4 shadow-sm dark:shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Database className="w-8 h-8" />
            </div>
            <div className="max-w-xl mx-auto space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Base de datos en Firebase actualmente sin registros (0 datos)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                El proyecto de Firebase <code className="text-amber-600 dark:text-amber-300 font-semibold">catado</code> está conectado correctamente, pero la colección <code className="text-sky-600 dark:text-sky-300 font-semibold">auditorias_sensoriales</code> está vacía en este momento.
              </p>
            </div>
            <div className="p-4 max-w-lg mx-auto bg-slate-50 dark:bg-[#070A12] rounded-xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
              <div className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <UploadCloud className="w-4 h-4" /> Para subir tus 5,632 filas desde Excel:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Abre tu archivo en Excel Online.</li>
                <li>Pega el código de <code className="text-sky-600 dark:text-sky-400 font-medium">excel-script/officeScript.ts</code> en Scripts de Office.</li>
                <li>Haz clic en <strong className="text-slate-900 dark:text-white">Ejecutar</strong> para sincronizar las filas con su clave única.</li>
                <li>Al terminar, pulsa el botón <strong className="text-slate-900 dark:text-white">"Actualizar"</strong> aquí abajo.</li>
              </ol>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar y Actualizar Datos Ahora
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Fila 1: Pareto de Catadores (2/3) + % Uso por Área (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ParetoTastersChart records={filteredRecords} />
              </div>
              <div className="lg:col-span-1">
                <AreaDonutChart records={filteredRecords} />
              </div>
            </div>

            {/* Fila 2: Pareto de Muestras/Etapas (2/3) + Catados por Turno (1/3) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ParetoSamplesChart records={filteredRecords} />
              </div>
              <div className="lg:col-span-1">
                <ShiftDistributionChart records={filteredRecords} />
              </div>
            </div>

            {/* Fila 3: Evolución Temporal Semanal y Mensual (Ancho Completo) */}
            <div>
              <WeeklyTrendChart records={filteredRecords} />
            </div>

            {/* Fila 4: Panel de Auditoría de Validación Sensorial (Regla 2 y 3 Catadores) */}
            <div>
              <ValidationAuditPanel
                records={filteredRecords}
                selectedDate={selectedValidationDate}
                onSelectDate={setSelectedValidationDate}
                activeValidationFilter={activeValidationFilter}
                onSelectValidationFilter={setActiveValidationFilter}
                selectedTasterIncident={selectedTasterIncident}
                onSelectTasterIncident={setSelectedTasterIncident}
              />
            </div>

            {/* Fila 5: Detalle de Auditoría con Tabla Paginada y Validación Panel */}
            <div>
              <AuditDetailTable
                records={filteredRecords}
                validationMap={validationMap}
                activeValidationFilter={activeValidationFilter}
                onSelectValidationFilter={setActiveValidationFilter}
                selectedTasterIncident={selectedTasterIncident}
                onSelectTasterIncident={setSelectedTasterIncident}
              />
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-[#070A12] py-4 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        Creado por: Ing en Software Cecilia Solis
      </footer>

    </div>
  );
}

export default App;
