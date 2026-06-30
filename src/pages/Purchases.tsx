import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, ShoppingCart, Truck, Calendar, Info } from 'lucide-react';
import { purchaseApi, supplierApi, productApi } from '../db';
import type { Purchase, PurchaseItem, Supplier, Product } from '../types';
import Modal from '../components/Modal';
import { format } from 'date-fns-jalali';

interface PurchaseWithItems extends Purchase {
  items: PurchaseItem[];
  supplierName?: string;
}

interface TooltipData {
  purchaseId: string | null;
  items: (PurchaseItem & { productName?: string })[];
}

export default function Purchases() {
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseWithItems | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({ purchaseId: null, items: [] });
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    supplierId: '', date: format(new Date(), 'yyyy-MM-dd'), totalAmount: 0,
    transportCost: 0, otherCost: 0, notes: '',
  });
  const [items, setItems] = useState<{ productId: string; qty: number; unitPrice: number }[]>([
    { productId: '', qty: 1, unitPrice: 0 },
  ]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [sups, prods, purs] = await Promise.all([
      supplierApi.getAll(), productApi.getAll(), purchaseApi.getAll(),
    ]);
    setSuppliers(sups);
    setProducts(prods);
    const full = await Promise.all(purs.map(async p => {
      const items = await purchaseApi.getItems(p.id);
      const sup = sups.find(s => s.id === p.supplierId);
      return { ...p, items, supplierName: sup?.name };
    }));
    setPurchases(full);
  };

  const addItem = () => {
    setItems([...items, { productId: '', qty: 1, unitPrice: 0 }]);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.productId && i.qty > 0 && i.unitPrice > 0);
    if (validItems.length === 0) { alert('حداقل یک کالا اضافه کنید'); return; }
    const total = validItems.reduce((s, i) => s + (i.qty * i.unitPrice), 0);
    await purchaseApi.add(
      { ...form, totalAmount: total },
      validItems.map(i => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice, total: i.qty * i.unitPrice }))
    );
    setModalOpen(false);
    setForm({ supplierId: '', date: format(new Date(), 'yyyy-MM-dd'), totalAmount: 0, transportCost: 0, otherCost: 0, notes: '' });
    setItems([{ productId: '', qty: 1, unitPrice: 0 }]);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) {
      await purchaseApi.delete(id);
      loadData();
    }
  };

  const handleView = async (p: PurchaseWithItems) => {
    const items = await purchaseApi.getItems(p.id);
    const fullItems = items.map(item => {
      const prod = products.find(pr => pr.id === item.productId);
      return { ...item, productName: prod?.name };
    });
    setViewingPurchase({ ...p, items: fullItems });
    setViewModalOpen(true);
  };

  const showTooltip = (p: PurchaseWithItems) => {
    const fullItems = p.items.map(item => {
      const prod = products.find(pr => pr.id === item.productId);
      return { ...item, productName: prod?.name || 'کالا' };
    });
    setTooltip({ purchaseId: p.id, items: fullItems });
    setActiveTooltipId(p.id);
  };

  const hideTooltip = () => {
    setTooltip({ purchaseId: null, items: [] });
    setActiveTooltipId(null);
  };

  const toggleTooltip = (p: PurchaseWithItems) => {
    if (activeTooltipId === p.id) {
      hideTooltip();
    } else {
      showTooltip(p);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">خریدها</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ثبت خرید از بازار و تامین‌کنندگان</p>
        </div>
        <button
          onClick={() => { setForm({ supplierId: '', date: format(new Date(), 'yyyy-MM-dd'), totalAmount: 0, transportCost: 0, otherCost: 0, notes: '' }); setItems([{ productId: '', qty: 1, unitPrice: 0 }]); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>خرید جدید</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">شماره</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تامین‌کننده</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تاریخ</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مبلغ کل</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {purchases.map((p, idx) => (
              <tr
                key={p.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 relative"
                onMouseEnter={() => showTooltip(p)}
                onMouseLeave={() => hideTooltip()}
                onClick={() => toggleTooltip(p)}
              >
                <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{purchases.length - idx}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-amber-500" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.supplierName || 'نامشخص'}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-gray-400 dark:text-gray-500" />
                    {p.date}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{p.totalAmount.toLocaleString('fa-IR')} تومان</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleView(p)} className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50">مشاهده</button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </td>

                {/* Tooltip / Popover */}
                {tooltip.purchaseId === p.id && tooltip.items.length > 0 && (
                  <td colSpan={5} className="absolute z-10 left-0 right-0 top-full mt-1 px-2">
                    <div
                      ref={tooltipRef}
                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[280px] w-full max-w-md mx-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-900 dark:text-white">
                        <Info size={14} className="text-blue-600 dark:text-blue-400" />
                        <span>اقلام خرید</span>
                      </div>
                      <div className="space-y-2">
                        {tooltip.items.map((item, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 text-xs">
                            <div className="col-span-2 text-gray-700 dark:text-gray-200 font-medium truncate">{item.productName}</div>
                            <div className="text-gray-600 dark:text-gray-400 text-center">{item.qty} عدد</div>
                            <div className="text-gray-600 dark:text-gray-400 text-left">{item.unitPrice.toLocaleString('fa-IR')} تومان</div>
                          </div>
                        ))}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between text-xs font-bold text-gray-900 dark:text-white">
                          <span>جمع کل</span>
                          <span>{tooltip.items.reduce((s, item) => s + item.total, 0).toLocaleString('fa-IR')} تومان</span>
                        </div>
                      </div>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {purchases.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ خریدی ثبت نشده</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="خرید جدید" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تامین‌کننده</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" required>
                <option value="">انتخاب کنید</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" required /></div>
          </div>

          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">کالاها</h4>
              <button type="button" onClick={addItem} className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                <Plus size={16} /> افزودن کالا
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={item.productId} onChange={(e) => updateItem(idx, 'productId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg text-sm" required>
                      <option value="">انتخاب کالا</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" placeholder="تعداد" value={item.qty} onChange={(e) => updateItem(idx, 'qty', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg text-sm" min={1} required />
                  </div>
                  <div className="col-span-3">
                    <input type="number" placeholder="قیمت واحد" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', +e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg text-sm" min={0} required />
                  </div>
                  <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                    {(item.qty * item.unitPrice).toLocaleString('fa-IR')}
                  </div>
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="col-span-12 text-red-600 dark:text-red-400 text-sm hover:text-red-700 dark:hover:text-red-300">حذف</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">هزینه حمل</label>
              <input type="number" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">هزینه‌های جانبی</label>
              <input type="number" value={form.otherCost} onChange={(e) => setForm({ ...form, otherCost: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div className="flex items-end">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 w-full">
                <span className="text-sm text-gray-500 dark:text-gray-400">مبلغ کل: </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {items.reduce((s, i) => s + (i.qty * i.unitPrice), 0).toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>
          </div>

          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} /></div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ثبت خرید</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="جزئیات خرید" size="md">
        {viewingPurchase && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">تامین‌کننده:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingPurchase.supplierName}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">تاریخ:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingPurchase.date}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">هزینه حمل:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingPurchase.transportCost.toLocaleString('fa-IR')}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400">هزینه جانبی:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingPurchase.otherCost.toLocaleString('fa-IR')}</span></div>
            </div>
            <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-800/50"><tr>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">کالا</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">تعداد</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">قیمت واحد</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-gray-600 dark:text-gray-300">جمع</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {viewingPurchase.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{item.productName || 'کالا'}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.qty}</td>
                    <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.unitPrice.toLocaleString('fa-IR')}</td>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">{item.total.toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-left">
              <span className="text-sm text-gray-500 dark:text-gray-400">مبلغ کل: </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{viewingPurchase.totalAmount.toLocaleString('fa-IR')} تومان</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
