/**
 * Generate academic year ranges from current year down to 1999-2000
 * Format: "2024-2025", "2023-2024", etc.
 */
export function generateAcademicYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  // Generate from current year down to 1999
  for (let year = currentYear; year >= 1999; year--) {
    years.push(`${year}-${year + 1}`);
  }
  
  return years;
}

/**
 * Get the current academic year based on the current date
 * Academic year starts in June/July
 */
export function getCurrentAcademicYear(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  
  // If we're in January-June (0-5), we're in the academic year that started last year
  if (currentMonth < 6) {
    return `${currentYear - 1}-${currentYear}`;
  }
  // If we're in July-December (6-11), we're in the academic year that started this year
  return `${currentYear}-${currentYear + 1}`;
}

/**
 * Parse academic year from various formats to standard format
 * Examples: "2024" -> "2024-2025", "2023-2024" -> "2023-2024"
 */
export function parseAcademicYear(year: string): string {
  if (!year || year === 'all') return 'all';
  
  // Already in correct format
  if (year.includes('-')) {
    return year;
  }
  
  // Single year format - convert to academic year range
  const yearNum = parseInt(year);
  if (!isNaN(yearNum)) {
    return `${yearNum}-${yearNum + 1}`;
  }
  
  return year;
}
