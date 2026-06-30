import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Phone, MapPin, User, Receipt, CreditCard, Eye } from 'lucide-react';
import { customerApi, saleApi, paymentApi, productApi } from '../db';
import type { Customer, Sale, Payment, Product } from '../types';
import Modal from '../components/Modal';

interface SaleWithItems extends Sale {
  items?: any[];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [balance, setBalance] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SaleWithItems | null>(null);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const c = await customerApi.getById(id!);
    if (!c) { navigate('/customers'); return; }
    setCustomer(c);

    const s = await saleApi.getAll();
    const customerSales = s.filter(x => x.customerId === id);
    setSales(customerSales);

    // مهم: مجموع فروش رو در یک متغیر محلی نگه می‌داریم
    // چون آپدیت state (setTotalSales) آسنکرون هست و نمی‌تونیم
    // بلافاصله بعدش به state تازه‌ای که ست کردیم متکی باشیم.
    const totalSalesAmount = customerSales.reduce((sum, x) => sum + x.finalAmount, 0);
    setTotalSales(totalSalesAmount);

    const p = await paymentApi.getByPerson(id!);
    setPayments(p);
    const paid = p.reduce((sum, x) => sum + x.amount, 0);
    setBalance(totalSalesAmount - paid);

    let profit = 0;
    for (const sale of customerSales) {
      const items = await saleApi.getItems(sale.id);
      profit += items.reduce((s, item) => s + item.profit, 0);
    }
    setTotalProfit(profit);

    const prods = await productApi.getAll();
    setProducts(prods);
  };

  const handleViewSale = async (sale: Sale) => {
    const items = await saleApi.getItems(sale.id);
    setViewingSale({ ...sale, items });
    setViewModalOpen(true);
  };

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/customers')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowRight size={16} />
        بازگشت به لیست مشتریان
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <User size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{customer.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1"><Phone size={14} /> {customer.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {customer.address}</span>
            </div>
          </div>
          <span className={`mr-auto px-3 py-1 rounded-full text-sm font-medium ${
            customer.status === 'active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
          }`}>
            {customer.status === 'active' ? 'فعال' : 'غیرفعال'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">کل خرید</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalSales.toLocaleString('fa-IR')} تومان</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400 mb-1">سود از مشتری</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{totalProfit.toLocaleString('fa-IR')} تومان</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-1">بدهی</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{balance.toLocaleString('fa-IR')} تومان</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">تعداد فاکتور</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{sales.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Receipt size={18} /> فاکتورها
          </h3>
          {sales.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هیچ فاکتوری ثبت نشده</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {sales.map(sale => (
                <div
                  key={sale.id}
                  onClick={() => handleViewSale(sale)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title="برای مشاهده جزئیات کلیک کنید"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">فاکتور {sale.invoiceNumber}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{sale.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{sale.finalAmount.toLocaleString('fa-IR')} تومان</span>
                    <Eye size={14} className="text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard size={18} /> پرداخت‌ها
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هیچ پرداختی ثبت نشده</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-auto">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{p.amount.toLocaleString('fa-IR')} تومان</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{p.date}</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    {p.method === 'cash' ? 'نقدی' : p.method === 'card' ? 'کارت' : p.method === 'transfer' ? 'انتقال' : 'چک'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="جزئیات فروش" size="md">
        {viewingSale && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400">فاکتور:</span> <span className="font-medium text-gray-900 dark:text-white">{viewingSale.invoiceNumber}</span></div>
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
                {viewingSale.items?.map((item: any) => (
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
