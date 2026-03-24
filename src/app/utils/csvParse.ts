interface CSVData {
  headers: string[];
  rows: string[][];
}

function normalizeDateString(value: string): string {
  if (!value || typeof value !== 'string') return value;

  const trimmed = value.trim();
  if (!trimmed) return value;

  // Ignore time component, normalize using only the date portion.
  const parseTarget = trimmed.split(/[T\s]/)[0] || trimmed;

  const datePatterns = [
    // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY or D-M-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // YYYY-MM-DD (already correct format)
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  ];

  for (const pattern of datePatterns) {
    const match = parseTarget.match(pattern);
    if (match) {
      let year: string;
      let month: string;
      let day: string;

      // Check if it's already in YYYY-MM-DD format
      if (pattern.source.startsWith('^\\(\\\\d\\{4\\}')) {
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Assume MM/DD/YYYY format for slashes, DD-MM-YYYY for dashes/dots
        if (pattern.source.includes('\\/')) {
          // MM/DD/YYYY
          month = match[1].padStart(2, '0');
          day = match[2].padStart(2, '0');
          year = match[3];
        } else {
          // DD-MM-YYYY or DD.MM.YYYY
          day = match[1].padStart(2, '0');
          month = match[2].padStart(2, '0');
          year = match[3];
        }
      }

      const monthNum = parseInt(month, 10);
      const dayNum = parseInt(day, 10);

      if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Try parsing ISO date strings
  const date = new Date(parseTarget);
  if (!isNaN(date.getTime()) && (parseTarget.includes('-') || parseTarget.includes('/'))) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    if (year >= 1900 && year <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  return value;
}

function normalizeDatesInRows(rows: string[][]): string[][] {
  return rows.map(row => row.map(cell => normalizeDateString(cell)));
}

export function parseCsvText(text: string): CSVData {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1).map(line =>
    line.split(',').map(cell => cell.trim())
  );

  const normalizedRows = normalizeDatesInRows(rows);
  return { headers, rows: normalizedRows };
}

export async function parseCsvFile(file: File): Promise<CSVData> {
  const text = await file.text();
  return parseCsvText(text);
}

export function unparseCsvText(data: CSVData): string {
  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };
  
  const headerLine = data.headers.map(escapeCell).join(',');
  const rowLines = data.rows.map(row => row.map(escapeCell).join(','));
  
  return [headerLine, ...rowLines].join('\n');
}

