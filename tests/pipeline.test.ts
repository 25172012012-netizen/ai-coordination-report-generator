import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { extractFromExcel } from '../server/extractors/excelExtractor.js';
import { normalizeRows, normalizeFreeText } from '../server/pipeline/normalizer.js';
import { mergeExtractedOrders } from '../server/pipeline/orderMerger.js';
import { generateFixedReport } from '../server/pipeline/reportGenerator.js';
import { NOT_AVAILABLE, OrderRecord } from '../server/types.js';

describe('AI Coordination Report Pipeline Tests', () => {
  // Test 1: Extract and parse multiple orders from Excel
  it('should accurately extract multiple orders from a simulated Excel workbook', () => {
    const ws_data = [
      ['Customer/ OA Reference', 'Product', 'Quantity', 'Order Status', 'Dispatch schedule', 'Site Status/ Remark'],
      ['M/s Apex Industries OA 04', 'Industrial Chiller 50TR', '2 Nos', 'Under Assembly', '20-Oct-2026', 'Civil work completed, waiting for dispatch'],
      ['Zenith Tech OA 09', 'Cooling Tower 100TR', '1 No', 'Testing', '15-Oct-2026', 'Site ready for installation'],
      ['Global Fab OA 13', 'Heat Exchanger', '4 Nos', 'Dispatched', '01-Oct-2026', 'Erection in progress'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Status Sheet');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const doc = extractFromExcel(buffer, 'Simulated_Orders.xlsx');
    expect(doc.rows?.length).toBe(3);

    const orders = normalizeRows(doc.rows!, 'Simulated_Orders.xlsx');
    expect(orders.length).toBe(3);
    expect(orders[0].orderId).toBe('OA 04');
    expect(orders[0].customer).toBe('M/s Apex Industries');
    expect(orders[0].product).toBe('Industrial Chiller 50TR');
    expect(orders[0].quantity).toBe('2 Nos');
    expect(orders[1].orderId).toBe('OA 09');
    expect(orders[2].orderId).toBe('OA 13');
  });

  // Test 2: Dynamic attributes: only present columns are included in the report
  it('should only render attributes and departments present in the uploaded document and omit unmentioned ones', () => {
    const ws_data = [
      ['Customer / OA', 'Product', 'Order Status'],
      ['Alpha Corp OA 14', 'Air Handling Unit', 'In Production'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const doc = extractFromExcel(buffer, 'Sparse.xlsx');
    const orders = normalizeRows(doc.rows!, 'Sparse.xlsx');
    const merged = mergeExtractedOrders([orders]);
    const report = generateFixedReport(merged.summary, merged.orders);

    expect(report).toContain('Order/OA No.: OA 14');
    expect(report).toContain('Customer: Alpha Corp');
    expect(report).toContain('Product: Air Handling Unit');
    expect(report).toContain('Order Status: In Production');

    expect(report).not.toContain('Quantity:');
    expect(report).not.toContain('PURCHASE');
    expect(report).not.toContain('SERVICE');
    expect(report).not.toContain('DISPATCH');
  });

  // Test 3: Universal Document Support: Task list / project tracker
  it('should process arbitrary operational spreadsheets like project/task trackers', () => {
    const ws_data = [
      ['Task Name', 'Assignee', 'Due Date', 'Status', 'Priority'],
      ['Procure Sheet Metal', 'John Doe', '10-Oct-2026', 'Pending Vendor Confirmation', 'High'],
      ['Assemble Frame Unit 4', 'Jane Smith', '14-Oct-2026', 'In Progress', 'Medium'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const doc = extractFromExcel(buffer, 'TaskTracker.xlsx');
    const orders = normalizeRows(doc.rows!, 'TaskTracker.xlsx');
    expect(orders.length).toBe(2);

    const merged = mergeExtractedOrders([orders]);
    const report = generateFixedReport(merged.summary, merged.orders);

    expect(report).toContain('OVERALL COORDINATION SUMMARY');
    expect(report).toContain('Total Orders: 2');
    expect(report).toContain('Assignee: John Doe');
    expect(report).toContain('Priority: High');
  });

  // Test 4: Universal Document Support: Procurement / PO document
  it('should process procurement documents with vendor, PO number, material status', () => {
    const ws_data = [
      ['PO Number', 'Vendor Name', 'Material Description', 'Purchase Status', 'Delivery Date'],
      ['PO-8821', 'Steelcraft Suppliers', 'SS 304 Pipe 2 inch', 'PO Issued', '12-Oct-2026'],
      ['PO-8822', 'Valves Direct', 'Ball Valve 50mm', 'In Stock', '05-Oct-2026'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Procurement');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const doc = extractFromExcel(buffer, 'Procurement.xlsx');
    const orders = normalizeRows(doc.rows!, 'Procurement.xlsx');
    expect(orders.length).toBe(2);

    const merged = mergeExtractedOrders([orders]);
    const report = generateFixedReport(merged.summary, merged.orders);

    expect(report).toContain('Purchase Pending: 1');
    expect(report).toContain('PURCHASE');
    expect(report).toContain('• Material: SS 304 Pipe 2 inch');
    expect(report).toContain('• Availability: PENDING');
  });

  // Test 5: Conflict detection across multiple files
  it('should detect and flag cross-document conflicts when two files have conflicting quantities or dates', () => {
    const listA: OrderRecord[] = [
      {
        orderId: 'OA 04',
        customer: 'Apex Industries',
        product: 'Industrial Chiller',
        quantity: '2 Nos',
        orderStatus: 'In Production',
        purchase: { material: NOT_AVAILABLE, availability: NOT_AVAILABLE, expectedDate: NOT_AVAILABLE, pendingAction: NOT_AVAILABLE },
        production: { status: NOT_AVAILABLE, completion: NOT_AVAILABLE, targetDate: NOT_AVAILABLE, pendingAction: NOT_AVAILABLE },
        service: { siteStatus: NOT_AVAILABLE, installation: NOT_AVAILABLE, commissioning: NOT_AVAILABLE, pendingIssue: NOT_AVAILABLE, requiredAction: NOT_AVAILABLE },
        dispatch: { status: 'Planned 20-Oct-2026', plannedDate: '20-Oct-2026', pendingRequirement: NOT_AVAILABLE },
        actionRequired: { purchase: NOT_AVAILABLE, production: NOT_AVAILABLE, service: NOT_AVAILABLE, dispatch: NOT_AVAILABLE },
        presentAttributes: ['Order/OA No.', 'Customer', 'Product', 'Quantity', 'Order Status', 'Dispatch'],
        presentDepartments: ['dispatch'],
        sources: ['Sales_Report.xlsx'],
        conflicts: [],
        isCritical: false,
        pendingDepartments: [],
        confidence: 'Confirmed',
      }
    ];

    const listB: OrderRecord[] = [
      {
        orderId: 'OA 04',
        customer: 'Apex Industries',
        product: 'Industrial Chiller',
        quantity: '5 Nos',
        orderStatus: 'Delayed',
        purchase: { material: NOT_AVAILABLE, availability: NOT_AVAILABLE, expectedDate: NOT_AVAILABLE, pendingAction: NOT_AVAILABLE },
        production: { status: NOT_AVAILABLE, completion: NOT_AVAILABLE, targetDate: NOT_AVAILABLE, pendingAction: NOT_AVAILABLE },
        service: { siteStatus: NOT_AVAILABLE, installation: NOT_AVAILABLE, commissioning: NOT_AVAILABLE, pendingIssue: NOT_AVAILABLE, requiredAction: NOT_AVAILABLE },
        dispatch: { status: 'Planned 25-Oct-2026', plannedDate: '25-Oct-2026', pendingRequirement: NOT_AVAILABLE },
        actionRequired: { purchase: NOT_AVAILABLE, production: NOT_AVAILABLE, service: NOT_AVAILABLE, dispatch: NOT_AVAILABLE },
        presentAttributes: ['Order/OA No.', 'Customer', 'Product', 'Quantity', 'Order Status', 'Dispatch'],
        presentDepartments: ['dispatch'],
        sources: ['Dispatch_Log.pdf'],
        conflicts: [],
        isCritical: true,
        pendingDepartments: ['dispatch'],
        confidence: 'Confirmed',
      }
    ];

    const mergedResult = mergeExtractedOrders([listA, listB]);
    expect(mergedResult.hasConflicts).toBe(true);
    expect(mergedResult.orders.length).toBe(1);

    const mergedOrder = mergedResult.orders[0];
    expect(mergedOrder.conflicts.length).toBeGreaterThanOrEqual(2);
    expect(mergedOrder.conflicts.some(c => c.field === 'Quantity')).toBe(true);
  });

  // Test 6: Free text / PDF / DOCX extraction
  it('should parse free text notes and identify OA numbers and department statuses', () => {
    const sampleText = `
      Operational Coordination Meeting Minutes:
      1. Order OA 04 - Customer: M/s Apex Industries. Product: Industrial Chiller 50TR. Quantity: 2 nos.
         Raw Material: PO issued for copper tubes, pending delivery.
         Production: In progress, assembly 60%.
         Service: Site foundation ready.
         Dispatch: Planned for 25-Oct-2026.

      2. Order OA 09 - Customer: Zenith Tech. Product: Cooling Tower.
         Production: Delayed due to fan motor testing snag.
    `;

    const orders = normalizeFreeText(sampleText, 'Minutes.docx');
    expect(orders.length).toBe(2);
    expect(orders[0].orderId).toBe('OA 04');
    expect(orders[0].customer).toBe('M/s Apex Industries');
    expect(orders[0].purchase.availability).toBe('PENDING');
    expect(orders[1].orderId).toBe('OA 09');
    expect(orders[1].isCritical).toBe(true);
  });

  // Test 7: Large Excel files performance simulation (500+ rows)
  it('should process large workbooks with 500+ orders efficiently', () => {
    const ws_data: any[][] = [
      ['Customer/ OA Reference', 'Product', 'Quantity', 'Order Status', 'Dispatch schedule', 'Site Status/ Remark']
    ];
    for (let i = 1; i <= 500; i++) {
      ws_data.push([
        `Customer Corp ${i} OA ${100 + i}`,
        `Industrial Equipment Model ${i % 10}`,
        `${(i % 5) + 1} Nos`,
        i % 4 === 0 ? 'Pending' : 'Completed',
        '30-Nov-2026',
        i % 7 === 0 ? 'Site issue reported' : 'Site ready'
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MassiveData');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const startTime = Date.now();
    const doc = extractFromExcel(buffer, 'LargeData.xlsx');
    const orders = normalizeRows(doc.rows!, 'LargeData.xlsx');
    const merged = mergeExtractedOrders([orders]);
    const report = generateFixedReport(merged.summary, merged.orders);
    const duration = Date.now() - startTime;

    expect(orders.length).toBe(500);
    expect(merged.summary.totalOrders).toBe(500);
    expect(report.length).toBeGreaterThan(10000);
    expect(duration).toBeLessThan(3000);
  });
});
