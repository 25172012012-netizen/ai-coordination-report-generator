import { OrderRecord, OverallSummary, NOT_AVAILABLE } from '../types.js';

function cleanValue(val: string | undefined): string {
  if (!val || val.trim() === '' || val === 'undefined' || val === 'null') {
    return NOT_AVAILABLE;
  }
  return val.trim();
}

/**
 * Generates the Operational Coordination Report.
 * Dynamically includes ONLY the attributes, columns, and departments
 * that were present in the uploaded document(s), never adding extra unmentioned sections.
 */
export function generateFixedReport(summary: OverallSummary, orders: OrderRecord[]): string {
  const lines: string[] = [];

  // 1. OVERALL COORDINATION SUMMARY
  lines.push('OVERALL COORDINATION SUMMARY');
  lines.push('');
  lines.push(`Total Orders: ${summary.totalOrders}`);

  // Only include pending counts for departments actually present in the uploaded document(s)
  const activeDepts = summary.activeDepartments && summary.activeDepartments.length > 0
    ? summary.activeDepartments
    : ['purchase', 'production', 'service', 'dispatch'];

  if (activeDepts.includes('purchase')) {
    lines.push(`Purchase Pending: ${summary.purchasePending}`);
  }
  if (activeDepts.includes('production')) {
    lines.push(`Production Pending: ${summary.productionPending}`);
  }
  if (activeDepts.includes('service')) {
    lines.push(`Service Pending: ${summary.servicePending}`);
  }
  if (activeDepts.includes('dispatch')) {
    lines.push(`Dispatch Pending: ${summary.dispatchPending}`);
  }

  lines.push(`Critical/Delayed Orders: ${summary.criticalDelayedOrders}`);
  lines.push('');

  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // 2. ORDER SECTIONS
  orders.forEach((order, index) => {
    const presentAttrs = order.presentAttributes || [];
    const presentDepts = order.presentDepartments || [];

    lines.push('==================================================');
    lines.push('');
    lines.push(`ORDER COORDINATION REPORT — ORDER ${index + 1} OF ${orders.length}`);
    lines.push('');
    lines.push(`Date: ${order.date || todayStr}`);
    lines.push('');
    lines.push('==================================================');
    lines.push('ORDER DETAILS');
    lines.push('');

    // Only render order detail attributes if present in uploaded document or populated
    if (presentAttrs.includes('Order/OA No.') || order.orderId !== NOT_AVAILABLE || presentAttrs.length === 0) {
      lines.push(`Order/OA No.: ${cleanValue(order.orderId)}`);
    }
    if (presentAttrs.includes('Customer') || order.customer !== NOT_AVAILABLE || presentAttrs.length === 0) {
      lines.push(`Customer: ${cleanValue(order.customer)}`);
    }
    if (presentAttrs.includes('Product') || order.product !== NOT_AVAILABLE || presentAttrs.length === 0) {
      lines.push(`Product: ${cleanValue(order.product)}`);
    }
    if (presentAttrs.includes('Quantity') || order.quantity !== NOT_AVAILABLE) {
      lines.push(`Quantity: ${cleanValue(order.quantity)}`);
    }
    if (presentAttrs.includes('Order Status') || order.orderStatus !== NOT_AVAILABLE || presentAttrs.length === 0) {
      lines.push(`Order Status: ${cleanValue(order.orderStatus)}`);
    }

    // Extra custom columns from uploaded file
    if (order.customAttributes) {
      for (const [colName, colVal] of Object.entries(order.customAttributes)) {
        lines.push(`${colName}: ${cleanValue(colVal)}`);
      }
    }

    lines.push('');

    // PURCHASE SECTION - Only if present in uploaded document
    if (presentDepts.includes('purchase')) {
      lines.push('==================================================');
      lines.push('PURCHASE');
      lines.push('');
      if (presentAttrs.includes('Material') || order.purchase.material !== NOT_AVAILABLE) {
        lines.push(`• Material: ${cleanValue(order.purchase.material)}`);
      }
      if (presentAttrs.includes('Availability') || order.purchase.availability !== NOT_AVAILABLE) {
        lines.push(`• Availability: ${cleanValue(order.purchase.availability)}`);
      }
      if (presentAttrs.includes('Expected Date') || order.purchase.expectedDate !== NOT_AVAILABLE) {
        lines.push(`• Expected Date: ${cleanValue(order.purchase.expectedDate)}`);
      }
      lines.push(`• Pending Action: ${cleanValue(order.purchase.pendingAction)}`);
      lines.push('');
    }

    // PRODUCTION SECTION - Only if present in uploaded document
    if (presentDepts.includes('production')) {
      lines.push('==================================================');
      lines.push('PRODUCTION');
      lines.push('');
      lines.push(`• Status: ${cleanValue(order.production.status)}`);
      if (presentAttrs.includes('Completion') || order.production.completion !== NOT_AVAILABLE) {
        lines.push(`• Completion: ${cleanValue(order.production.completion)}`);
      }
      if (presentAttrs.includes('Target Date') || order.production.targetDate !== NOT_AVAILABLE) {
        lines.push(`• Target Date: ${cleanValue(order.production.targetDate)}`);
      }
      lines.push(`• Pending Action: ${cleanValue(order.production.pendingAction)}`);
      lines.push('');
    }

    // SERVICE SECTION - Only if present in uploaded document
    if (presentDepts.includes('service')) {
      lines.push('==================================================');
      lines.push('SERVICE');
      lines.push('');
      lines.push(`• Site Status: ${cleanValue(order.service.siteStatus)}`);
      if (order.service.installation !== NOT_AVAILABLE) {
        lines.push(`• Installation: ${cleanValue(order.service.installation)}`);
      }
      if (order.service.commissioning !== NOT_AVAILABLE) {
        lines.push(`• Commissioning: ${cleanValue(order.service.commissioning)}`);
      }
      if (order.service.pendingIssue !== NOT_AVAILABLE) {
        lines.push(`• Pending Issue: ${cleanValue(order.service.pendingIssue)}`);
      }
      lines.push(`• Required Action: ${cleanValue(order.service.requiredAction)}`);
      lines.push('');
    }

    // DISPATCH SECTION - Only if present in uploaded document
    if (presentDepts.includes('dispatch')) {
      lines.push('==================================================');
      lines.push('DISPATCH');
      lines.push('');
      lines.push(`• Status: ${cleanValue(order.dispatch.status)}`);
      if (order.dispatch.plannedDate !== NOT_AVAILABLE) {
        lines.push(`• Planned Date: ${cleanValue(order.dispatch.plannedDate)}`);
      }
      if (order.dispatch.pendingRequirement !== NOT_AVAILABLE) {
        lines.push(`• Pending Requirement: ${cleanValue(order.dispatch.pendingRequirement)}`);
      }
      lines.push('');
    }

    // ACTION REQUIRED - Only list departments present in uploaded document
    lines.push('==================================================');
    lines.push('ACTION REQUIRED');
    lines.push('');

    let actionIndex = 1;
    if (presentDepts.includes('purchase')) {
      lines.push(`${actionIndex++}. PURCHASE: ${cleanValue(order.actionRequired.purchase)}`);
    }
    if (presentDepts.includes('production')) {
      lines.push(`${actionIndex++}. PRODUCTION: ${cleanValue(order.actionRequired.production)}`);
    }
    if (presentDepts.includes('service')) {
      lines.push(`${actionIndex++}. SERVICE: ${cleanValue(order.actionRequired.service)}`);
    }
    if (presentDepts.includes('dispatch')) {
      lines.push(`${actionIndex++}. DISPATCH: ${cleanValue(order.actionRequired.dispatch)}`);
    }

    if (presentDepts.length === 0) {
      lines.push('1. GENERAL: No departmental actions identified in uploaded document.');
    }

    lines.push('');

    if (order.conflicts && order.conflicts.length > 0) {
      lines.push('CONFLICT NOTICES:');
      order.conflicts.forEach(c => {
        lines.push(`[!] Conflict on ${c.field}:`);
        c.values.forEach(v => lines.push(`    - ${v.source}: "${v.value}"`));
      });
      lines.push('');
    }

    if (order.sources && order.sources.length > 0) {
      lines.push(`Source Documents: ${order.sources.join(', ')}`);
    }

    lines.push('==================================================');
    lines.push('');
  });

  return lines.join('\n');
}
