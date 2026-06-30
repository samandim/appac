import Dexie, { type Table } from 'dexie';
import type {
  Customer, Supplier, Product, Purchase, PurchaseItem,
  Sale, SaleItem, Payment, Expense, AuditLog, Settings
} from '../types';

class HesabdarDB extends Dexie {
  customers!: Table<Customer>;
  suppliers!: Table<Supplier>;
  products!: Table<Product>;
  purchases!: Table<Purchase>;
  purchaseItems!: Table<PurchaseItem>;
  sales!: Table<Sale>;
  saleItems!: Table<SaleItem>;
  payments!: Table<Payment>;
  expenses!: Table<Expense>;
  auditLogs!: Table<AuditLog>;
  settings!: Table<Settings>;

  constructor() {
    super('HesabdarDB');
    this.version(1).stores({
      customers: 'id, name, status, createdAt',
      suppliers: 'id, name, createdAt',
      products: 'id, name, category, stock, createdAt',
      purchases: 'id, supplierId, date, createdAt',
      purchaseItems: 'id, purchaseId, productId',
      sales: 'id, customerId, date, invoiceNumber, createdAt',
      saleItems: 'id, saleId, productId',
      payments: 'id, personId, personType, date, createdAt',
      expenses: 'id, category, date, createdAt',
      auditLogs: 'id, tableName, timestamp',
      settings: 'id, key',
    });
  }
}

export const db = new HesabdarDB();

// --- Customers ---
export const customerApi = {
  getAll: () => db.customers.toArray(),
  getById: (id: string) => db.customers.get(id),
  add: async (item: Omit<Customer, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: Customer = { id, ...item, createdAt: now };
    await db.customers.add(record);
    await logAudit('customers', id, 'insert', undefined, record);
    return record;
  },
  update: async (id: string, changes: Partial<Customer>) => {
    const old = await db.customers.get(id);
    if (!old) return null;
    await db.customers.update(id, changes);
    const updated = { ...old, ...changes };
    await logAudit('customers', id, 'update', old, updated);
    return updated;
  },
  delete: async (id: string) => {
    const old = await db.customers.get(id);
    if (old) await logAudit('customers', id, 'delete', old, undefined);
    await db.customers.delete(id);
  },
  search: (query: string) =>
    db.customers.filter(c => c.name.includes(query) || c.phone.includes(query)).toArray(),
};

// --- Suppliers ---
export const supplierApi = {
  getAll: () => db.suppliers.toArray(),
  getById: (id: string) => db.suppliers.get(id),
  add: async (item: Omit<Supplier, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: Supplier = { id, ...item, createdAt: now };
    await db.suppliers.add(record);
    await logAudit('suppliers', id, 'insert', undefined, record);
    return record;
  },
  update: async (id: string, changes: Partial<Supplier>) => {
    const old = await db.suppliers.get(id);
    if (!old) return null;
    await db.suppliers.update(id, changes);
    const updated = { ...old, ...changes };
    await logAudit('suppliers', id, 'update', old, updated);
    return updated;
  },
  delete: async (id: string) => {
    const old = await db.suppliers.get(id);
    if (old) await logAudit('suppliers', id, 'delete', old, undefined);
    await db.suppliers.delete(id);
  },
  search: (query: string) =>
    db.suppliers.filter(s => s.name.includes(query) || s.phone.includes(query)).toArray(),
};

// --- Products ---
export const productApi = {
  getAll: () => db.products.toArray(),
  getById: (id: string) => db.products.get(id),
  add: async (item: Omit<Product, 'id' | 'createdAt' | 'avgBuyPrice' | 'stock'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: Product = { id, ...item, avgBuyPrice: 0, stock: 0, createdAt: now };
    await db.products.add(record);
    await logAudit('products', id, 'insert', undefined, record);
    return record;
  },
  update: async (id: string, changes: Partial<Product>) => {
    const old = await db.products.get(id);
    if (!old) return null;
    await db.products.update(id, changes);
    const updated = { ...old, ...changes };
    await logAudit('products', id, 'update', old, updated);
    return updated;
  },
  delete: async (id: string) => {
    const old = await db.products.get(id);
    if (old) await logAudit('products', id, 'delete', old, undefined);
    await db.products.delete(id);
  },
  search: (query: string) =>
    db.products.filter(p => p.name.includes(query) || p.category.includes(query)).toArray(),
  getLowStock: () => db.products.filter(p => p.stock <= p.minStock).toArray(),
};

// --- Purchases ---
export const purchaseApi = {
  getAll: () => db.purchases.toArray(),
  getById: (id: string) => db.purchases.get(id),
  getItems: (purchaseId: string) => db.purchaseItems.where('purchaseId').equals(purchaseId).toArray(),
  add: async (purchase: Omit<Purchase, 'id' | 'createdAt'>, items: Omit<PurchaseItem, 'id' | 'purchaseId'>[]) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const purchaseRecord: Purchase = { id, ...purchase, createdAt: now };
    await db.purchases.add(purchaseRecord);
    await logAudit('purchases', id, 'insert', undefined, purchaseRecord);

    // Add items and update product stock + avg price
    for (const item of items) {
      const itemId = crypto.randomUUID();
      const itemRecord: PurchaseItem = { id: itemId, purchaseId: id, ...item };
      await db.purchaseItems.add(itemRecord);

      const product = await db.products.get(item.productId);
      if (product) {
        const newStock = product.stock + item.qty;
        const newAvg = newStock > 0
          ? ((product.avgBuyPrice * product.stock) + (item.unitPrice * item.qty)) / newStock
          : item.unitPrice;
        await db.products.update(item.productId, { stock: newStock, avgBuyPrice: newAvg });
      }
    }
    return purchaseRecord;
  },
  delete: async (id: string) => {
    const old = await db.purchases.get(id);
    if (old) await logAudit('purchases', id, 'delete', old, undefined);
    const items = await db.purchaseItems.where('purchaseId').equals(id).toArray();
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (product) {
        const newStock = Math.max(0, product.stock - item.qty);
        const newAvg = newStock > 0
          ? ((product.avgBuyPrice * product.stock) - (item.unitPrice * item.qty)) / newStock
          : 0;
        await db.products.update(item.productId, { stock: newStock, avgBuyPrice: newAvg });
      }
      await db.purchaseItems.delete(item.id);
    }
    await db.purchases.delete(id);
  },
};

// --- Sales ---
export const saleApi = {
  getAll: () => db.sales.toArray(),
  getById: (id: string) => db.sales.get(id),
  getItems: (saleId: string) => db.saleItems.where('saleId').equals(saleId).toArray(),
  add: async (sale: Omit<Sale, 'id' | 'createdAt'>, items: { productId: string; qty: number; unitPrice: number }[]) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    let totalAmount = 0;
    const saleItems: SaleItem[] = [];

    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (!product) continue;
      const total = item.qty * item.unitPrice;
      const costPrice = product.avgBuyPrice;
      const profit = total - (item.qty * costPrice);
      totalAmount += total;
      saleItems.push({
        id: crypto.randomUUID(),
        saleId: id,
        productId: item.productId,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total,
        costPrice,
        profit,
      });
      // Reduce stock
      const newStock = Math.max(0, product.stock - item.qty);
      await db.products.update(item.productId, { stock: newStock });
    }

    const finalAmount = totalAmount - sale.discount;
    const saleRecord: Sale = {
      id,
      ...sale,
      totalAmount,
      finalAmount,
      createdAt: now,
    };
    await db.sales.add(saleRecord);
    await db.saleItems.bulkAdd(saleItems);
    await logAudit('sales', id, 'insert', undefined, saleRecord);
    return saleRecord;
  },
  delete: async (id: string) => {
    const old = await db.sales.get(id);
    if (old) await logAudit('sales', id, 'delete', old, undefined);
    const items = await db.saleItems.where('saleId').equals(id).toArray();
    for (const item of items) {
      const product = await db.products.get(item.productId);
      if (product) {
        const newStock = product.stock + item.qty;
        await db.products.update(item.productId, { stock: newStock });
      }
      await db.saleItems.delete(item.id);
    }
    await db.sales.delete(id);
  },
  getNextInvoiceNumber: async () => {
    const all = await db.sales.toArray();
    const nums = all.map(s => {
      const num = parseInt(s.invoiceNumber.replace(/\D/g, ''));
      return isNaN(num) ? 0 : num;
    });
    return Math.max(0, ...nums) + 1;
  },
};

// --- Payments ---
export const paymentApi = {
  getAll: () => db.payments.toArray(),
  add: async (item: Omit<Payment, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: Payment = { id, ...item, createdAt: now };
    await db.payments.add(record);
    await logAudit('payments', id, 'insert', undefined, record);
    return record;
  },
  delete: async (id: string) => {
    const old = await db.payments.get(id);
    if (old) await logAudit('payments', id, 'delete', old, undefined);
    await db.payments.delete(id);
  },
  getByPerson: (personId: string) => db.payments.where('personId').equals(personId).toArray(),
  getCustomerBalance: async (customerId: string) => {
    const sales = await db.sales.where('customerId').equals(customerId).toArray();
    const payments = await db.payments.where({ personId: customerId, personType: 'customer' }).toArray();
    const totalSales = sales.reduce((s, x) => s + x.finalAmount, 0);
    const totalPayments = payments.reduce((s, x) => s + x.amount, 0);
    return totalSales - totalPayments;
  },
  getSupplierBalance: async (supplierId: string) => {
    const purchases = await db.purchases.where('supplierId').equals(supplierId).toArray();
    const payments = await db.payments.where({ personId: supplierId, personType: 'supplier' }).toArray();
    const totalPurchases = purchases.reduce((s, x) => s + x.totalAmount, 0);
    const totalPayments = payments.reduce((s, x) => s + x.amount, 0);
    return totalPurchases - totalPayments;
  },
};

// --- Expenses ---
export const expenseApi = {
  getAll: () => db.expenses.toArray(),
  add: async (item: Omit<Expense, 'id' | 'createdAt'>) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const record: Expense = { id, ...item, createdAt: now };
    await db.expenses.add(record);
    await logAudit('expenses', id, 'insert', undefined, record);
    return record;
  },
  delete: async (id: string) => {
    const old = await db.expenses.get(id);
    if (old) await logAudit('expenses', id, 'delete', old, undefined);
    await db.expenses.delete(id);
  },
};

// --- Settings ---
export const settingsApi = {
  get: async (key: string) => {
    const s = await db.settings.where('key').equals(key).first();
    return s ? s.value : null;
  },
  set: async (key: string, value: string) => {
    const existing = await db.settings.where('key').equals(key).first();
    if (existing) {
      await db.settings.update(existing.id!, { value });
    } else {
      await db.settings.add({ key, value });
    }
  },
  getBusinessInfo: async (): Promise<BusinessInfo> => {
    const defaults: BusinessInfo = {
      name: 'کسب‌وکار من',
      phone: '',
      address: '',
      logo: '',
      currency: 'تومان',
      invoicePrefix: 'INV',
      nextInvoiceNumber: 1,
    };
    const keys = Object.keys(defaults) as (keyof BusinessInfo)[];
    const result: Partial<BusinessInfo> = {};
    for (const key of keys) {
      const val = await settingsApi.get(key);
      if (val) {
        result[key] = val as any;
      }
    }
    return { ...defaults, ...result };
  },
  setBusinessInfo: async (info: BusinessInfo) => {
    for (const [key, value] of Object.entries(info)) {
      await settingsApi.set(key, String(value));
    }
  },
  getPassword: async () => settingsApi.get('password'),
  setPassword: async (password: string) => settingsApi.set('password', password),
};

import type { BusinessInfo } from '../types';

// --- Audit ---
async function logAudit(
  tableName: string,
  recordId: string,
  action: 'insert' | 'update' | 'delete',
  oldData?: any,
  newData?: any
) {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  await db.auditLogs.add({
    id,
    tableName,
    recordId,
    action,
    oldData: oldData ? JSON.stringify(oldData) : undefined,
    newData: newData ? JSON.stringify(newData) : undefined,
    timestamp,
  });
}

// --- Export / Import (Backup) ---
export async function exportDatabase(): Promise<string> {
  const data = {
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    products: await db.products.toArray(),
    purchases: await db.purchases.toArray(),
    purchaseItems: await db.purchaseItems.toArray(),
    sales: await db.sales.toArray(),
    saleItems: await db.saleItems.toArray(),
    payments: await db.payments.toArray(),
    expenses: await db.expenses.toArray(),
    settings: await db.settings.toArray(),
    auditLogs: await db.auditLogs.toArray(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export async function importDatabase(json: string) {
  const data = JSON.parse(json);
  await db.transaction('rw', [
    db.customers, db.suppliers, db.products,
    db.purchases, db.purchaseItems, db.sales,
    db.saleItems, db.payments, db.expenses,
    db.settings, db.auditLogs,
  ], async () => {
    await db.customers.clear(); await db.customers.bulkAdd(data.customers || []);
    await db.suppliers.clear(); await db.suppliers.bulkAdd(data.suppliers || []);
    await db.products.clear(); await db.products.bulkAdd(data.products || []);
    await db.purchases.clear(); await db.purchases.bulkAdd(data.purchases || []);
    await db.purchaseItems.clear(); await db.purchaseItems.bulkAdd(data.purchaseItems || []);
    await db.sales.clear(); await db.sales.bulkAdd(data.sales || []);
    await db.saleItems.clear(); await db.saleItems.bulkAdd(data.saleItems || []);
    await db.payments.clear(); await db.payments.bulkAdd(data.payments || []);
    await db.expenses.clear(); await db.expenses.bulkAdd(data.expenses || []);
    await db.settings.clear(); await db.settings.bulkAdd(data.settings || []);
    await db.auditLogs.clear(); await db.auditLogs.bulkAdd(data.auditLogs || []);
  });
}
