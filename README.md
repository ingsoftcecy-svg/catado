# 🍺 Auditoría Sensorial - Monitoreo de Catas & Paretos

Dashboard analítico de calidad cervecera desarrollado con **React + TypeScript + Vite + Tailwind CSS + Recharts**, preparado para sincronización en tiempo real vía **Firebase** desde un **Script de Office (TypeScript)** en Excel.

---

## 🎨 Paleta de Color Corporativa
- **Negro / Carbón Oscuro:** `#070A12` y `#0D1424` (Fondos de alta inmersión y contraste).
- **Azul Corona:** `#002D72` y `#0284C7` (Color de marca principal y acentos).
- **Amarillo Corona / Oro:** `#F5A800` y `#FFC72C` (Destacados, curvas de Pareto y KPIs principales).
- **Blanco:** `#FFFFFF` (Tipografía clara, tarjetas y lecturas).

---

## 📊 Vistas y Gráficos Incluidos
1. **Filtros Dinámicos e Interactivos:**
   - Año (2025, 2026, Todos).
   - Mes (1 a 12).
   - Semana (36 a 40).
   - Área (CFR, COC).
   - Turno (Middle Shift, Morning Shift, Evening Shift).
   - Resultado (Todos, Solo OK, Solo NOK).
   - Buscador rápido por catador o muestra.
2. **KPIs de Alto Impacto:**
   - **Total de Muestras Catadas** (Recuento de ID).
   - **Tasa de Conformidad (% OK)** vs Desviaciones sensoriales.
   - **Catador Líder** con conteo de muestras.
   - **Muestra Principal** con volumen.
   - **Turno Dominante**.
3. **Paretos Profesionales:**
   - **Pareto de Catadores:** Barras de frecuencias decrecientes + Curva de % acumulado + Línea de corte 80/20 + Indicador del número de catadores que concentran el 80% de la carga.
   - **Pareto de Muestras / Etapas:** Distribución 80/20 de Cerveza clara, Tanques de maduración/fermentación, Mosto frío, Kieselguhr, etc.
4. **Distribución por Turnos:** Barras por Middle, Morning y Evening Shift.
5. **Participación por Área:** Gráfico de dona (`% de uso por área`) con total central.
6. **Evolución Temporal:** Selector de vista por Semanas (barras agrupadas) o por Meses (líneas suaves multiserie CFR vs COC).
7. **Tabla Detallada de Auditoría:** Paginada con buscador para auditar registro por registro.
8. **Exportación a CSV:** Descarga directa de los datos filtrados con formato UTF-8 para Excel.

---

## 🔄 Conexión con Firebase
- **Modo Dual:** El sistema cuenta con datos precargados idénticos a los de tu plantilla para visualizar y probar todo inmediatamente.
- **En Vivo:** Puedes configurar tus credenciales de Firebase en el botón **"Configurar Firebase"** en la barra superior o mediante el archivo `.env`. Al hacerlo, se suscribirá en tiempo real a la colección `auditorias_sensoriales`.

---

## 📝 Script de Office (Excel a Firebase)
El archivo `src/scripts/officeScript.ts` contiene el código en TypeScript listo para copiar y pegar en Excel Online:
1. Abre tu archivo Excel con la tabla de Catas.
2. Ve a la pestaña **Automatizar** (Automate) -> **Nuevo script**.
3. Pega el código de `src/scripts/officeScript.ts`.
4. Coloca tu `FIREBASE_PROJECT_ID`.
5. Haz clic en **Ejecutar** y tus datos se subirán a Firebase al instante.
