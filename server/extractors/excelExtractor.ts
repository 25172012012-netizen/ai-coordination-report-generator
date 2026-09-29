import * as XLSX from 'xlsx';
import { ExtractedDocument } from '../types.js';

/**
 * Robustly parses Excel (.xlsx, .xls, .csv) files.
 * Handles messy headers, multiple sheets, empty rows, and Excel date numbers.
 */
export function extractFromExcel(buffer: Buffer, filename: string): ExtractedDocument {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellNF: false,
    cellText: false,
  });

  const allRows: Record<string, any>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    // Convert sheet to 2D array of raw values
    const rawData: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false, // get formatted text where possible
    });

    if (!rawData || rawData.length === 0) continue;

    // Find the likely header row
    // Look for row that has standard operational headers like customer, order, product, oa, status, dispatch, etc.
    let headerRowIndex = -1;
    let maxHeaderScore = 0;

    const commonHeaderTerms = [
      'customer', 'oa', 'order', 'product', 'item', 'status', 'dispatch',
      'service', 'purchase', 'production', 'qty', 'quantity', 'date', 'remark',
      'invoice', 'payment', 'site', 'client', 'po', 'material', 'so'
    ];

    for (let r = 0; r < Math.min(rawData.length, 25); r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;

      let score = 0;
      for (const cell of row) {
        const cellStr = String(cell || '').toLowerCase().trim();
        if (!cellStr) continue;
        for (const term of commonHeaderTerms) {
          if (cellStr.includes(term)) {
            score++;
            break;
          }
        }
      }

      if (score > maxHeaderScore) {
        maxHeaderScore = score;
        headerRowIndex = r;
      }
    }

    // If no good header row found with scoring, default to first row with at least 2 non-empty cells
    if (headerRowIndex === -1 || maxHeaderScore < 1) {
      headerRowIndex = rawData.findIndex(r => Array.isArray(r) && r.filter(c => String(c).trim()).length >= 2);
      if (headerRowIndex === -1) headerRowIndex = 0;
    }

    const headers = (rawData[headerRowIndex] || []).map((h: any, idx: number) => {
      const val = String(h || '').trim();
      return val ? val : `Column_${idx + 1}`;
    });

    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!Array.isArray(row)) continue;

      const rowObj: Record<string, any> = { _sheet: sheetName, _rowIndex: r + 1 };
      let hasData = false;

      headers.forEach((header: string, cIdx: number) => {
        let cellVal = row[cIdx];
        if (cellVal instanceof Date) {
          cellVal = cellVal.toISOString().split('T')[0];
        } else if (cellVal !== undefined && cellVal !== null) {
          cellVal = String(cellVal).trim();
        } else {
          cellVal = '';
        }

        if (cellVal) hasData = true;
        rowObj[header] = cellVal;
      });

      if (hasData) {
        allRows.push(rowObj);
      }
    }
  }

  return {
    filename,
    rows: allRows,
  };
}
