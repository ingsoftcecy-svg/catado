import {
  AuditRecord,
  ValidationStatus,
  RecordValidationInfo,
  TasterValidationIncident
} from '../types/audit';

/**
 * Obtiene la clave de fecha del registro en formato estándar YYYY-MM-DD.
 * Evalúa secuencialmente FECHADOR, SampleDate o combinación MES/DIA.
 * Complejidad Ciclomática: 4 (< 7)
 */
export function getRecordDateKey(record: AuditRecord): string {
  if (record.FECHADOR) {
    const trimmedFechador = String(record.FECHADOR).trim();
    return trimmedFechador.length >= 10 ? trimmedFechador.slice(0, 10) : trimmedFechador;
  }

  if (record.SampleDate) {
    const trimmedSampleDate = String(record.SampleDate).trim();
    return trimmedSampleDate.length >= 10 ? trimmedSampleDate.slice(0, 10) : trimmedSampleDate;
  }

  if (record.MES && record.DIA) {
    const monthPadded = String(record.MES).padStart(2, '0');
    const dayPadded = String(record.DIA).padStart(2, '0');
    return `2026-${monthPadded}-${dayPadded}`;
  }

  return 'SIN_FECHA';
}

/**
 * Determina si un valor de columna obligatorio (Tanque o Remark) está ausente o incompleto.
 * Complejidad Ciclomática: 4 (< 7)
 */
function isColumnFieldMissing(fieldValue: string | undefined): boolean {
  if (!fieldValue) return true;
  const normalizedValue = fieldValue.trim().toLowerCase();
  return (
    normalizedValue === '' ||
    normalizedValue === '0' ||
    normalizedValue === '-' ||
    normalizedValue === 'sin tanque' ||
    normalizedValue === 'sin remark'
  );
}

/**
 * Genera el mensaje explicativo cuando faltan columnas clave.
 * Complejidad Ciclomática: 3 (< 7)
 */
function buildMissingColumnsReason(isTankMissing: boolean, isRemarkMissing: boolean): string {
  if (isTankMissing && isRemarkMissing) {
    return 'Faltan columnas: Tanque y Remark';
  }
  if (isTankMissing) {
    return 'Faltan columnas: Tanque';
  }
  return 'Faltan columnas: Remark';
}

/**
 * Genera la clave de agrupación única para evaluar la regla 2-3 / 1 / 0.
 * Agrupa por: Día + Muestra + Tanque + Remark.
 * Complejidad Ciclomática: 1 (< 7)
 */
function buildTastingGroupKey(record: AuditRecord, tank: string, remark: string): string {
  const dateKey = getRecordDateKey(record);
  const sampleClean = (record.Sample || '').trim().toUpperCase();
  const tankClean = tank.trim().toUpperCase();
  const remarkClean = remark.trim().toUpperCase();
  return `${dateKey}___${sampleClean}___${tankClean}___${remarkClean}`;
}

/**
 * Determina el estado de validación según el número de repeticiones de la cata:
 * - 2 o más: ESTÁ BIEN (Validado)
 * - 1: ESTÁ MAL EL CATADO (Sin validar)
 * Complejidad Ciclomática: 2 (< 7)
 */
function determineGroupValidationStatus(repetitionCount: number): {
  status: ValidationStatus;
  reason: string;
} {
  if (repetitionCount >= 2) {
    return {
      status: 'VALIDATED',
      reason: `Está bien (salió en ${repetitionCount})`
    };
  }
  return {
    status: 'SINGLE',
    reason: 'Está mal el catado (salió en 1)'
  };
}

/**
 * Obtiene el identificador único seguro del registro.
 * Complejidad Ciclomática: 2 (< 7)
 */
function getRecordIdentifier(record: AuditRecord): string {
  return record.ID || record.DocId || `GENERATED_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calcula el mapa de validación según la regla de negocio industrial:
 * - Misma muestra (Sample)
 * - Mismo Tanque (Tank) y mismo Remark (Remark) en la misma fecha
 * - Si salen en 2 y 3: ESTÁ BIEN (VALIDATED)
 * - Si sale 1: ESTÁ MAL EL CATADO (SINGLE)
 * - Si sale en 0: Faltan columnas (INCOMPLETE)
 * Complejidad Ciclomática: 3 (< 7)
 */
export function computeValidationMap(records: AuditRecord[]): Map<string, RecordValidationInfo> {
  const validationMap = new Map<string, RecordValidationInfo>();
  const tastingGroups = new Map<string, AuditRecord[]>();

  // Paso 1: Clasificar incompletos o agrupar para validación
  for (const record of records) {
    const rawTank = record.Tank || '';
    const rawRemark = record.Remark || '';
    const isTankMissing = isColumnFieldMissing(rawTank);
    const isRemarkMissing = isColumnFieldMissing(rawRemark);

    if (isTankMissing || isRemarkMissing) {
      const missingReason = buildMissingColumnsReason(isTankMissing, isRemarkMissing);
      const recordIdentifier = getRecordIdentifier(record);
      validationMap.set(recordIdentifier, {
        status: 'INCOMPLETE',
        count: 0,
        reason: missingReason,
        groupKey: 'INCOMPLETE'
      });
      continue;
    }

    const groupKey = buildTastingGroupKey(record, rawTank, rawRemark);
    const existingGroup = tastingGroups.get(groupKey) || [];
    existingGroup.push(record);
    tastingGroups.set(groupKey, existingGroup);
  }

  // Paso 2: Evaluar cada grupo según la regla de negocio
  for (const [groupKey, groupRecords] of tastingGroups.entries()) {
    const groupCount = groupRecords.length;
    const { status, reason } = determineGroupValidationStatus(groupCount);

    for (const groupRecord of groupRecords) {
      const recordIdentifier = getRecordIdentifier(groupRecord);
      validationMap.set(recordIdentifier, {
        status,
        count: groupCount,
        reason,
        groupKey
      });
    }
  }

  return validationMap;
}

interface TasterIncidentAccumulator {
  singleCount: number;
  incompleteCount: number;
  sampleExamples: Set<string>;
}

/**
 * Registra un incidente de validación (Catado Mal o Faltan Columnas) para un catador.
 * Complejidad Ciclomática: 3 (< 7)
 */
function recordTasterIncident(
  accumulator: TasterIncidentAccumulator,
  status: ValidationStatus,
  sampleDescription: string
): void {
  if (status === 'SINGLE') {
    accumulator.singleCount++;
  } else if (status === 'INCOMPLETE') {
    accumulator.incompleteCount++;
  }

  if (accumulator.sampleExamples.size < 3) {
    accumulator.sampleExamples.add(sampleDescription);
  }
}

/**
 * Calcula el resumen de incidencias agrupadas por catador (panelista).
 * Identifica quiénes tienen catas en 1 (Catado Mal) o en 0 (Faltan Columnas).
 * Complejidad Ciclomática: 3 (< 7)
 */
export function computeTasterIncidents(
  records: AuditRecord[],
  validationMap: Map<string, RecordValidationInfo>
): TasterValidationIncident[] {
  const tasterIncidentMap = new Map<string, TasterIncidentAccumulator>();

  for (const record of records) {
    const recordIdentifier = record.ID || record.DocId;
    const validationInfo = recordIdentifier ? validationMap.get(recordIdentifier) : undefined;

    // Solo procesamos incidentes sin validar
    if (!validationInfo || validationInfo.status === 'VALIDATED') {
      continue;
    }

    const tasterName = (record.Taster || 'Sin Asignar').trim();
    if (!tasterIncidentMap.has(tasterName)) {
      tasterIncidentMap.set(tasterName, {
        singleCount: 0,
        incompleteCount: 0,
        sampleExamples: new Set<string>()
      });
    }

    const tasterData = tasterIncidentMap.get(tasterName)!;
    const sampleDescription = `${record.Sample || 'Muestra'} [${record.Tank || 'Sin Tanque'}]`;
    recordTasterIncident(tasterData, validationInfo.status, sampleDescription);
  }

  return Array.from(tasterIncidentMap.entries())
    .map(([taster, incidentData]) => ({
      taster,
      singleCount: incidentData.singleCount,
      incompleteCount: incidentData.incompleteCount,
      totalIncidents: incidentData.singleCount + incidentData.incompleteCount,
      sampleExamples: Array.from(incidentData.sampleExamples)
    }))
    .sort((incidentA, incidentB) => incidentB.totalIncidents - incidentA.totalIncidents);
}
