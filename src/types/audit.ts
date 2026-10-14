export interface AuditRecord {
  ID: string;
  Zone: string;
  Country: string;
  Site: string;
  Department: string;
  Taster: string;
  Sample: string;
  SampleDate: string;
  Shift: 'Morning Shift' | 'Middle Shift' | 'Evening Shift' | string;
  OKNOK: 'OK' | 'NOK' | string;
  Remark: string;
  Brand?: string;
  Package?: string;
  ProductionLine?: string;
  Tank?: string;
  Columna?: string | number;
  FECHADOR?: string;
  DIA?: number;
  SEMANA?: number;
  MES?: number;
  Numero?: number;
  Area: 'CFR' | 'COC' | string;
  FECHA2?: string;
  DocId?: string;
  FilaExcel?: number;
}

export interface FilterState {
  year: number | 'ALL';
  month: number | 'ALL';
  week: number | 'ALL';
  area: string | 'ALL';
  shift: string | 'ALL';
  status: 'ALL' | 'OK' | 'NOK';
  tasterSearch: string;
}

export interface ParetoItem {
  name: string;
  count: number;
  percentage: number;
  cumulativePercentage: number;
}

export type ValidationStatus = 'VALIDATED' | 'SINGLE' | 'INCOMPLETE';

export interface RecordValidationInfo {
  status: ValidationStatus;
  count: number;
  reason: string;
  groupKey: string;
}

export interface TasterValidationIncident {
  taster: string;
  singleCount: number;      // en 1 (catado mal / no validado)
  incompleteCount: number;  // en 0 (faltan columnas de tanque o remark)
  totalIncidents: number;
  sampleExamples: string[];
}
