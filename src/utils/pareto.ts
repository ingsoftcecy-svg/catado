import { AuditRecord, ParetoItem } from '../types/audit';

/**
 * Computes frequency counts for records based on an extractor function.
 * 
 * Cyclomatic Complexity: 2 (< 7)
 * 
 * @param records List of sensory audit records.
 * @param extractKey Function to extract category/grouping key.
 * @returns Map of category name to count.
 */
function aggregateCategoryFrequencies(
  records: AuditRecord[],
  extractKey: (record: AuditRecord) => string
): Record<string, number> {
  const frequencyMap: Record<string, number> = {};

  records.forEach((record) => {
    const categoryKey = extractKey(record) || 'Sin Especificar';
    frequencyMap[categoryKey] = (frequencyMap[categoryKey] || 0) + 1;
  });

  return frequencyMap;
}

/**
 * Calculates a standard 80/20 Pareto distribution (frequency, individual percentage, and cumulative percentage).
 * 
 * Cyclomatic Complexity: 3 (< 7)
 * 
 * @param records List of sensory audit records to analyze.
 * @param extractKey Accessor function to extract the category string from each record.
 * @returns Sorted array of ParetoItem objects in descending order of frequency.
 */
export function computeParetoDistribution(
  records: AuditRecord[],
  extractKey: (record: AuditRecord) => string
): ParetoItem[] {
  const totalRecordsCount = records.length;
  const frequencyMap = aggregateCategoryFrequencies(records, extractKey);

  const sortedCategories = Object.entries(frequencyMap)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([categoryName, count]) => ({ categoryName, count }));

  let runningCumulativeCount = 0;

  return sortedCategories.map((category) => {
    runningCumulativeCount += category.count;

    const percentage = totalRecordsCount > 0 
      ? (category.count / totalRecordsCount) * 100 
      : 0;

    const cumulativePercentage = totalRecordsCount > 0 
      ? (runningCumulativeCount / totalRecordsCount) * 100 
      : 0;

    return {
      name: category.categoryName,
      count: category.count,
      percentage: Number(percentage.toFixed(1)),
      cumulativePercentage: Number(cumulativePercentage.toFixed(1)),
    };
  });
}
