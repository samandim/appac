export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  stock: number;
  minStock: number;
  avgBuyPrice: number;
  sellPrice: number;
  note: string;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplierId: string;
  date: string;
  totalAmount: number;
  transportCost: number;
  otherCost: number;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  qty: number;
  unitPrice: number;
  total: number;
  costPrice: number;
  profit: number;
}

export interface Sale {
  id: string;
  customerId: string;
  date: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  notes: string;
  invoiceNumber: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  personId: string;
  personType: 'customer' | 'supplier';
  amount: number;
  date: string;
  method: 'cash' | 'card' | 'transfer' | 'cheque';
  note: string;
  relatedInvoiceId?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  relatedTo?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'insert' | 'update' | 'delete';
  oldData?: string;
  newData?: string;
  timestamp: string;
  user?: string;
}

export interface Settings {
  id?: number;
  key: string;
  value: string;
}

export interface BusinessInfo {
  name: string;
  phone: string;
  address: string;
  logo: string;
  currency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}
