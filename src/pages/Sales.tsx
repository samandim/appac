import { useState, useEffect } from 'react';
import { Plus, Trash2, ShoppingBag, User, Calendar, Eye, Receipt } from 'lucide-react';
import { saleApi, customerApi, productApi } from '../db';
import type { Sale, Customer, Product } from '../types';
import Modal from '../components/Modal';
import { format } from 'date-fns-jalali';
import { useNavigate } from 'react-router-dom';

interface SaleWithDetails extends Sale {
  customerName?: string;
  items: any[];
}

export default function Sales() {
  const [sales, setSales] = useState<SaleWithDetails[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SaleWithDetails | null>(null);
  const [form, setForm] = useState({
    customerId: '', date: format(new Date(), 'yyyy-MM-dd'), discount: 0, notes: '', invoiceNumber: '',
  });
  const [items, setItems] = useState<{ productId: string; qty: number; unitPrice: number }[]>([
    { productId: '', qty: 1, unitPrice: 0 },
  ]);
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [custs, prods, sals] = await Promise.all([
      customerApi.getAll(), productApi.getAll(), saleApi.getAll(),
    ]);
    setCustomers(custs);
    setProducts(prods);
    const full = await Promise.all(sals.map(async s => {
      const items = await saleApi.getItems(s.id);
      const c = custs.find(x => x.id === s.customerId);
      return { ...s, customerName: c?.name, items };
    }));
    setSales(full);
  };

  const addItem = () => setItems([...items, { productId: '', qty: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    if (field === 'productId') {
      const p = products.find(pr => pr.id === value);
      if (p) newItems[idx].unitPrice = p.sellPrice;
    }
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.productId && i.qty > 0 && i.unitPrice > 0);
    if (validItems.length === 0) { alert('حداقل یک کالا اضافه کنید'); return; }
    const nextNum = await saleApi.getNextInvoiceNumber();
    await saleApi.add(
      { ...form, invoiceNumber: form.invoiceNumber || `INV-${String(nextNum).padStart(4, '0')}` },
      validItems
    );
    setModalOpen(false);
    setForm({ customerId: '', date: format(new Date(), 'yyyy-MM-dd'), discount: 0, notes: '', invoiceNumber: '' });
    setItems([{ productId: '', qty: 1, unitPrice: 0 }]);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) { await saleApi.delete(id); loadData(); }
  };

  const handleView = (sale: SaleWithDetails) => { setViewingSale(sale); setViewModalOpen(true); };

  const total = items.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
  const finalTotal = total - form.discount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فروش‌ها</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ثبت فروش و صدور فاکتور</p>
        </div>
        <button
          onClick={() => { setForm({ customerId: '', date: format(new Date(), 'yyyy-MM-dd'), discount: 0, notes: '', invoiceNumber: '' }); setItems([{ productId: '', qty: 1, unitPrice: 0 }]); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>فروش جدید</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">شماره فاکتور</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مشتری</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تاریخ</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مبلغ</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {sales.map(sale => (
              <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Receipt size={14} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{sale.invoiceNumber}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400 dark:text-gray-500" />
                    <span className="text-sm text-gray-900 dark:text-white">{sale.customerName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><Calendar size={14} className="text-gray-400 dark:text-gray-500" />{sale.date}</div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{sale.finalAmount.toLocaleString('fa-IR')} تومان</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(sale)} className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50">مشاهده</button>
                    <button onClick={() => navigate(`/invoice/${sale.id}`)} className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/50">فاکتور</button>
                    <button onClick={() => handleDelete(sale.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ فروشی ثبت نشده</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="فروش جدید" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مشتری</label>
              <select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required>
                <option value="">انتخاب کنید</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required /></div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">کالاها</h4>
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"><Plus size={16} /> افزودن کالا</button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" required>
                      <option value="">انتخاب کالا</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(idx, 'qty', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" min={1} required />
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="قیمت فروش" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" min={0} required />
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 dark:text-gray-300">{(item.qty * item.unitPrice).toLocaleString('fa-IR')}</div>
                  {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="col-span-12 text-red-600 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300">حذف</button>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تخفیف</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" min={0} /></div>
            <div className="flex items-end">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 w-full">
                <span className="text-sm text-gray-500 dark:text-gray-400">مبلغ نهایی: </span>
                <span className="font-bold text-gray-900 dark:text-white">{finalTotal.toLocaleString('fa-IR')} تومان</span>
              </div>
            </div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} /></div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ثبت فروش</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="جزئیات فروش" size="md">
        {viewingSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">فاکتور:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingSale.invoiceNumber}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">مشتری:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingSale.customerName}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">تاریخ:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingSale.date}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">تخفیف:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingSale.discount.toLocaleString('fa-IR')}</span></div>
            </div>
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">کالا</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">تعداد</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">قیمت</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">جمع</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">سود</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {viewingSale.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{products.find(p => p.id === item.productId)?.name || 'کالا'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{item.qty}</td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">{item.unitPrice.toLocaleString('fa-IR')}</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{item.total.toLocaleString('fa-IR')}</td>
                    <td className="px-3 py-2 text-sm text-green-600 dark:text-green-400">{item.profit.toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-left">
              <span className="text-sm text-gray-500 dark:text-gray-400">مبلغ نهایی: </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{viewingSale.finalAmount.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
