import { OrderRecord, NOT_AVAILABLE } from '../types.js';

// Helper to sanitize key matching
function cleanKey(k: string): string {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extract best match value from a row object for given possible column keys.
 */
export function getRowValue(row: Record<string, any>, possibleKeys: string[]): string {
  const rowKeys = Object.keys(row).filter(k => !k.startsWith('_'));

  // 1. Exact match first
  for (const target of possibleKeys) {
    const targetClean = cleanKey(target);
    const foundKey = rowKeys.find(k => cleanKey(k) === targetClean);
    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = String(row[foundKey]).trim();
      if (val && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'n/a') {
        return val;
      }
    }
  }

  // 2. Partial match (header contains target key)
  for (const target of possibleKeys) {
    const targetClean = cleanKey(target);
    if (targetClean.length < 3) continue;

    const foundKey = rowKeys.find(k => {
      const kClean = cleanKey(k);
      return kClean.includes(targetClean);
    });

    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
      const val = String(row[foundKey]).trim();
      if (val && val.toLowerCase() !== 'null' && val.toLowerCase() !== 'undefined' && val.toLowerCase() !== 'n/a') {
        return val;
      }
    }
  }

  return '';
}

/**
 * Canonicalize OA / Order / PO / Job / Reference numbers and separate customer name
 */
export function extractOrderIdentifier(rawRef: string): { orderId: string; customerRemainder: string } {
  if (!rawRef) return { orderId: '', customerRemainder: '' };

  const oaMatch = rawRef.match(/(?:(?:Order\s*(?:No\.?|Number)?\s*)?OA|Order(?:\s*No\.?|\s*Number)?|(?:PO|SO|WO|Job|Project|Ref|Task|Ticket|Challan|Invoice)(?:\s*No\.?)?)\s*[-:#./]?\s*([0-9]+[A-Za-z0-9-]*)/i);
  if (oaMatch) {
    const fullMatch = oaMatch[0].trim();
    let canonical = fullMatch.replace(/\s+/g, ' ');

    if (/(?:order\s*)?oa\s*[-:#.]?\s*\d+/i.test(canonical)) {
      canonical = canonical.replace(/^(?:order\s*)?oa\s*[-:#.]?\s*/i, 'OA ');
    } else if (/^order\s*[-:#.]?\s*\d+/i.test(canonical)) {
      canonical = canonical.replace(/^order\s*[-:#.]?\s*/i, 'Order ');
    }

    const remainder = rawRef.replace(oaMatch[0], '').replace(/^[\s,/-]+|[\s,/-]+$/g, '').trim();
    return { orderId: canonical, customerRemainder: remainder };
  }

  if (/^[A-Z0-9-]{2,16}$/i.test(rawRef.trim()) && /\d/.test(rawRef.trim())) {
    return { orderId: rawRef.trim(), customerRemainder: '' };
  }

  return { orderId: '', customerRemainder: rawRef.trim() };
}

// Determine if a status or remark indicates a pending/delay condition
export function isPendingOrDelayed(text: string): boolean {
  if (!text || text === NOT_AVAILABLE) return false;
  const pendingRegex = /\b(pending|waiting|delay|delayed|hold|not issued|part|balance|awaited|issue|problem|stuck|behind|critical|shortage|unread|unready|not ready|blocked|open)\b/i;
  return pendingRegex.test(text);
}

/**
 * Universal Tabular Row Normalizer.
 * Works on ANY uploaded spreadsheet or table format.
 */
export function normalizeRows(rows: Record<string, any>[], sourceFilename: string): OrderRecord[] {
  const orders: OrderRecord[] = [];
  const allRowKeys = Array.from(new Set(rows.flatMap(r => Object.keys(r).filter(k => !k.startsWith('_')))));

  // Detect presence of column categories across sheet
  const hasRefCol = allRowKeys.some(k => [
    'customeroa', 'oareference', 'customeroareference', 'orderoa', 'orderno', 'ordernumber',
    'oano', 'oanumber', 'ponumber', 'sonumber', 'wonumber', 'jobnumber', 'projectname',
    'trackingno', 'serialno', 'workorder', 'jobcard'
  ].some(t => cleanKey(k).includes(t)));

  const hasCustCol = allRowKeys.some(k => [
    'customername', 'partyname', 'clientname', 'client', 'buyer', 'account', 'vendorname', 'vendor', 'supplier', 'company'
  ].some(t => cleanKey(k).includes(t)));

  const hasProdCol = allRowKeys.some(k => [
    'product', 'itemdescription', 'itemname', 'equipment', 'machine', 'part', 'taskname', 'activity', 'scope'
  ].some(t => cleanKey(k).includes(t)) || cleanKey(k) === 'item' || cleanKey(k) === 'task');

  const hasQtyCol = allRowKeys.some(k => [
    'quantity', 'qty', 'orderedqty', 'units', 'nos', 'pieces', 'count', 'amount', 'volume', 'weight'
  ].some(t => cleanKey(k).includes(t)));

  const hasStatusCol = allRowKeys.some(k => [
    'orderstatus', 'overallstatus', 'stage', 'mfgstage', 'progress', 'state', 'condition'
  ].some(t => cleanKey(k).includes(t)) || cleanKey(k) === 'status');

  // Purchase columns
  const hasPurchaseMatCol = allRowKeys.some(k => ['rawmaterial', 'procurement', 'boughtout'].some(t => cleanKey(k).includes(t)) || cleanKey(k) === 'material');
  const hasPurchaseStatCol = allRowKeys.some(k => ['purchasestatus', 'rmavailability', 'vendorstatus', 'postatus', 'procurementstatus'].some(t => cleanKey(k).includes(t)));
  const hasPurchaseDateCol = allRowKeys.some(k => ['expectedmaterialdate', 'purchasedate', 'rmdate', 'podate'].some(t => cleanKey(k).includes(t)));
  const hasPurchaseCol = hasPurchaseMatCol || hasPurchaseStatCol || hasPurchaseDateCol;

  // Production columns
  const hasProdStatCol = allRowKeys.some(k => ['productionstatus', 'manufacturingstatus', 'fabstatus', 'assemblystatus', 'shopfloor', 'mfgstatus'].some(t => cleanKey(k).includes(t)));
  const hasProdCompCol = allRowKeys.some(k => ['completion', 'progress', 'productionqty', 'assembledqty', 'complete'].some(t => cleanKey(k).includes(t)));
  const hasProdDateCol = allRowKeys.some(k => ['targetdate', 'productiontarget', 'completiondate', 'mfgdate'].some(t => cleanKey(k).includes(t)));
  const hasProductionCol = hasProdStatCol || hasProdCompCol || hasProdDateCol;

  // Service columns
  const hasServiceCol = allRowKeys.some(k => ['sitestatus', 'siteremark', 'servicestatus', 'installation', 'commissioning', 'fieldstatus', 'sitereadiness', 'siteremarks', 'snag', 'maintenance'].some(t => cleanKey(k).includes(t)));

  // Dispatch columns
  const hasDispatchCol = allRowKeys.some(k => ['dispatchschedule', 'dispatchdate', 'planneddispatch', 'deliverysch', 'deliveryschedule', 'invoicestatus', 'paymentstatus', 'dispatchstatus', 'shippingdate', 'logistics', 'transport'].some(t => cleanKey(k).includes(t)));

  let rowIndex = 0;
  for (const row of rows) {
    rowIndex++;

    // 1. Order / Identifier Reference
    const rawRef = getRowValue(row, [
      'customer oa reference', 'customeroareference', 'customer / oa reference',
      'customer / oa', 'customeroa', 'customer oa',
      'oa reference', 'oareference', 'oa ref', 'order oa', 'order no', 'orderno',
      'order number', 'ordernumber', 'oa no', 'oano', 'oa number', 'oa',
      'po number', 'ponumber', 'po', 'so number', 'sonumber', 'so',
      'wo number', 'wonumber', 'work order', 'job number', 'job no', 'job',
      'project name', 'project', 'ref no', 'reference', 'ref', 'ticket', 'tracking no',
      'serial no', 'code', 'id', 'item no', 'sl no', 'task name', 'task'
    ]);

    const { orderId: extractedId, customerRemainder } = extractOrderIdentifier(rawRef);
    const standaloneCustomer = getRowValue(row, [
      'customer name', 'customername', 'party name', 'partyname', 'client name', 'clientname',
      'client', 'buyer', 'account', 'vendor name', 'vendor', 'supplier', 'company', 'organization'
    ]) || (Object.keys(row).some(k => cleanKey(k) === 'customer') ? String(row[Object.keys(row).find(k => cleanKey(k) === 'customer')!]).trim() : '');

    let finalOrderId = extractedId || rawRef;
    let finalCustomer = customerRemainder || standaloneCustomer;

    const productVal = getRowValue(row, [
      'product', 'product name', 'item', 'item name', 'item description', 'itemdescription',
      'description', 'model', 'equipment', 'machine', 'part', 'service', 'task', 'activity', 'scope'
    ]) || NOT_AVAILABLE;

    const quantityVal = getRowValue(row, [
      'quantity', 'qty', 'qty ordered', 'qtyordered', 'ordered qty', 'units', 'nos', 'pieces', 'count', 'amount', 'volume', 'weight'
    ]) || NOT_AVAILABLE;

    const orderStatusVal = getRowValue(row, [
      'order status', 'orderstatus', 'overall status', 'status', 'stage', 'mfg stage', 'mfgstage', 'progress', 'state', 'condition'
    ]) || NOT_AVAILABLE;

    if (!finalOrderId || finalOrderId === NOT_AVAILABLE) {
      if (finalCustomer !== NOT_AVAILABLE) {
        finalOrderId = `Order #${rowIndex} (${finalCustomer})`;
      } else if (productVal !== NOT_AVAILABLE) {
        finalOrderId = `Item #${rowIndex} (${productVal.slice(0, 20)})`;
      } else {
        finalOrderId = `Entry #${rowIndex}`;
      }
    }

    if (!finalCustomer) finalCustomer = NOT_AVAILABLE;

    // Track present attributes
    const presentAttributes: string[] = [];
    if (hasRefCol || (finalOrderId && !finalOrderId.startsWith('Entry #'))) presentAttributes.push('Order/OA No.');
    if (hasCustCol || finalCustomer !== NOT_AVAILABLE) presentAttributes.push('Customer');
    if (hasProdCol || productVal !== NOT_AVAILABLE) presentAttributes.push('Product');
    if (hasQtyCol || quantityVal !== NOT_AVAILABLE) presentAttributes.push('Quantity');
    if (hasStatusCol || orderStatusVal !== NOT_AVAILABLE) presentAttributes.push('Order Status');

    // 3. Purchase data
    const rawMaterial = getRowValue(row, ['raw material', 'rawmaterial', 'procurement', 'bought out', 'component']);
    const rawPurchaseStatus = getRowValue(row, ['purchase status', 'purchasestatus', 'purchase availability', 'rm availability', 'vendor status', 'po status']);
    const rawPurchaseDate = getRowValue(row, ['expected material date', 'purchase date', 'rm date', 'po date', 'delivery date']);
    const rawPurchaseAction = getRowValue(row, ['purchase action', 'purchase remark', 'procurement action']);

    const purchaseMaterial = rawMaterial || (hasPurchaseCol ? getRowValue(row, ['material']) : '') || NOT_AVAILABLE;
    let purchaseAvailability = rawPurchaseStatus || NOT_AVAILABLE;
    if (purchaseAvailability !== NOT_AVAILABLE) {
      if (/avail|in stock|received|ready/i.test(purchaseAvailability)) purchaseAvailability = 'AVAILABLE';
      else if (/part/i.test(purchaseAvailability)) purchaseAvailability = 'PARTIAL';
      else if (/pend|wait|delay|po issued|open/i.test(purchaseAvailability)) purchaseAvailability = 'PENDING';
    }
    const purchaseExpectedDate = rawPurchaseDate || NOT_AVAILABLE;
    let purchasePendingAction = rawPurchaseAction || NOT_AVAILABLE;
    if (purchasePendingAction === NOT_AVAILABLE && isPendingOrDelayed(rawPurchaseStatus || rawMaterial)) {
      purchasePendingAction = `Follow up on procurement (${rawPurchaseStatus || rawMaterial})`;
    }

    // 4. Production data
    const rawProdStatus = getRowValue(row, ['production status', 'productionstatus', 'manufacturing status', 'fab status', 'assembly status', 'shop floor', 'mfg status']);
    const rawProdCompletion = getRowValue(row, ['completion', 'progress', 'production qty', 'assembled qty', '% complete', 'percentage']);
    const rawProdDate = getRowValue(row, ['production target', 'completion date', 'mfg date', 'due date']);
    const rawProdAction = getRowValue(row, ['production action', 'production remark', 'mfg action']);

    const prodStatus = rawProdStatus || NOT_AVAILABLE;
    const prodCompletion = rawProdCompletion || NOT_AVAILABLE;
    const prodTargetDate = rawProdDate || NOT_AVAILABLE;
    let prodPendingAction = rawProdAction || NOT_AVAILABLE;
    if (prodPendingAction === NOT_AVAILABLE && isPendingOrDelayed(rawProdStatus)) {
      prodPendingAction = `Expedite production: ${rawProdStatus}`;
    }

    // 5. Service data
    const rawSiteStatus = getRowValue(row, [
      'site status / remark', 'sitestatusremark', 'site status', 'sitestatus', 'site remark', 'siteremark',
      'service status', 'servicestatus', 'field status', 'site readiness', 'site remarks', 'snag', 'maintenance'
    ]);
    const rawInstallation = getRowValue(row, ['installation', 'erection', 'installation status', 'erection status']);
    const rawCommissioning = getRowValue(row, ['commissioning', 'testing & commissioning', 'commission status']);
    const rawServiceIssue = getRowValue(row, ['pending issue', 'service issue', 'site issue', 'snags']);
    const rawServiceAction = getRowValue(row, ['service action', 'required action', 'site action']);

    const siteStatus = rawSiteStatus || NOT_AVAILABLE;
    let installation = rawInstallation || NOT_AVAILABLE;
    let commissioning = rawCommissioning || NOT_AVAILABLE;
    let pendingIssue = rawServiceIssue || NOT_AVAILABLE;
    let requiredServiceAction = rawServiceAction || NOT_AVAILABLE;

    if (siteStatus !== NOT_AVAILABLE) {
      if (installation === NOT_AVAILABLE && /erection|install/i.test(siteStatus)) {
        installation = siteStatus;
      }
      if (commissioning === NOT_AVAILABLE && /commission/i.test(siteStatus)) {
        commissioning = siteStatus;
      }
      if (pendingIssue === NOT_AVAILABLE && isPendingOrDelayed(siteStatus)) {
        pendingIssue = siteStatus;
      }
      if (requiredServiceAction === NOT_AVAILABLE && isPendingOrDelayed(siteStatus)) {
        requiredServiceAction = `Coordinate with site / customer: ${siteStatus}`;
      }
    }

    // 6. Dispatch data
    const rawDispatchSchedule = getRowValue(row, [
      'dispatch schedule', 'dispatchschedule', 'dispatch date', 'planned dispatch', 'deliverysch',
      'delivery sch', 'delivery schedule', 'shipping date', 'logistics', 'transport'
    ]);
    const rawInvoice = getRowValue(row, ['invoice status', 'invoicestatus', 'invoice', 'billing status', 'bill status']);
    const rawPayment = getRowValue(row, ['payment status', 'paymentstatus', 'payment', 'commercial status', 'collection']);
    const rawDispatchStatus = getRowValue(row, ['dispatch status', 'dispatchstatus', 'shipping status']);

    let dispatchStatus = rawDispatchStatus || rawDispatchSchedule || rawInvoice || NOT_AVAILABLE;
    const dispatchPlannedDate = rawDispatchSchedule || NOT_AVAILABLE;

    const dispatchPendingReqs: string[] = [];
    if (rawInvoice && /no|not issued|pending/i.test(rawInvoice)) {
      dispatchPendingReqs.push(`Invoice: ${rawInvoice}`);
    }
    if (rawPayment && /balance|advance|pending|hold/i.test(rawPayment)) {
      dispatchPendingReqs.push(`Payment: ${rawPayment}`);
    }
    if (siteStatus !== NOT_AVAILABLE && /part dispatch|dispatch started/i.test(siteStatus)) {
      dispatchPendingReqs.push('Part dispatch recorded; confirm balance dispatch');
    }
    if (rawDispatchSchedule && isPendingOrDelayed(rawDispatchSchedule)) {
      dispatchPendingReqs.push(`Schedule: ${rawDispatchSchedule}`);
    }

    const pendingRequirement = dispatchPendingReqs.length > 0 ? dispatchPendingReqs.join('; ') : NOT_AVAILABLE;

    let dispatchAction = NOT_AVAILABLE;
    if (dispatchPendingReqs.length > 0) {
      dispatchAction = `Resolve commercial/dispatch clearances (${dispatchPendingReqs.join(', ')})`;
    } else if (dispatchStatus !== NOT_AVAILABLE && isPendingOrDelayed(dispatchStatus)) {
      dispatchAction = 'Confirm dispatch readiness and shipping schedule.';
    }

    // Determine present departments
    const presentDepartments: ('purchase' | 'production' | 'service' | 'dispatch')[] = [];
    if (hasPurchaseCol || (purchaseMaterial !== NOT_AVAILABLE && purchaseMaterial !== '') || purchaseAvailability !== NOT_AVAILABLE || purchaseExpectedDate !== NOT_AVAILABLE) {
      presentDepartments.push('purchase');
      if (hasPurchaseMatCol || purchaseMaterial !== NOT_AVAILABLE) presentAttributes.push('Material');
      if (hasPurchaseStatCol || purchaseAvailability !== NOT_AVAILABLE) presentAttributes.push('Availability');
      if (hasPurchaseDateCol || purchaseExpectedDate !== NOT_AVAILABLE) presentAttributes.push('Expected Date');
      presentAttributes.push('Purchase Pending Action');
    }
    if (hasProductionCol || (prodStatus !== NOT_AVAILABLE && prodStatus !== '') || prodCompletion !== NOT_AVAILABLE || prodTargetDate !== NOT_AVAILABLE) {
      presentDepartments.push('production');
      if (hasProdStatCol || prodStatus !== NOT_AVAILABLE) presentAttributes.push('Production Status');
      if (hasProdCompCol || prodCompletion !== NOT_AVAILABLE) presentAttributes.push('Completion');
      if (hasProdDateCol || prodTargetDate !== NOT_AVAILABLE) presentAttributes.push('Target Date');
      presentAttributes.push('Production Pending Action');
    }
    if (hasServiceCol || (siteStatus !== NOT_AVAILABLE && siteStatus !== '') || installation !== NOT_AVAILABLE || commissioning !== NOT_AVAILABLE) {
      presentDepartments.push('service');
      if (siteStatus !== NOT_AVAILABLE) presentAttributes.push('Site Status');
      if (installation !== NOT_AVAILABLE) presentAttributes.push('Installation');
      if (commissioning !== NOT_AVAILABLE) presentAttributes.push('Commissioning');
      if (pendingIssue !== NOT_AVAILABLE) presentAttributes.push('Pending Issue');
      presentAttributes.push('Required Action');
    }
    if (hasDispatchCol || (dispatchStatus !== NOT_AVAILABLE && dispatchStatus !== '') || dispatchPlannedDate !== NOT_AVAILABLE || pendingRequirement !== NOT_AVAILABLE) {
      presentDepartments.push('dispatch');
      if (dispatchStatus !== NOT_AVAILABLE) presentAttributes.push('Dispatch Status');
      if (dispatchPlannedDate !== NOT_AVAILABLE) presentAttributes.push('Planned Date');
      if (pendingRequirement !== NOT_AVAILABLE) presentAttributes.push('Pending Requirement');
    }

    // 7. Action Required
    const actionRequired = {
      purchase: purchasePendingAction,
      production: prodPendingAction,
      service: requiredServiceAction,
      dispatch: dispatchAction,
    };

    // 8. Pending departments & Critical status calculation
    const pendingDepartments: ('purchase' | 'production' | 'service' | 'dispatch')[] = [];
    if (isPendingOrDelayed(purchaseMaterial) || isPendingOrDelayed(purchaseAvailability) || purchasePendingAction !== NOT_AVAILABLE) {
      pendingDepartments.push('purchase');
    }
    if (isPendingOrDelayed(prodStatus) || isPendingOrDelayed(prodCompletion) || prodPendingAction !== NOT_AVAILABLE) {
      pendingDepartments.push('production');
    }
    if (isPendingOrDelayed(siteStatus) || isPendingOrDelayed(installation) || isPendingOrDelayed(commissioning) || pendingIssue !== NOT_AVAILABLE || requiredServiceAction !== NOT_AVAILABLE) {
      pendingDepartments.push('service');
    }
    if (isPendingOrDelayed(dispatchStatus) || pendingRequirement !== NOT_AVAILABLE || dispatchAction !== NOT_AVAILABLE) {
      pendingDepartments.push('dispatch');
    }

    const isCritical = pendingDepartments.length > 0 || isPendingOrDelayed(orderStatusVal);

    // Capture extra columns
    const customAttributes: Record<string, string> = {};
    const standardMatchedKeys = [
      'customer', 'oa', 'product', 'qty', 'quantity', 'order status', 'status',
      'material', 'purchase', 'production', 'site', 'service', 'dispatch', 'invoice', 'payment'
    ];
    for (const key of allRowKeys) {
      const isStandard = standardMatchedKeys.some(term => cleanKey(key).includes(cleanKey(term)));
      const isAnonymousOrIndex = /^column_?\d+$/i.test(key) || /^(?:sr|s|sl|serial)\s*[-.:]?\s*no\.?$/i.test(key);
      if (!isStandard && !isAnonymousOrIndex && row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
        customAttributes[key] = String(row[key]).trim();
        if (!presentAttributes.includes(key)) presentAttributes.push(key);
      }
    }

    orders.push({
      orderId: finalOrderId,
      customer: finalCustomer,
      product: productVal,
      quantity: quantityVal,
      orderStatus: orderStatusVal,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      purchase: {
        material: purchaseMaterial,
        availability: purchaseAvailability,
        expectedDate: purchaseExpectedDate,
        pendingAction: purchasePendingAction,
      },
      production: {
        status: prodStatus,
        completion: prodCompletion,
        targetDate: prodTargetDate,
        pendingAction: prodPendingAction,
      },
      service: {
        siteStatus: siteStatus,
        installation: installation,
        commissioning: commissioning,
        pendingIssue: pendingIssue,
        requiredAction: requiredServiceAction,
      },
      dispatch: {
        status: dispatchStatus,
        plannedDate: dispatchPlannedDate,
        pendingRequirement: pendingRequirement,
        action: dispatchAction,
      },
      actionRequired,
      presentAttributes,
      presentDepartments,
      customAttributes,
      sources: [sourceFilename],
      conflicts: [],
      isCritical,
      pendingDepartments,
      confidence: 'Confirmed (extracted from uploaded data)',
    });
  }

  return orders;
}

/**
 * Universal Free-Form Text / PDF / Word Parser.
 */
export function normalizeFreeText(text: string, sourceFilename: string): OrderRecord[] {
  if (!text || text.trim().length === 0) return [];

  const orders: OrderRecord[] = [];

  // Match standard identifiers (e.g. Order OA 04, PO-8821, WO 102, Job 401)
  const idRegex = /(?:(?:Order\s*(?:No\.?|Number)?\s*)?OA|Order(?:\s*No\.?|\s*Number)?|(?:PO|SO|WO|Job|Project|Task|Item|Ticket|Challan)(?:\s*No\.?)?)\s*[-:#.]?\s*([0-9]+[A-Za-z0-9-]*)/gi;
  const matches = [...text.matchAll(idRegex)];

  if (matches.length === 0) {
    const paragraphs = text.split(/(?:\r?\n){2,}|\n(?=\d+\.|\b(?:Section|Item|Order|Project|Client|Vendor)\b)/i)
      .map(p => p.trim())
      .filter(p => p.length > 20);

    if (paragraphs.length > 1) {
      paragraphs.forEach((para, idx) => {
        const order = parseTextParagraph(para, `Entry ${idx + 1}`, sourceFilename);
        if (order) orders.push(order);
      });
      if (orders.length > 0) return orders;
    }

    const singleOrder = parseTextParagraph(text, sourceFilename.replace(/\.[^/.]+$/, ''), sourceFilename);
    if (singleOrder) {
      orders.push(singleOrder);
    }
    return orders;
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rawId = match[0].trim();
    let canonicalId = rawId.replace(/\s+/g, ' ');
    if (/(?:order\s*)?oa\s*[-:#.]?\s*\d+/i.test(canonicalId)) {
      canonicalId = canonicalId.replace(/^(?:order\s*)?oa\s*[-:#.]?\s*/i, 'OA ');
    } else if (/^order\s*[-:#.]?\s*\d+/i.test(canonicalId)) {
      canonicalId = canonicalId.replace(/^order\s*[-:#.]?\s*/i, 'Order ');
    }

    const startIdx = match.index || 0;
    const endIdx = i < matches.length - 1 ? (matches[i + 1].index || startIdx + 1200) : Math.min(startIdx + 1200, text.length);
    const orderBlock = text.slice(startIdx, endIdx);

    const order = parseTextParagraph(orderBlock, canonicalId, sourceFilename);
    if (order) orders.push(order);
  }

  return orders;
}

function parseTextParagraph(block: string, defaultId: string, sourceFilename: string): OrderRecord {
  const order = createEmptyOrder(defaultId, sourceFilename);
  order.presentAttributes.push('Order/OA No.');

  const custMatch = block.match(/(?:Customer|Client|Party|Vendor|Supplier|M\/s|Company)\s*[:=-]?\s*([^\n\r,;.]+)/i);
  if (custMatch) {
    order.customer = custMatch[0].startsWith('M/s') ? custMatch[0].trim() : custMatch[1].trim();
    order.presentAttributes.push('Customer');
  }

  const prodMatch = block.match(/(?:Product|Item|Model|Machine|Equipment|Description|Task|Project|Activity)\s*[:=-]?\s*([^\n\r,;]+)/i);
  if (prodMatch) {
    order.product = prodMatch[1].trim();
    order.presentAttributes.push('Product');
  }

  const qtyMatch = block.match(/(?:Quantity|Qty|Units|Count)\s*[:=-]?\s*([0-9]+\s*(?:nos|pcs|sets|units|kg|tons|m)?)/i);
  if (qtyMatch) {
    order.quantity = qtyMatch[1].trim();
    order.presentAttributes.push('Quantity');
  }

  const statusMatch = block.match(/(?:Order Status|Overall Status|Status|Stage|Progress)\s*[:=-]?\s*([^\n\r,;]+)/i);
  if (statusMatch) {
    order.orderStatus = statusMatch[1].trim();
    order.presentAttributes.push('Order Status');
  }

  // Purchase
  const purchaseMatch = block.match(/(?:Purchase|Raw Material|Procurement|Material)\s*[:=-]?\s*([^\n\r;]+)/i);
  if (purchaseMatch && !/customer|client/i.test(purchaseMatch[1])) {
    order.purchase.material = purchaseMatch[1].trim();
    order.presentDepartments.push('purchase');
    order.presentAttributes.push('Material');
    if (/avail|received|in stock/i.test(purchaseMatch[1])) order.purchase.availability = 'AVAILABLE';
    else if (/part/i.test(purchaseMatch[1])) order.purchase.availability = 'PARTIAL';
    else if (/pend|wait|delay|po issued|open/i.test(purchaseMatch[1])) {
      order.purchase.availability = 'PENDING';
      order.purchase.pendingAction = `Follow up on procurement: ${purchaseMatch[1].trim()}`;
      order.actionRequired.purchase = order.purchase.pendingAction;
      order.pendingDepartments.push('purchase');
    }
  }

  // Production
  const prodStatusMatch = block.match(/(?:Production|Manufacturing|Assembly|Fabrication)\s*[:=-]?\s*([^\n\r;]+)/i);
  if (prodStatusMatch) {
    order.production.status = prodStatusMatch[1].trim();
    order.presentDepartments.push('production');
    order.presentAttributes.push('Production Status');
    if (isPendingOrDelayed(prodStatusMatch[1])) {
      order.production.pendingAction = `Expedite production: ${prodStatusMatch[1].trim()}`;
      order.actionRequired.production = order.production.pendingAction;
      order.pendingDepartments.push('production');
    }
  }

  // Service
  const serviceMatch = block.match(/(?:Service|Site|Installation|Commissioning|Field)\s*[:=-]?\s*([^\n\r;]+)/i);
  if (serviceMatch) {
    order.service.siteStatus = serviceMatch[1].trim();
    order.presentDepartments.push('service');
    order.presentAttributes.push('Site Status');
    if (isPendingOrDelayed(serviceMatch[1])) {
      order.service.pendingIssue = serviceMatch[1].trim();
      order.service.requiredAction = `Resolve site issue: ${serviceMatch[1].trim()}`;
      order.actionRequired.service = order.service.requiredAction;
      order.pendingDepartments.push('service');
    }
  }

  // Dispatch
  const dispatchMatch = block.match(/(?:Dispatch|Shipping|Delivery|Logistics)\s*[:=-]?\s*([^\n\r;]+)/i);
  if (dispatchMatch) {
    order.dispatch.status = dispatchMatch[1].trim();
    order.presentDepartments.push('dispatch');
    order.presentAttributes.push('Dispatch Status');
    if (isPendingOrDelayed(dispatchMatch[1])) {
      order.dispatch.pendingRequirement = dispatchMatch[1].trim();
      order.dispatch.action = `Resolve dispatch clearance: ${dispatchMatch[1].trim()}`;
      order.actionRequired.dispatch = order.dispatch.action;
      order.pendingDepartments.push('dispatch');
    }
  }

  if (order.pendingDepartments.length > 0 || isPendingOrDelayed(order.orderStatus)) {
    order.isCritical = true;
  }

  return order;
}

export function createEmptyOrder(orderId: string, source: string): OrderRecord {
  return {
    orderId: orderId || NOT_AVAILABLE,
    customer: NOT_AVAILABLE,
    product: NOT_AVAILABLE,
    quantity: NOT_AVAILABLE,
    orderStatus: NOT_AVAILABLE,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    purchase: {
      material: NOT_AVAILABLE,
      availability: NOT_AVAILABLE,
      expectedDate: NOT_AVAILABLE,
      pendingAction: NOT_AVAILABLE,
    },
    production: {
      status: NOT_AVAILABLE,
      completion: NOT_AVAILABLE,
      targetDate: NOT_AVAILABLE,
      pendingAction: NOT_AVAILABLE,
    },
    service: {
      siteStatus: NOT_AVAILABLE,
      installation: NOT_AVAILABLE,
      commissioning: NOT_AVAILABLE,
      pendingIssue: NOT_AVAILABLE,
      requiredAction: NOT_AVAILABLE,
    },
    dispatch: {
      status: NOT_AVAILABLE,
      plannedDate: NOT_AVAILABLE,
      pendingRequirement: NOT_AVAILABLE,
      action: NOT_AVAILABLE,
    },
    actionRequired: {
      purchase: NOT_AVAILABLE,
      production: NOT_AVAILABLE,
      service: NOT_AVAILABLE,
      dispatch: NOT_AVAILABLE,
    },
    presentAttributes: [],
    presentDepartments: [],
    customAttributes: {},
    sources: [source],
    conflicts: [],
    isCritical: false,
    pendingDepartments: [],
    confidence: 'Confirmed (extracted from uploaded data)',
  };
}
