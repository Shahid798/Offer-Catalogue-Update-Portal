// Extract a user-facing CSV "name" from a filename:
// - remove extension
// - strip a trailing date/timestamp suffix (e.g. "_20240101", "-20240101123045")
export function getCsvDisplayName(fileName: string | null): string {
  if (!fileName) return '';
  const base = fileName.replace(/\.[^/.]+$/, '');
  return base.replace(/([_-])?\d{8,14}$/, '');
}

