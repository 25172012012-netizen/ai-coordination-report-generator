export const NOT_AVAILABLE = 'Not Available in Uploaded Data';

export interface PurchaseDetails {
  material: string;
  availability: string;
  expectedDate: string;
  pendingAction: string;
}

export interface ProductionDetails {
  status: string;
  completion: string;
  targetDate: string;
  pendingAction: string;
}

export interface ServiceDetails {
  siteStatus: string;
  installation: string;
  commissioning: string;
  pendingIssue: string;
  requiredAction: string;
}

export interface DispatchDetails {
  status: string;
  plannedDate: string;
  pendingRequirement: string;
  action?: string;
}

export interface ActionRequired {
  purchase: string;
  production: string;
  service: string;
  dispatch: string;
}

export interface ConflictItem {
  field: string;
  description: string;
  values: { source: string; value: string }[];
}

export interface OrderRecord {
  orderId: string;
  customer: string;
  product: string;
  quantity: string;
  orderStatus: string;
  date?: string;

  purchase: PurchaseDetails;
  production: ProductionDetails;
  service: ServiceDetails;
  dispatch: DispatchDetails;

  actionRequired: ActionRequired;

  // Track which attributes and departments were actually present in the uploaded sources
  presentAttributes: string[];
  presentDepartments: ('purchase' | 'production' | 'service' | 'dispatch')[];
  customAttributes?: Record<string, string>;

  sources: string[];
  conflicts: ConflictItem[];
  isCritical: boolean;
  pendingDepartments: ('purchase' | 'production' | 'service' | 'dispatch')[];
  confidence: string;
}

export interface OverallSummary {
  totalOrders: number;
  purchasePending: number;
  productionPending: number;
  servicePending: number;
  dispatchPending: number;
  criticalDelayedOrders: number;
  activeDepartments: ('purchase' | 'production' | 'service' | 'dispatch')[];
}

export interface GenerationResult {
  summary: OverallSummary;
  orders: OrderRecord[];
  reportText: string;
  filesProcessed: string[];
  warnings: string[];
  hasConflicts: boolean;
  llmEnriched?: boolean;
  presentAttributes?: string[];
  presentDepartments?: ('purchase' | 'production' | 'service' | 'dispatch')[];
}

export interface ExtractedDocument {
  filename: string;
  rawText?: string;
  rows?: Record<string, any>[];
  tables?: string[][][];
}
