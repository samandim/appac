import { useState, useEffect } from 'react';
import { Plus, Trash2, Receipt, TrendingDown } from 'lucide-react';
import { expenseApi } from '../db';
import type { Expense } from '../types';
import Modal from '../components/Modal';
import { format } from 'date-fns-jalali';

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    category: 'حمل و نقل', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), description: '', relatedTo: '',
  });

  const categories = ['حمل و نقل', 'بسته‌بندی', 'هزینه خرید', 'هزینه متفرقه', 'اجاره', 'برق', 'آب', 'تلفن', 'سایر'];

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = async () => {
    const data = await expenseApi.getAll();
    setExpenses(data.reverse());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await expenseApi.add(form);
    setModalOpen(false);
    setForm({ category: 'حمل و نقل', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), description: '', relatedTo: '' });
    loadExpenses();
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) { await expenseApi.delete(id); loadExpenses(); }
  };

  const total = expenses.reduce((s, x) => s + x.amount, 0);
  const byCategory: Record<string, number> = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">هزینه‌ها</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ثبت و مدیریت هزینه‌های کسب‌وکار</p>
        </div>
        <button
          onClick={() => { setForm({ category: 'حمل و نقل', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), description: '', relatedTo: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>هزینه جدید</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">مجموع هزینه‌ها</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{total.toLocaleString('fa-IR')} تومان</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">تعداد هزینه‌ها</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{expenses.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">هزینه‌ها بر اساس دسته</h3>
          <div className="space-y-2">
            {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{cat}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{amt.toLocaleString('fa-IR')} تومان</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Receipt size={18} /> لیست هزینه‌ها</h3>
          <div className="space-y-2 max-h-96 overflow-auto">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{e.category}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{e.date}</span>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{e.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{e.amount.toLocaleString('fa-IR')} تومان</span>
                  <button onClick={() => handleDelete(e.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          {expenses.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">هیچ هزینه‌ای ثبت نشده</p>}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="هزینه جدید">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">دسته‌بندی</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" min={1} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} required /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ثبت هزینه</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
