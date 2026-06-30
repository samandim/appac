import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Truck, Phone, MapPin } from 'lucide-react';
import { supplierApi, paymentApi, purchaseApi } from '../db';
import type { Supplier } from '../types';
import Modal from '../components/Modal';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '' });
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    const data = await supplierApi.getAll();
    setSuppliers(data);
    const b: Record<string, number> = {};
    for (const s of data) {
      b[s.id] = await paymentApi.getSupplierBalance(s.id);
    }
    setBalances(b);
  };

  const handleSearch = async () => {
    if (search.trim()) {
      const data = await supplierApi.search(search);
      setSuppliers(data);
    } else {
      loadSuppliers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await supplierApi.update(editing.id, form);
    } else {
      await supplierApi.add(form);
    }
    setModalOpen(false);
    setEditing(null);
    setForm({ name: '', phone: '', address: '', note: '' });
    loadSuppliers();
  };

  const handleEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, address: s.address, note: s.note });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) {
      await supplierApi.delete(id);
      loadSuppliers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تامین‌کنندگان</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">مدیریت تامین‌کنندگان و بدهی‌ها</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', phone: '', address: '', note: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>تامین‌کننده جدید</span>
        </button>
      </div>

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
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تامین‌کننده</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">شماره تماس</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">آدرس</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">بدهی/طلب</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Truck size={14} className="text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><Phone size={14} className="text-gray-400 dark:text-gray-500" /> {s.phone}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1"><MapPin size={14} className="text-gray-400 dark:text-gray-500" /> {s.address}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${balances[s.id] > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {balances[s.id]?.toLocaleString('fa-IR') || '0'} تومان
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliers.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ تامین‌کننده‌ای ثبت نشده</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش' : 'تامین‌کننده جدید'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شماره تماس</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">آدرس</label>
            <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} /></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">{editing ? 'ذخیره' : 'ایجاد'}</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
