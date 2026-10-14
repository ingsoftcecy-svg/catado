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

/**
 * Normaliza cadenas de texto para búsqueda: elimina acentos y unifica a minúsculas.
 * Complejidad Ciclomática: 1 (< 7)
 */
function normalizeSearchText(inputText: unknown): string {
  return String(inputText ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Valida si un registro coincide con el año seleccionado.
 * Complejidad Ciclomática: 3 (< 7)
 */
function isMatchingYear(record: AuditRecord, selectedYear: number | 'ALL'): boolean {
  if (selectedYear === 'ALL') return true;
  const yearString = String(selectedYear);
  const matchesIdYear = record.ID.includes(`-${yearString}-`);
  const matchesFechadorYear = Boolean(record.FECHADOR && record.FECHADOR.startsWith(yearString));
  return matchesIdYear || matchesFechadorYear;
}

/**
 * Valida si un registro coincide con un valor de filtro categórico (Mes, Semana, Área, Turno, Estado).
 * Complejidad Ciclomática: 2 (< 7)
 */
function isMatchingFilterValue<T>(recordValue: T, filterValue: T | 'ALL'): boolean {
  return filterValue === 'ALL' || recordValue === filterValue;
}

/**
 * Valida si un registro contiene todas las palabras clave (tokens) ingresadas en el buscador.
 * Complejidad Ciclomática: 2 (< 7)
 */
function isMatchingSearchTokens(record: AuditRecord, queryTokens: string[]): boolean {
  if (queryTokens.length === 0) return true;
  const searchableText = normalizeSearchText(
    `${record.ID || ''} ${record.Taster || ''} ${record.Sample || ''} ${record.Tank || ''} ${record.Remark || ''} ${record.Area || ''} ${record.Shift || ''} ${record.Brand || ''} ${record.Site || ''}`
  );
  return queryTokens.every((token) => searchableText.includes(token));
}

/**
 * Evalúa el conjunto de filtros aplicados sobre un registro de auditoría.
 * Complejidad Ciclomática: 1 (< 7)
 */
function isRecordMatchingFilters(
  record: AuditRecord,
  filters: FilterState,
  queryTokens: string[]
): boolean {
  return (
    isMatchingYear(record, filters.year) &&
    isMatchingFilterValue(record.MES, filters.month) &&
    isMatchingFilterValue(record.SEMANA, filters.week) &&
    isMatchingFilterValue(record.Area, filters.area) &&
    isMatchingFilterValue(record.Shift, filters.shift) &&
    isMatchingFilterValue(record.OKNOK, filters.status) &&
    isMatchingSearchTokens(record, queryTokens)
  );
}

/**
 * Guarda una lista de identificadores excluidos en el almacenamiento local permanente.
 * Complejidad Ciclomática: 2 (< 7)
 */
function saveExcludedDocumentIdsLocally(newDocumentIds: string[]): void {
  try {
    const storedIdsJson = localStorage.getItem('MAZ_EXCLUDED_DOC_IDS');
    const existingIds: string[] = storedIdsJson ? JSON.parse(storedIdsJson) : [];
    const mergedUniqueIds = Array.from(new Set([...existingIds, ...newDocumentIds]));
    localStorage.setItem('MAZ_EXCLUDED_DOC_IDS', JSON.stringify(mergedUniqueIds));
  } catch (error) {
    console.warn('Error al persistir IDs excluidos en localStorage:', error);
  }
}

/**
 * Obtiene el conjunto de identificadores excluidos desde el almacenamiento local.
 * Complejidad Ciclomática: 2 (< 7)
 */
function getExcludedDocumentIdsSet(): Set<string> {
  try {
    const storedIdsJson = localStorage.getItem('MAZ_EXCLUDED_DOC_IDS');
    return storedIdsJson ? new Set(JSON.parse(storedIdsJson)) : new Set();
  } catch {
    return new Set();
  }
}

/**
 * Filtra los registros excluidos según la lista persistida en el navegador.
 * Complejidad Ciclomática: 2 (< 7)
 */
function removeExcludedRecords(records: AuditRecord[], excludedSet: Set<string>): AuditRecord[] {
  if (excludedSet.size === 0) return records;
  return records.filter((record) => {
    const recordIdentifier = (record.DocId || record.ID || '').trim();
    return !excludedSet.has(recordIdentifier);
  });
}

/**
 * Componente Principal del Dashboard de Auditoría Sensorial MAZ.
 */
export function App() {
  const [allRecords, setAllRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedValidationDate, setSelectedValidationDate] = useState<string>('ALL');
  const [activeValidationFilter, setActiveValidationFilter] = useState<'ALL' | ValidationStatus>('ALL');
  const [selectedTasterIncident, setSelectedTasterIncident] = useState<string | null>(null);

  // Manejo de tema claro / oscuro persistente
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

  // Estado global de filtros
  const [filters, setFilters] = useState<FilterState>({
    year: 'ALL',
    month: 'ALL',
    week: 'ALL',
    area: 'ALL',
    shift: 'ALL',
    status: 'ALL',
    tasterSearch: '',
  });

  // Suscripción inteligente en vivo (Cache-First)
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAudits((incomingData) => {
      const excludedIdsSet = getExcludedDocumentIdsSet();
      const sanitizedData = removeExcludedRecords(incomingData, excludedIdsSet);
      setAllRecords(sanitizedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Sincronización manual bajo demanda desde Firebase Cloud
   */
  const handleRefresh = async () => {
    setLoading(true);
    try {
      const freshCloudData = await forceFullCloudSync();
      const excludedIdsSet = getExcludedDocumentIdsSet();
      const sanitizedData = removeExcludedRecords(freshCloudData, excludedIdsSet);
      setAllRecords(sanitizedData);
    } catch {
      setAllRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Detección de registros con Área #N/D (fórmulas de Excel incompletas)
  const ndAreaRecords = useMemo(() => {
    return allRecords.filter((record) => {
      const area = (record.Area || '').trim();
      return area === '#N/D' || area.includes('#N/D');
    });
  }, [allRecords]);

  const [isDeletingNd, setIsDeletingNd] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  /**
   * Elimina las muestras con área #N/D de memoria, caché y Firebase
   * Complejidad Ciclomática: 4 (< 7)
   */
  const handleDeleteNdRecords = async () => {
    if (ndAreaRecords.length === 0) return;

    const totalRecordsToDelete = ndAreaRecords.length;
    const isConfirmed = window.confirm(
      `¿Deseas eliminar permanentemente las ${totalRecordsToDelete} muestras con Área "#N/D"?\n\nSe eliminarán de tus estadísticas, de los filtros y de la base de datos.`
    );
    if (!isConfirmed) return;

    setIsDeletingNd(true);

    const idsToExclude = ndAreaRecords
      .map((record) => (record.DocId || record.ID || '').trim())
      .filter(Boolean);

    // 1. Guardar en lista de exclusión permanente local
    saveExcludedDocumentIdsLocally(idsToExclude);

    // 2. Eliminar de la memoria del Dashboard y actualizar caché IndexedDB
    const updatedRecords = allRecords.filter((record) => {
      const area = (record.Area || '').trim();
      const identifier = (record.DocId || record.ID || '').trim();
      return area !== '#N/D' && !area.includes('#N/D') && !idsToExclude.includes(identifier);
    });
    setAllRecords(updatedRecords);
    await saveCachedAudits(updatedRecords);

    // 3. Resetear filtro de área si estaba seleccionado #N/D
    setFilters((previousFilters) =>
      previousFilters.area === '#N/D' ? { ...previousFilters, area: 'ALL' } : previousFilters
    );

    // 4. Intentar borrado remoto en Firebase Cloud sin bloquear la app
    let isCloudDeleted = false;
    try {
      const countDeleted = await deleteRecordsByDocIds(idsToExclude);
      if (countDeleted > 0) isCloudDeleted = true;
    } catch (error) {
      console.warn('Firebase Cloud rechazó la eliminación remota por reglas de seguridad:', error);
    }

    if (isCloudDeleted) {
      setDeleteSuccessMsg(`¡Se eliminaron exitosamente las ${totalRecordsToDelete} muestras de Firebase y del Dashboard!`);
    } else {
      setDeleteSuccessMsg(`¡Se eliminaron y purgaron las ${totalRecordsToDelete} muestras del Dashboard y de la memoria!`);
    }

    setTimeout(() => setDeleteSuccessMsg(null), 8000);
    setIsDeletingNd(false);
  };

  // Opciones de filtros únicos calculados reactivamente
  const availableYears = useMemo(() => {
    const uniqueYears = new Set<number>();
    allRecords.forEach((record) => {
      const idMatch = record.ID.match(/PC-(\d{4})/);
      if (idMatch) {
        uniqueYears.add(Number(idMatch[1]));
      } else if (record.FECHADOR) {
        uniqueYears.add(new Date(record.FECHADOR).getFullYear());
      }
    });
    return Array.from(uniqueYears).sort((yearA, yearB) => yearA - yearB);
  }, [allRecords]);

  const availableMonths = useMemo(() => {
    const uniqueMonths = new Set<number>();
    allRecords.forEach((record) => {
      if (record.MES) uniqueMonths.add(record.MES);
    });
    return Array.from(uniqueMonths).sort((monthA, monthB) => monthA - monthB);
  }, [allRecords]);

  const availableWeeks = useMemo(() => {
    const uniqueWeeks = new Set<number>();
    allRecords.forEach((record) => {
      if (record.SEMANA) uniqueWeeks.add(record.SEMANA);
    });
    return Array.from(uniqueWeeks).sort((weekA, weekB) => weekA - weekB);
  }, [allRecords]);

  const availableAreas = useMemo(() => {
    const uniqueAreas = new Set<string>();
    allRecords.forEach((record) => {
      if (record.Area) uniqueAreas.add(record.Area);
    });
    return Array.from(uniqueAreas).sort();
  }, [allRecords]);

  const availableShifts = useMemo(() => {
    const uniqueShifts = new Set<string>();
    allRecords.forEach((record) => {
      if (record.Shift) uniqueShifts.add(record.Shift);
    });
    return Array.from(uniqueShifts).sort();
  }, [allRecords]);

  // Aplicación reactiva de filtros (Complejidad Ciclomática: 2)
  const filteredRecords = useMemo(() => {
    const rawSearchQuery = filters.tasterSearch.trim();
    const searchTokens =
      rawSearchQuery !== '' ? normalizeSearchText(rawSearchQuery).split(/\s+/).filter(Boolean) : [];

    return allRecords.filter((record) => isRecordMatchingFilters(record, filters, searchTokens));
  }, [allRecords, filters]);

  // Mapa de validación de catados según regla 2-3 / 1 / 0
  const validationMap = useMemo(() => {
    return computeValidationMap(filteredRecords);
  }, [filteredRecords]);

  /**
   * Exportación de auditoría completa a archivo CSV compatible con Excel
   */
  const handleExportCSV = () => {
    if (filteredRecords.length === 0) return;

    const columnHeaders = [
      'ID', 'Zone', 'Country', 'Site', 'Department', 'Taster', 'Sample',
      'Sample Date', 'Shift', 'OKNOK', 'Remark', 'Tank', 'DIA', 'SEMANA', 'MES', 'Area'
    ];

    const dataRows = filteredRecords.map((record) => [
      `"${record.ID}"`,
      `"${record.Zone}"`,
      `"${record.Country}"`,
      `"${record.Site}"`,
      `"${record.Department}"`,
      `"${record.Taster}"`,
      `"${record.Sample}"`,
      `"${record.SampleDate}"`,
      `"${record.Shift}"`,
      `"${record.OKNOK}"`,
      `"${record.Remark}"`,
      `"${record.Tank || ''}"`,
      record.DIA,
      record.SEMANA,
      record.MES,
      `"${record.Area}"`
    ]);

    // UTF-8 BOM para evitar problemas de caracteres en Microsoft Excel
    const csvContent = '\uFEFF' + [columnHeaders.join(','), ...dataRows.map((row) => row.join(','))].join('\n');
    const fileBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = URL.createObjectURL(fileBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = downloadUrl;
    downloadAnchor.setAttribute('download', `Auditoria_Catas_Corona_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070A12] text-slate-800 dark:text-slate-100 flex flex-col selection:bg-amber-400 selection:text-black transition-colors">
      
      {/* Barra de Navegación Superior */}
      <Navbar
        totalRecords={filteredRecords.length}
        onRefresh={handleRefresh}
        onExport={handleExportCSV}
        isDark={isDark}
        onToggleTheme={() => setIsDark((previousTheme) => !previousTheme)}
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
          onFilterStatus={(status) => setFilters((previousFilters) => ({ ...previousFilters, status }))}
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

            {/* Fila 4: Panel de Auditoría Diaria y Validación (Regla 2-3 / 1 / 0) */}
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
