import { AuditRecord } from '../types/audit';

// Generador de datos representativos basados fielmente en los datos reales del panel de cata
export function generateMockAudits(): AuditRecord[] {
  const tastersWeights = [
    { name: 'MIGUEL ANGEL SANCHEZ FLORES', count: 348 },
    { name: 'LUIS FERNANDO GUTIERREZ MURILLO', count: 234 },
    { name: 'RAUL DAVID CORTES ALANIZ', count: 233 },
    { name: 'TOPILTZIN CURIEL CABRAL', count: 215 },
    { name: 'JESUS EDUARDO BRICEÑO MONTOYA', count: 197 },
    { name: 'EDGAR RENE DIAZ SANCHEZ', count: 178 },
    { name: 'MIGUEL ANGEL RIVERA MUÑOZ', count: 169 },
    { name: 'JOSE LEANDRO MARTINEZ SANDOVAL', count: 150 },
    { name: 'OSCAR RODRIGO CODALBA', count: 138 },
    { name: 'JUAN JOSE MEJIA MONTOYA', count: 126 },
    { name: 'RICARDO ESPARZA DOMINGUEZ', count: 88 },
    { name: 'OSCAR GUILLERMO MEJIA GARCIA', count: 77 },
    { name: 'LUIS FERNANDO ZAPATA CARDENAS', count: 67 },
    { name: 'VICTOR HUGO ZAPATA DOMINGUEZ', count: 64 },
    { name: 'GUILLERMO GERARDO GONZALEZ ULLOA', count: 39 },
    { name: 'SHERLYN GARCIA PEREZ', count: 19 },
    { name: 'IVAN ALEJANDRO ROJERO MALDONADO', count: 4 },
  ];

  const samplesList = [
    { name: 'Cerveza clara - Muestras de proceso', weight: 663 },
    { name: 'Tanque de maduración', weight: 320 },
    { name: 'Tanque de fermentación', weight: 308 },
    { name: 'Mosto frío - Muestras de proceso', weight: 295 },
    { name: 'Kieselguhr - Ayuda de filtración', weight: 275 },
    { name: 'Otros - Muestra de proceso', weight: 211 },
    { name: 'PVPP - Ayuda de filtración', weight: 97 },
    { name: 'Silica gel - Ayuda de filtración', weight: 67 },
    { name: 'Agentes filtrantes', weight: 60 },
    { name: 'Otros - Ayuda de proceso', weight: 37 },
    { name: 'Otros - Agua', weight: 8 },
    { name: 'Gel de sílice - Ayuda filtración', weight: 3 },
    { name: 'Mosto dulce - Proceso', weight: 2 },
  ];

  const shifts = ['Middle Shift', 'Morning Shift', 'Evening Shift'];
  const shiftDistribution = [0.43, 0.34, 0.23]; // Distribución similar a 7.4k, 5.9k, 4.0k

  const records: AuditRecord[] = [];
  let currentId = 49500;

  // Creamos el registro exacto mostrado en la imagen de ejemplo
  records.push({
    ID: 'PC-2026-09-1005-ZACATECAS',
    Zone: 'MAZ',
    Country: 'MEXICO',
    Site: 'ZACATECAS',
    Department: 'Brewing',
    Taster: 'MIGUEL ANGEL SANCHEZ FLORES',
    Sample: 'Cerveza clara - Muestras de proceso',
    SampleDate: '2026-09-25T23:24:53+00:00',
    Shift: 'Middle Shift',
    OKNOK: 'OK',
    Remark: 'CATADO CORRECTO',
    Brand: 'Corona Extra',
    Package: 'Botella 355ml',
    ProductionLine: 'Línea 4',
    Tank: 'BBT 3',
    Columna: 1005,
    FECHADOR: '2026-09-25',
    DIA: 25,
    SEMANA: 39,
    MES: 9,
    Numero: 1005,
    Area: 'CFR',
    FECHA2: '2026/09/25'
  });

  // Generamos un pool de catas representativas para el dashboard (semanas 36 a 40, mes 9, año 2026 y meses previos)
  for (const taster of tastersWeights) {
    for (let i = 0; i < taster.count; i++) {
      currentId++;
      
      // Asignar muestra ponderada
      const randSampleVal = Math.random() * 2346;
      let cumulativeSample = 0;
      let selectedSample = samplesList[0].name;
      for (const s of samplesList) {
        cumulativeSample += s.weight;
        if (randSampleVal <= cumulativeSample) {
          selectedSample = s.name;
          break;
        }
      }

      // Asignar turno ponderado
      const randShift = Math.random();
      const shift = randShift < shiftDistribution[0] 
        ? shifts[0] 
        : (randShift < shiftDistribution[0] + shiftDistribution[1] ? shifts[1] : shifts[2]);

      // Asignar semana (36 a 40)
      const weekRand = Math.random();
      let semana = 39;
      if (weekRand < 0.16) semana = 36;
      else if (weekRand < 0.45) semana = 37;
      else if (weekRand < 0.68) semana = 38;
      else if (weekRand < 0.98) semana = 39;
      else semana = 40;

      // Asignar día del mes (1 a 30 de septiembre)
      const dia = Math.min(30, Math.max(1, (semana - 35) * 6 + Math.floor(Math.random() * 5)));
      const isOK = Math.random() > 0.035; // 96.5% OK
      const area = Math.random() > 0.4 ? 'CFR' : 'COC';
      const mes = Math.random() > 0.3 ? 9 : Math.floor(Math.random() * 8) + 1; // mayoría en mes 9

      records.push({
        ID: `PC-2026-${String(mes).padStart(2, '0')}-${currentId}-ZACATECAS`,
        Zone: 'MAZ',
        Country: 'MEXICO',
        Site: 'ZACATECAS',
        Department: 'Brewing',
        Taster: taster.name,
        Sample: selectedSample,
        SampleDate: `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}T14:30:00+00:00`,
        Shift: shift,
        OKNOK: isOK ? 'OK' : 'NOK',
        Remark: isOK ? 'CATADO CORRECTO' : 'DESVIACIÓN SENSORIAL DETECTADA',
        Brand: 'Corona Extra',
        Package: 'Vidrio / Granel',
        ProductionLine: `Línea ${Math.floor(Math.random() * 6) + 1}`,
        Tank: `BBT ${Math.floor(Math.random() * 8) + 1}`,
        Columna: currentId,
        FECHADOR: `2026-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
        DIA: dia,
        SEMANA: semana,
        MES: mes,
        Numero: currentId,
        Area: area,
        FECHA2: `2026/${String(mes).padStart(2, '0')}/${String(dia).padStart(2, '0')}`
      });
    }
  }

  return records;
}
