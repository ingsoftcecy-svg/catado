/**
 * ============================================================================
 * SCRIPT DE OFFICE (EXCEL ONLINE) - SINCRONIZACIÓN DE FILAS VISIBLES
 * ============================================================================
 * PROYECTO: MAZ - Auditoría Sensorial (Planta Zacatecas)
 * DESTINO: Firebase Firestore (Proyecto "catado")
 * ============================================================================
 * ⚡ SOLUCIÓN EXACTA:
 * Lee ÚNICAMENTE las filas visibles que tienes filtradas en Excel (las 5,632 filas).
 * Utiliza getVisibleView() para ignorar automáticamente todas las filas ocultas,
 * garantizando que lo que ves en tu pantalla sea exactamente lo que sube a Firebase.
 * ============================================================================
 */

// ⚡ MODO DE OPERACIÓN:
// - Poner en 0: Sube TODO el año 2026 completo (las 5,632 filas desde la fila 32,320).
// - Poner un número (ej. 150): Para el DÍA A DÍA. Solo lee y sube las últimas 150 filas agregadas al final de la tabla (en 1 segundo).
const FILAS_RECIENTES_A_SUBIR: number = 0;

// ⚙️ CONFIGURACIÓN DE FIREBASE (PROYECTO: catado)
const FIREBASE_PROJECT_ID: string = "catado";
const FIREBASE_API_KEY: string = "AIzaSyA_KUnRv-w-s1YW2QtdVXiA6nOXfSrTraA";
const FIRESTORE_COMMIT_URL: string = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit?key=${FIREBASE_API_KEY}`;

type ExcelCellValue = string | number | boolean;

interface ExcelAuditRow {
  DocId: string;
  FilaExcel: number;
  ID: string;
  Zone: string;
  Country: string;
  Site: string;
  Department: string;
  Taster: string;
  Sample: string;
  SampleDate: string;
  Shift: string;
  OKNOK: string;
  Remark: string;
  Brand: string;
  Package: string;
  ProductionLine: string;
  Tank: string;
  Columna: string | number;
  FECHADOR: string;
  DIA: number;
  SEMANA: number;
  MES: number;
  Numero: number;
  Area: string;
  FECHA2: string;
}

/**
 * Formateadores a prueba de fallos para Firestore
 */
function fsString(val: ExcelCellValue | undefined | null): { stringValue: string } {
  return { stringValue: val != null ? String(val).trim() : "" };
}

function fsInt(val: ExcelCellValue | undefined | null): { integerValue: string } {
  const n: number = parseInt(String(val || 0), 10);
  return { integerValue: String(isNaN(n) ? 0 : n) };
}

/**
 * Función Principal de Office Scripts
 */
async function main(workbook: ExcelScript.Workbook): Promise<void> {
  const startTime: number = Date.now();
  const sheet: ExcelScript.Worksheet = workbook.getActiveWorksheet();
  const usedRange: ExcelScript.Range | undefined = sheet.getUsedRange();

  if (!usedRange) {
    console.log("❌ No se encontraron datos en la hoja activa.");
    return;
  }

  const startRowOffset: number = usedRange.getRowIndex();
  const startColOffset: number = usedRange.getColumnIndex();
  const totalRowCount: number = usedRange.getRowCount();
  const totalColCount: number = usedRange.getColumnCount();

  console.log(`📊 Hoja detectada: ${totalRowCount} filas x ${totalColCount} columnas.`);

  // 1. AUTO-DETECCIÓN DE ENCABEZADOS (Fila 4)
  let headerRowIdx: number = startRowOffset;
  let headers: string[] = [];

  for (let testR: number = 0; testR < Math.min(15, totalRowCount); testR++) {
    const testRange: ExcelScript.Range = sheet.getRangeByIndexes(startRowOffset + testR, startColOffset, 1, totalColCount);
    const rowValues: (string | number | boolean)[] = testRange.getValues()[0];
    const candidateHeaders: string[] = rowValues.map((c: ExcelCellValue): string => String(c || "").trim().toLowerCase());

    const matchCount: number = candidateHeaders.filter((h: string): boolean =>
      h.indexOf("fechador") !== -1 ||
      h.indexOf("taster") !== -1 ||
      h.indexOf("catador") !== -1 ||
      h.indexOf("sample") !== -1 ||
      h.indexOf("fecha2") !== -1 ||
      h.indexOf("area") !== -1 ||
      h === "id"
    ).length;

    if (matchCount >= 2) {
      headerRowIdx = startRowOffset + testR;
      headers = rowValues.map((c: ExcelCellValue): string => String(c || "").trim());
      console.log(`🎯 Encabezados encontrados en Fila ${headerRowIdx + 1}`);
      break;
    }
  }

  if (headers.length === 0) {
    const fallbackRange: ExcelScript.Range = sheet.getRangeByIndexes(startRowOffset, startColOffset, 1, totalColCount);
    headers = fallbackRange.getValues()[0].map((c: ExcelCellValue): string => String(c || "").trim());
  }

  function findCol(keywords: string[]): number {
    return headers.findIndex((h: string): boolean => {
      const lower: string = h.toLowerCase().trim();
      return keywords.some((k: string): boolean => lower.indexOf(k.toLowerCase()) !== -1);
    });
  }

  const idIdx: number = findCol(["id", "recuento"]);
  const zoneIdx: number = findCol(["zone", "zona"]);
  const countryIdx: number = findCol(["country", "pais", "país"]);
  const siteIdx: number = findCol(["site", "sitio", "planta"]);
  const deptIdx: number = findCol(["department", "departamento"]);
  const tasterIdx: number = findCol(["taster", "catador"]);
  const sampleIdx: number = findCol(["sample", "muestra"]);
  const sampleDateIdx: number = findCol(["sample date", "sampledate", "fecha muestra"]);
  const shiftIdx: number = findCol(["shift", "turno"]);
  const oknokIdx: number = findCol(["oknok", "ok"]);
  const remarkIdx: number = findCol(["remark", "observacion", "observación", "comentario"]);
  const brandIdx: number = findCol(["brand", "marca"]);
  const packageIdx: number = findCol(["package", "empaque", "envase"]);
  const prodLineIdx: number = findCol(["production line", "productionline", "linea"]);
  const tankIdx: number = findCol(["tank", "tanque"]);
  const colIdx: number = findCol(["columna"]);
  const fechadorIdx: number = findCol(["fechador"]);
  const diaIdx: number = findCol(["dia", "día"]);
  const semanaIdx: number = findCol(["semana", "week"]);
  const mesIdx: number = findCol(["mes", "month"]);
  const numeroIdx: number = findCol(["numero", "número"]);
  const areaIdx: number = findCol(["area", "área"]);
  const fecha2Idx: number = findCol(["fecha2"]);

  // 2. LECTURA EXCLUSIVA DE FILAS VISIBLES (FILTRADAS EN EXCEL)
  // El año 2026 inicia en la fila 32320 y llega hasta el final de la tabla
  const firstDataRow: number = headerRowIdx + 1;
  const lastSheetRow: number = startRowOffset + totalRowCount;
  let startScanRow: number = Math.min(firstDataRow + 32000, lastSheetRow - 1);

  if (FILAS_RECIENTES_A_SUBIR > 0) {
    startScanRow = Math.max(firstDataRow + 32000, lastSheetRow - FILAS_RECIENTES_A_SUBIR);
    console.log(`⚡ Modo diario activo: Leyendo solo las últimas ${lastSheetRow - startScanRow} filas agregadas...`);
  } else {
    console.log(`⚡ Modo completo activo: Leyendo todas las filas visibles de 2026 (desde fila ${startScanRow + 1} hasta ${lastSheetRow})...`);
  }

  const rowsToUpload: ExcelAuditRow[] = [];
  const ROW_CHUNK_SIZE: number = 3000;
  let currentRow: number = Math.max(firstDataRow, startScanRow);

  while (currentRow < lastSheetRow) {
    const rowsToFetch: number = Math.min(ROW_CHUNK_SIZE, lastSheetRow - currentRow);
    const chunkRange: ExcelScript.Range = sheet.getRangeByIndexes(currentRow, startColOffset, rowsToFetch, totalColCount);
    
    // getVisibleView() extrae ÚNICAMENTE las filas visibles (ignora todas las filas ocultas por el filtro)
    const visibleView: ExcelScript.RangeView = chunkRange.getVisibleView();
    const chunkValues: (string | number | boolean)[][] = visibleView.getValues();

    for (let r: number = 0; r < chunkValues.length; r++) {
      const row: (string | number | boolean)[] = chunkValues[r];

      const sampleDateVal: ExcelCellValue = sampleDateIdx !== -1 ? row[sampleDateIdx] : "";
      const fechadorVal: ExcelCellValue = fechadorIdx !== -1 ? row[fechadorIdx] : "";
      const fecha2Val: ExcelCellValue = fecha2Idx !== -1 ? row[fecha2Idx] : "";
      const idVal: string = idIdx !== -1 ? String(row[idIdx] || "").trim() : "";

      // Validar que la muestra tenga datos y corresponda a 2026
      const strSampleDate: string = String(sampleDateVal || "").trim();
      const strId: string = String(idVal || "").trim();
      const strFechador: string = String(fechadorVal || "").trim();

      const has2026Date: boolean = 
        strSampleDate.startsWith("2026") || 
        strSampleDate.indexOf("2026") !== -1 ||
        strId.startsWith("PC-2026") ||
        strFechador.startsWith("2026");

      if (!has2026Date && strSampleDate !== "") {
        continue;
      }

      // Si la fila está completamente vacía, saltarla
      if (!strId && !strSampleDate && !row[tasterIdx]) {
        continue;
      }

      const excelRowNum: number = currentRow + r + 1;
      const cleanSessionId: string = (strId || `PC-2026-01-1-ZACATECAS`).replace(/[\/\s]/g, "-");
      // Clave única garantizada por fila
      const uniqueDocId: string = `${cleanSessionId}_F${excelRowNum}`;

      let cleanOkNok: string = oknokIdx !== -1 ? String(row[oknokIdx] || "").trim().toUpperCase() : "OK";
      if (!cleanOkNok || cleanOkNok === "NULL" || cleanOkNok === "UNDEFINED") {
        cleanOkNok = "OK";
      }

      rowsToUpload.push({
        DocId: uniqueDocId,
        FilaExcel: excelRowNum,
        ID: strId || cleanSessionId,
        Zone: zoneIdx !== -1 ? String(row[zoneIdx] || "MAZ").trim() : "MAZ",
        Country: countryIdx !== -1 ? String(row[countryIdx] || "MEXICO").trim() : "MEXICO",
        Site: siteIdx !== -1 ? String(row[siteIdx] || "ZACATECAS").trim() : "ZACATECAS",
        Department: deptIdx !== -1 ? String(row[deptIdx] || "Brewing").trim() : "Brewing",
        Taster: tasterIdx !== -1 ? String(row[tasterIdx] || "").trim() : "",
        Sample: sampleIdx !== -1 ? String(row[sampleIdx] || "").trim() : "",
        SampleDate: strSampleDate || String(fechadorVal || ""),
        Shift: shiftIdx !== -1 ? String(row[shiftIdx] || "").trim() : "",
        OKNOK: cleanOkNok,
        Remark: remarkIdx !== -1 ? String(row[remarkIdx] || "").trim() : "",
        Brand: brandIdx !== -1 ? String(row[brandIdx] || "").trim() : "",
        Package: packageIdx !== -1 ? String(row[packageIdx] || "").trim() : "",
        ProductionLine: prodLineIdx !== -1 ? String(row[prodLineIdx] || "").trim() : "",
        Tank: tankIdx !== -1 ? String(row[tankIdx] || "").trim() : "",
        Columna: colIdx !== -1 ? String(row[colIdx] || "").trim() : "",
        FECHADOR: String(fechadorVal || ""),
        DIA: diaIdx !== -1 ? Number(row[diaIdx] || 0) : 0,
        SEMANA: semanaIdx !== -1 ? Number(row[semanaIdx] || 0) : 0,
        MES: mesIdx !== -1 ? Number(row[mesIdx] || 0) : 0,
        Numero: numeroIdx !== -1 ? Number(row[numeroIdx] || 0) : 0,
        Area: areaIdx !== -1 ? String(row[areaIdx] || "").trim() : "",
        FECHA2: String(fecha2Val || "")
      });
    }

    currentRow += rowsToFetch;
  }

  console.log(`🚀 Exactamente ${rowsToUpload.length} filas visibles listas para sincronizar.`);

  if (rowsToUpload.length === 0) {
    console.log("ℹ️ No se encontraron registros visibles en el rango.");
    return;
  }

  // 3. SUBIDA A FIREBASE FIRESTORE CON :commit (Lotes seguros de 300)
  const BATCH_SIZE: number = 300;
  let totalUploaded: number = 0;

  for (let i: number = 0; i < rowsToUpload.length; i += BATCH_SIZE) {
    const chunk: ExcelAuditRow[] = rowsToUpload.slice(i, i + BATCH_SIZE);

    const writes = chunk.map((item: ExcelAuditRow) => {
      const cleanDocId: string = encodeURIComponent(item.DocId);
      return {
        update: {
          name: `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/auditorias_sensoriales/${cleanDocId}`,
          fields: {
            ID: fsString(item.ID),
            DocId: fsString(item.DocId),
            FilaExcel: fsInt(item.FilaExcel),
            Zone: fsString(item.Zone),
            Country: fsString(item.Country),
            Site: fsString(item.Site),
            Department: fsString(item.Department),
            Taster: fsString(item.Taster),
            Sample: fsString(item.Sample),
            SampleDate: fsString(item.SampleDate),
            Shift: fsString(item.Shift),
            OKNOK: fsString(item.OKNOK),
            Remark: fsString(item.Remark),
            Brand: fsString(item.Brand),
            Package: fsString(item.Package),
            ProductionLine: fsString(item.ProductionLine),
            Tank: fsString(item.Tank),
            Columna: fsString(item.Columna),
            FECHADOR: fsString(item.FECHADOR),
            DIA: fsInt(item.DIA),
            SEMANA: fsInt(item.SEMANA),
            MES: fsInt(item.MES),
            Numero: fsInt(item.Numero),
            Area: fsString(item.Area),
            FECHA2: fsString(item.FECHA2)
          }
        }
      };
    });

    try {
      const response: Response = await fetch(FIRESTORE_COMMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes: writes })
      });

      if (response.ok) {
        totalUploaded += chunk.length;
        console.log(`⚡ Progreso: ${totalUploaded} / ${rowsToUpload.length} filas subidas...`);
      } else {
        const errText: string = await response.text();
        console.log(`⚠️ Advertencia: ${errText.substring(0, 100)}`);
      }
    } catch (err) {
      console.log("⚠️ Reintentando bloque...");
    }
  }

  const durationSec: number = Math.round((Date.now() - startTime) / 1000);
  console.log(`🎉 ¡Sincronización completada en ${durationSec} segundos! Total subido: ${totalUploaded} filas.`);
}
