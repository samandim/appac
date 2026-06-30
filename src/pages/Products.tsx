import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Package, AlertTriangle } from 'lucide-react';
import { productApi } from '../db';
import type { Product } from '../types';
import Modal from '../components/Modal';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({
    name: '', category: '', brand: '', unit: 'عدد', minStock: 0, sellPrice: 0, note: '',
  });
  const [stockForm, setStockForm] = useState({ productId: '', qty: 0, type: 'add' as 'add' | 'remove' });
  const [stockModalOpen, setStockModalOpen] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    const data = await productApi.getAll();
    setProducts(data);
  };

  const handleSearch = async () => {
    if (search.trim()) {
      const data = await productApi.search(search);
      setProducts(data);
    } else {
      loadProducts();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await productApi.update(editing.id, form);
    } else {
      await productApi.add(form);
    }
    setModalOpen(false);
    setEditing(null);
    setForm({ name: '', category: '', brand: '', unit: 'عدد', minStock: 0, sellPrice: 0, note: '' });
    loadProducts();
  };

  const handleEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, category: p.category, brand: p.brand, unit: p.unit,
      minStock: p.minStock, sellPrice: p.sellPrice, note: p.note,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) {
      await productApi.delete(id);
      loadProducts();
    }
  };

  const handleStockChange = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = await productApi.getById(stockForm.productId);
    if (!product) return;
    const newStock = stockForm.type === 'add'
      ? product.stock + stockForm.qty
      : Math.max(0, product.stock - stockForm.qty);
    await productApi.update(stockForm.productId, { stock: newStock });
    setStockModalOpen(false);
    setStockForm({ productId: '', qty: 0, type: 'add' });
    loadProducts();
  };

  const inventoryValue = products.reduce((s, p) => s + (p.avgBuyPrice * p.stock), 0);
  const inventoryPotential = products.reduce((s, p) => s + ((p.sellPrice - p.avgBuyPrice) * p.stock), 0);
  const lowStock = products.filter(p => p.stock <= p.minStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">کالا و انبار</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">مدیریت کالاها و موجودی</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', category: '', brand: '', unit: 'عدد', minStock: 0, sellPrice: 0, note: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>کالای جدید</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">تعداد کالاها</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{products.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">ارزش انبار</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{inventoryValue.toLocaleString('fa-IR')} تومان</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">سود احتمالی</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{inventoryPotential.toLocaleString('fa-IR')} تومان</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-800 dark:text-amber-200">کالاهای کم موجودی ({lowStock.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <span key={p.id} className="px-3 py-1 bg-white dark:bg-gray-800 rounded-lg text-sm text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                {p.name} ({p.stock} {p.unit})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="جستجو..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">جستجو</button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">کالا</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">دسته‌بندی</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">موجودی</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">قیمت خرید</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">قیمت فروش</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                      <Package size={14} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{p.brand}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.category}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${p.stock <= p.minStock ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                    {p.stock} {p.unit}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.avgBuyPrice.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.sellPrice.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setStockForm({ productId: p.id, qty: 0, type: 'add' }); setStockModalOpen(true); }}
                      className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50">تغییر موجودی</button>
                    <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ کالایی ثبت نشده</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش کالا' : 'کالای جدید'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کالا</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">برند</label>
              <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دسته‌بندی</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">واحد</label>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
                <option value="عدد">عدد</option>
                <option value="بسته">بسته</option>
                <option value="کارتن">کارتن</option>
                <option value="کیلو">کیلو</option>
                <option value="متر">متر</option>
                <option value="لیتر">لیتر</option>
              </select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حداقل موجودی</label>
              <input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">قیمت فروش</label>
              <input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{editing ? 'ذخیره' : 'ایجاد'}</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={stockModalOpen} onClose={() => setStockModalOpen(false)} title="تغییر موجودی">
        <form onSubmit={handleStockChange} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع عملیات</label>
            <select value={stockForm.type} onChange={(e) => setStockForm({ ...stockForm, type: e.target.value as 'add' | 'remove' })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
              <option value="add">افزایش موجودی</option>
              <option value="remove">کاهش موجودی</option>
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مقدار</label>
            <input type="number" value={stockForm.qty} onChange={(e) => setStockForm({ ...stockForm, qty: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required min={1} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">اعمال</button>
            <button type="button" onClick={() => setStockModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
