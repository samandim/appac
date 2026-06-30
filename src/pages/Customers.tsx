import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, User, Phone, MapPin, Eye } from 'lucide-react';
import { customerApi, saleApi, paymentApi } from '../db';
import type { Customer } from '../types';
import Modal from '../components/Modal';
import { useNavigate } from 'react-router-dom';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', note: '', status: 'active' as 'active' | 'inactive' });
  const navigate = useNavigate();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await customerApi.getAll();
    setCustomers(data);
  };

  const handleSearch = async () => {
    if (search.trim()) {
      const data = await customerApi.search(search);
      setCustomers(data);
    } else {
      loadCustomers();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await customerApi.update(editing.id, form);
    } else {
      await customerApi.add(form);
    }
    setModalOpen(false);
    setEditing(null);
    setForm({ name: '', phone: '', address: '', note: '', status: 'active' });
    loadCustomers();
  };

  const handleEdit = (customer: Customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      note: customer.note,
      status: customer.status,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('آیا مطمئن هستید؟')) {
      await customerApi.delete(id);
      loadCustomers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مشتریان</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">مدیریت مشتریان و بدهی‌ها</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm({ name: '', phone: '', address: '', note: '', status: 'active' }); setModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>مشتری جدید</span>
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
            placeholder="جستجو بر اساس نام یا شماره تماس..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white"
          />
        </div>
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
          جستجو
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مشتری</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">شماره تماس</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">آدرس</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">وضعیت</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <User size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <Phone size={14} className="text-gray-400 dark:text-gray-500" />
                    {customer.phone}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-1">
                    <MapPin size={14} className="text-gray-400 dark:text-gray-500" />
                    {customer.address}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    customer.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}>
                    {customer.status === 'active' ? 'فعال' : 'غیرفعال'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => navigate(`/customers/${customer.id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      title="مشاهده جزئیات"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleEdit(customer)}
                      className="p-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/30 text-amber-600"
                      title="ویرایش"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">هیچ مشتری ثبت نشده</div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'ویرایش مشتری' : 'مشتری جدید'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام و نام خانوادگی</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شماره تماس</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">آدرس</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">توضیحات</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">وضعیت</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 dark:text-white"
            >
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              {editing ? 'ذخیره تغییرات' : 'ایجاد مشتری'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
              انصراف
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
