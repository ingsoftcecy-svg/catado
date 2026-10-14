import React from 'react';
import { RefreshCw, Download, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  totalRecords?: number;
  onRefresh: () => void;
  onExport: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, onExport, isDark, onToggleTheme }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B101D]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#1E2E4A] px-4 lg:px-8 py-3 transition-colors shadow-sm">
      <div className="max-w-[1750px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Título Principal */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Logo MAZ Oficial */}
          <div className="relative flex items-center justify-center w-14 h-14 rounded-full border-2 border-amber-400 shadow-md shadow-amber-500/10 overflow-hidden bg-black flex-shrink-0 transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="MAZ"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight flex items-center gap-2">
              <span className="text-[#002D72] dark:text-white font-black">
                SEGUIMIENTO <span className="text-amber-500 font-extrabold">CATADO</span>
              </span>
            </h1>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Botón Alternar Modo Claro / Oscuro */}
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-[#111A2E] dark:hover:bg-[#16233B] dark:text-amber-400 dark:border-[#1E2E4A]"
            title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Modo Oscuro</span>
              </>
            )}
          </button>

          {/* Botón Refrescar */}
          <button
            onClick={onRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002D72] hover:bg-[#001D4A] text-white text-xs font-semibold border border-sky-800 transition-colors shadow-sm"
            title="Actualizar datos"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>Actualizar</span>
          </button>

          {/* Botón Exportar */}
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
            title="Descargar datos en CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar</span>
          </button>
        </div>

      </div>
    </header>
  );
};
