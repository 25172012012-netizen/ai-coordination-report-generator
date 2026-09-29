import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { extractFromExcel } from '../server/extractors/excelExtractor.js';
import { normalizeRows } from '../server/pipeline/normalizer.js';
import { mergeExtractedOrders } from '../server/pipeline/orderMerger.js';
import { generateFixedReport } from '../server/pipeline/reportGenerator.js';

describe('Sample Workbook Tests (ORDER STATUS Sept.xlsx)', () => {
  it('should process ORDER STATUS Sept.xlsx and only include present attributes/columns (no extra purchase/production headers)', () => {
    const filePath = path.resolve('work', 'ORDER STATUS Sept.xlsx');
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    const doc = extractFromExcel(buffer, 'ORDER STATUS Sept.xlsx');

    expect(doc.rows).toBeDefined();
    expect(doc.rows!.length).toBeGreaterThanOrEqual(12);

    const orders = normalizeRows(doc.rows!, 'ORDER STATUS Sept.xlsx');
    const merged = mergeExtractedOrders([orders]);

    expect(merged.orders.length).toBe(12);

    // Verify dynamic attribute adaptation:
    // ORDER STATUS Sept.xlsx has NO Purchase or Production columns
    expect(merged.summary.activeDepartments).not.toContain('purchase');
    expect(merged.summary.activeDepartments).not.toContain('production');
    expect(merged.summary.activeDepartments).toContain('service');
    expect(merged.summary.activeDepartments).toContain('dispatch');

    const reportText = generateFixedReport(merged.summary, merged.orders);

    // Summary should only contain Service and Dispatch counts, not empty Purchase/Production lines
    expect(reportText).toContain('Service Pending: 8');
    expect(reportText).toContain('Dispatch Pending: 9');
    expect(reportText).not.toContain('Purchase Pending:');
    expect(reportText).not.toContain('Production Pending:');

    // Each order should include SERVICE and DISPATCH sections, but NOT empty PURCHASE or PRODUCTION sections
    expect(reportText).toContain('SERVICE');
    expect(reportText).toContain('DISPATCH');
    expect(reportText).not.toContain('==================================================\nPURCHASE\n');
    expect(reportText).not.toContain('==================================================\nPRODUCTION\n');

    // Should include order details present in the sheet
    expect(reportText).toContain('Order/OA No.: OA 04');
    expect(reportText).toContain('Customer: Nilkanth');
    expect(reportText).toContain('Product: ALPHA 1500');
  });
});
