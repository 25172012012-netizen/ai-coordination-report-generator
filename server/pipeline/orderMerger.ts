import { OrderRecord, OverallSummary, ConflictItem, NOT_AVAILABLE } from '../types.js';

function normalizeIdKey(id: string): string {
  if (!id || id === NOT_AVAILABLE) return '';
  return id.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeFieldValue(v: any): string {
  if (v === undefined || v === null) return '';
  return String(v).trim().toLowerCase();
}

/**
 * Merges orders from multiple extracted sources, detecting cross-document conflicts
 * and consolidating department progress and attributes.
 */
export function mergeExtractedOrders(orderLists: OrderRecord[][]): {
  orders: OrderRecord[];
  summary: OverallSummary;
  hasConflicts: boolean;
} {
  const mergedMap = new Map<string, OrderRecord>();
  const unkeyedOrders: OrderRecord[] = [];

  for (const list of orderLists) {
    for (const order of list) {
      const idKey = normalizeIdKey(order.orderId);
      const fallbackKey = order.customer !== NOT_AVAILABLE && order.product !== NOT_AVAILABLE
        ? `cust_${normalizeIdKey(order.customer)}_${normalizeIdKey(order.product)}`
        : '';

      const matchKey = idKey || fallbackKey;

      if (!matchKey) {
        unkeyedOrders.push(order);
        continue;
      }

      const existing = mergedMap.get(matchKey);

      if (!existing) {
        mergedMap.set(matchKey, JSON.parse(JSON.stringify(order)));
      } else {
        mergeSingleOrder(existing, order);
      }
    }
  }

  const allMerged = [...mergedMap.values(), ...unkeyedOrders];

  // Discover all active departments across the uploaded documents
  const allActiveDeptsSet = new Set<('purchase' | 'production' | 'service' | 'dispatch')>();
  allMerged.forEach(o => {
    (o.presentDepartments || []).forEach(d => allActiveDeptsSet.add(d));
  });
  const activeDepartments = Array.from(allActiveDeptsSet);

  // Calculate summary counts
  const summary: OverallSummary = {
    totalOrders: allMerged.length,
    purchasePending: allMerged.filter(o => o.pendingDepartments.includes('purchase')).length,
    productionPending: allMerged.filter(o => o.pendingDepartments.includes('production')).length,
    servicePending: allMerged.filter(o => o.pendingDepartments.includes('service')).length,
    dispatchPending: allMerged.filter(o => o.pendingDepartments.includes('dispatch')).length,
    criticalDelayedOrders: allMerged.filter(o => o.isCritical).length,
    activeDepartments,
  };

  const hasConflicts = allMerged.some(o => o.conflicts.length > 0);

  return {
    orders: allMerged,
    summary,
    hasConflicts,
  };
}

function checkAndMergeField(
  target: OrderRecord,
  source: OrderRecord,
  fieldPath: string[],
  fieldNameLabel: string
) {
  let targetObj: any = target;
  let sourceObj: any = source;

  for (let i = 0; i < fieldPath.length - 1; i++) {
    targetObj = targetObj[fieldPath[i]];
    sourceObj = sourceObj[fieldPath[i]];
  }

  const lastKey = fieldPath[fieldPath.length - 1];
  const targetVal: string = targetObj[lastKey] || NOT_AVAILABLE;
  const sourceVal: string = sourceObj[lastKey] || NOT_AVAILABLE;

  const targetSourceFile = target.sources[0] || 'Document A';
  const incomingSourceFile = source.sources[0] || 'Document B';

  if (targetVal === NOT_AVAILABLE && sourceVal !== NOT_AVAILABLE) {
    targetObj[lastKey] = sourceVal;
  } else if (targetVal !== NOT_AVAILABLE && sourceVal !== NOT_AVAILABLE) {
    if (normalizeFieldValue(targetVal) !== normalizeFieldValue(sourceVal)) {
      const existingConflict = target.conflicts.find(c => c.field === fieldNameLabel);
      if (existingConflict) {
        if (!existingConflict.values.some(v => v.source === incomingSourceFile && v.value === sourceVal)) {
          existingConflict.values.push({ source: incomingSourceFile, value: sourceVal });
        }
      } else {
        target.conflicts.push({
          field: fieldNameLabel,
          description: `Different values reported across documents for ${fieldNameLabel}`,
          values: [
            { source: targetSourceFile, value: targetVal },
            { source: incomingSourceFile, value: sourceVal },
          ],
        });
      }
    }
  }
}

function mergeSingleOrder(target: OrderRecord, incoming: OrderRecord) {
  // Merge sources
  for (const src of incoming.sources) {
    if (!target.sources.includes(src)) {
      target.sources.push(src);
    }
  }

  // Merge present attributes & departments
  for (const attr of incoming.presentAttributes || []) {
    if (!target.presentAttributes.includes(attr)) {
      target.presentAttributes.push(attr);
    }
  }
  for (const dept of incoming.presentDepartments || []) {
    if (!target.presentDepartments.includes(dept)) {
      target.presentDepartments.push(dept);
    }
  }

  // Merge custom attributes
  if (incoming.customAttributes) {
    target.customAttributes = {
      ...(target.customAttributes || {}),
      ...incoming.customAttributes,
    };
  }

  // Check and merge top-level fields
  checkAndMergeField(target, incoming, ['customer'], 'Customer');
  checkAndMergeField(target, incoming, ['product'], 'Product');
  checkAndMergeField(target, incoming, ['quantity'], 'Quantity');
  checkAndMergeField(target, incoming, ['orderStatus'], 'Order Status');

  // Check and merge Purchase
  checkAndMergeField(target, incoming, ['purchase', 'material'], 'Purchase Material');
  checkAndMergeField(target, incoming, ['purchase', 'availability'], 'Purchase Availability');
  checkAndMergeField(target, incoming, ['purchase', 'expectedDate'], 'Purchase Expected Date');
  checkAndMergeField(target, incoming, ['purchase', 'pendingAction'], 'Purchase Pending Action');

  // Check and merge Production
  checkAndMergeField(target, incoming, ['production', 'status'], 'Production Status');
  checkAndMergeField(target, incoming, ['production', 'completion'], 'Production Completion');
  checkAndMergeField(target, incoming, ['production', 'targetDate'], 'Production Target Date');
  checkAndMergeField(target, incoming, ['production', 'pendingAction'], 'Production Pending Action');

  // Check and merge Service
  checkAndMergeField(target, incoming, ['service', 'siteStatus'], 'Service Site Status');
  checkAndMergeField(target, incoming, ['service', 'installation'], 'Service Installation');
  checkAndMergeField(target, incoming, ['service', 'commissioning'], 'Service Commissioning');
  checkAndMergeField(target, incoming, ['service', 'pendingIssue'], 'Service Pending Issue');
  checkAndMergeField(target, incoming, ['service', 'requiredAction'], 'Service Required Action');

  // Check and merge Dispatch
  checkAndMergeField(target, incoming, ['dispatch', 'status'], 'Dispatch Status');
  checkAndMergeField(target, incoming, ['dispatch', 'plannedDate'], 'Dispatch Planned Date');
  checkAndMergeField(target, incoming, ['dispatch', 'pendingRequirement'], 'Dispatch Pending Requirement');

  // Check and merge Action Required
  checkAndMergeField(target, incoming, ['actionRequired', 'purchase'], 'Action: Purchase');
  checkAndMergeField(target, incoming, ['actionRequired', 'production'], 'Action: Production');
  checkAndMergeField(target, incoming, ['actionRequired', 'service'], 'Action: Service');
  checkAndMergeField(target, incoming, ['actionRequired', 'dispatch'], 'Action: Dispatch');

  // Consolidate pending departments
  for (const dept of incoming.pendingDepartments) {
    if (!target.pendingDepartments.includes(dept)) {
      target.pendingDepartments.push(dept);
    }
  }

  if (target.pendingDepartments.length > 0 || incoming.isCritical) {
    target.isCritical = true;
  }
}
