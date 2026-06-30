import { useState, useEffect } from 'react';
import { Plus, Trash2, CreditCard, User, Truck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { paymentApi, customerApi, supplierApi } from '../db';
import type { Payment, Customer, Supplier } from '../types';
import Modal from '../components/Modal';
import { format } from 'date-fns-jalali';

interface PaymentWithPerson extends Payment {
  personName?: string;
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentWithPerson[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customerBalances, setCustomerBalances] = useState<Record<string, number>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [personType, setPersonType] = useState<'customer' | 'supplier'>('customer');
  const [form, setForm] = useState({
    personId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'),
    method: 'cash' as 'cash' | 'card' | 'transfer' | 'cheque', note: '',
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [custs, sups, pays] = await Promise.all([
      customerApi.getAll(), supplierApi.getAll(), paymentApi.getAll(),
    ]);
    setCustomers(custs);
    setSuppliers(sups);
    const full = pays.map(p => {
      const person = p.personType === 'customer'
        ? custs.find(c => c.id === p.personId)
        : sups.find(s => s.id === p.personId);
      return { ...p, personName: person?.name };
    });
    setPayments(full.reverse());

    const balances: Record<string, number> = {};
    for (const c of custs) {
      balances[c.id] = await paymentApi.getCustomerBalance(c.id);
    }
    setCustomerBalances(balances);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await paymentApi.add({ ...form, personType });
    setModalOpen(false);
    setForm({ personId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: 'cash', note: '' });
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) { await paymentApi.delete(id); loadData(); }
  };

  const debtors = customers.filter(c => (customerBalances[c.id] || 0) > 0)
    .sort((a, b) => (customerBalances[b.id] || 0) - (customerBalances[a.id] || 0));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">پرداخت‌ها</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ثبت پرداخت و مدیریت بدهی‌ها</p>
        </div>
        <button
          onClick={() => { setForm({ personId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), method: 'cash', note: '' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>پرداخت جدید</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUpRight size={18} className="text-red-500" /> بدهکارترین مشتری‌ها
          </h3>
          {debtors.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هیچ بدهکاری وجود ندارد</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-auto">
              {debtors.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-red-400 dark:text-red-300" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                  </div>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">{customerBalances[c.id].toLocaleString('fa-IR')} تومان</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowDownRight size={18} className="text-green-500" /> طلبکارترین مشتری‌ها
          </h3>
          {(() => {
            const creditors = customers.filter(c => (customerBalances[c.id] || 0) < 0)
              .sort((a, b) => (customerBalances[a.id] || 0) - (customerBalances[b.id] || 0));
            return creditors.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">هیچ طلبکاری وجود ندارد</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto">
                {creditors.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-green-400 dark:text-green-300" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{c.name}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400">{Math.abs(customerBalances[c.id]).toLocaleString('fa-IR')} تومان</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CreditCard size={18} /> تاریخچه پرداخت‌ها
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">شخص</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">نوع</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مبلغ</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تاریخ</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">روش</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.personType === 'customer' ? <User size={14} className="text-blue-400 dark:text-blue-300" /> : <Truck size={14} className="text-amber-400 dark:text-amber-300" />}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{p.personName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.personType === 'customer' ? 'مشتری' : 'تامین‌کننده'}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{p.amount.toLocaleString('fa-IR')} تومان</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{p.date}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {p.method === 'cash' ? 'نقدی' : p.method === 'card' ? 'کارت' : p.method === 'transfer' ? 'انتقال' : 'چک'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length === 0 && <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ پرداختی ثبت نشده</div>}
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="پرداخت جدید">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع</label>
            <select value={personType} onChange={(e) => setPersonType(e.target.value as 'customer' | 'supplier')} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
              <option value="customer">مشتری</option>
              <option value="supplier">تامین‌کننده</option>
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{personType === 'customer' ? 'مشتری' : 'تامین‌کننده'}</label>
            <select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required>
              <option value="">انتخاب کنید</option>
              {(personType === 'customer' ? customers : suppliers).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مبلغ</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: +e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" min={1} required /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاریخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" required /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">روش پرداخت</label>
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white">
              <option value="cash">نقدی</option>
              <option value="card">کارت</option>
              <option value="transfer">انتقال بانکی</option>
              <option value="cheque">چک</option>
            </select></div>
          <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white" rows={2} /></div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">ثبت پرداخت</button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">انصراف</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
