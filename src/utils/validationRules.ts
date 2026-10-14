import { AuditRecord, ValidationStatus, RecordValidationInfo, TasterValidationIncident } from '../types/audit';

/**
 * Obtiene la clave de fecha del registro (YYYY-MM-DD o equivalente)
 */
export function getRecordDateKey(r: AuditRecord): string {
  if (r.FECHADOR) {
    const d = String(r.FECHADOR).trim();
    if (d.length >= 10) return d.slice(0, 10);
    return d;
  }
  if (r.SampleDate) {
    const d = String(r.SampleDate).trim();
    if (d.length >= 10) return d.slice(0, 10);
    return d;
  }
  if (r.MES && r.DIA) {
    return `2026-${String(r.MES).padStart(2, '0')}-${String(r.DIA).padStart(2, '0')}`;
  }
  return 'SIN_FECHA';
}

/**
 * Calcula el mapa de validación según la regla de negocio del panel:
 * - Misma muestra (Sample)
 * - Mismo Tanque (Tank) y mismo Remark (Remark) en la misma fecha
 * - Si salen en 2 y 3: ESTÁ BIEN (Validado)
 * - Si sale 1: ESTÁ MAL EL CATADO (Sin validar)
 * - Si sale en 0: Faltan columnas (Tank o Remark vacíos o '0')
 */
export function computeValidationMap(records: AuditRecord[]): Map<string, RecordValidationInfo> {
  const validationMap = new Map<string, RecordValidationInfo>();

  // 1. Agrupar registros válidos por Día + Sample + Tank + Remark
  const groups = new Map<string, AuditRecord[]>();

  for (const record of records) {
    const tank = (record.Tank || '').trim();
    const remark = (record.Remark || '').trim();

    // Regla 0: Si sale en 0 es porque no completaron las columnas
    const isTankEmpty = !tank || tank === '0' || tank === '-' || tank.toLowerCase() === 'sin tanque';
    const isRemarkEmpty = !remark || remark === '0' || remark === '-' || remark.toLowerCase() === 'sin remark';

    if (isTankEmpty || isRemarkEmpty) {
      let missingReason = 'Faltan columnas: ';
      if (isTankEmpty && isRemarkEmpty) missingReason += 'Tanque y Remark';
      else if (isTankEmpty) missingReason += 'Tanque';
      else missingReason += 'Remark';

      const idKey = record.ID || record.DocId || Math.random().toString();
      validationMap.set(idKey, {
        status: 'INCOMPLETE',
        count: 0,
        reason: missingReason,
        groupKey: 'INCOMPLETE',
      });
      continue;
    }

    const dateKey = getRecordDateKey(record);
    const sampleClean = (record.Sample || '').trim().toUpperCase();
    const tankClean = tank.toUpperCase();
    const remarkClean = remark.toUpperCase();

    const groupKey = `${dateKey}___${sampleClean}___${tankClean}___${remarkClean}`;

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(record);
  }

  // 2. Evaluar el conteo de cada grupo
  for (const [groupKey, groupRecords] of groups.entries()) {
    const count = groupRecords.length;

    let status: ValidationStatus = 'SINGLE';
    let reason = 'Está mal el catado (salió en 1)';

    if (count >= 2) {
      status = 'VALIDATED';
      reason = `Está bien (salió en ${count})`;
    }

    for (const rec of groupRecords) {
      const idKey = rec.ID || rec.DocId || Math.random().toString();
      validationMap.set(idKey, {
        status,
        count,
        reason,
        groupKey,
      });
    }
  }

  return validationMap;
}

/**
 * Calcula el resumen de incidentes por persona (catador)
 */
export function computeTasterIncidents(
  records: AuditRecord[],
  validationMap: Map<string, RecordValidationInfo>
): TasterValidationIncident[] {
  const map = new Map<string, { singleCount: number; incompleteCount: number; samples: Set<string> }>();

  for (const r of records) {
    const idKey = r.ID || r.DocId;
    const val = idKey ? validationMap.get(idKey) : undefined;
    if (!val || val.status === 'VALIDATED') continue;

    const taster = (r.Taster || 'Sin Asignar').trim();
    if (!map.has(taster)) {
      map.set(taster, { singleCount: 0, incompleteCount: 0, samples: new Set() });
    }

    const item = map.get(taster)!;
    if (val.status === 'SINGLE') {
      item.singleCount++;
    } else if (val.status === 'INCOMPLETE') {
      item.incompleteCount++;
    }

    const sampleLabel = `${r.Sample} [${r.Tank || 'Sin Tanque'}]`;
    if (item.samples.size < 3) {
      item.samples.add(sampleLabel);
    }
  }

  return Array.from(map.entries())
    .map(([taster, data]) => ({
      taster,
      singleCount: data.singleCount,
      incompleteCount: data.incompleteCount,
      totalIncidents: data.singleCount + data.incompleteCount,
      sampleExamples: Array.from(data.samples),
    }))
    .sort((a, b) => b.totalIncidents - a.totalIncidents);
}
