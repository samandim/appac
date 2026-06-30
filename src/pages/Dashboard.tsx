import { useEffect, useState } from 'react';
import {
  Users, Package, ShoppingBag, TrendingUp,
  AlertTriangle, CreditCard, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard';
import {
  db, customerApi, productApi, saleApi, paymentApi, expenseApi
} from '../db';
import type { Sale, Product } from '../types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns-jalali';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const statRoutes = [
  { title: 'مشتریان', route: '/customers' },
  { title: 'کالاها', route: '/products' },
  { title: 'فروش امروز', route: '/sales' },
  { title: 'سود امروز', route: '/reports' },
  { title: 'سود ماه جاری', route: '/reports' },
  { title: 'بدهی مشتریان', route: '/payments' },
  { title: 'ارزش انبار', route: '/products' },
  { title: 'سود احتمالی انبار', route: '/products' },
];

interface DashboardData {
  customersCount: number;
  productsCount: number;
  lowStockProducts: Product[];
  todaySales: number;
  todayProfit: number;
  monthSales: number;
  monthProfit: number;
  totalDebt: number;
  inventoryValue: number;
  inventoryPotentialProfit: number;
  monthlyChart: { name: string; sales: number; profit: number }[];
  topProducts: { name: string; value: number }[];
  recentSales: Sale[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const customers = await customerApi.getAll();
      const products = await productApi.getAll();
      const lowStock = await productApi.getLowStock();
      const sales = await saleApi.getAll();
      const payments = await paymentApi.getAll();
      const expenses = await expenseApi.getAll();

      const today = format(new Date(), 'yyyy-MM-dd');
      const todaySales = sales.filter(s => s.date.startsWith(today));
      const todaySalesAmount = todaySales.reduce((s, x) => s + x.finalAmount, 0);
      const todayProfit = todaySales.reduce((s, x) => s + x.totalAmount - x.discount, 0) -
        todaySales.reduce(async (s, x) => {
          const items = await saleApi.getItems(x.id);
          return items.reduce((sum, item) => sum + item.costPrice * item.qty, 0);
        }, 0);

      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      const monthSales = sales.filter(s => s.date >= monthStart && s.date <= monthEnd);
      const monthSalesAmount = monthSales.reduce((s, x) => s + x.finalAmount, 0);

      // Calculate total debt
      const customersWithDebt = await Promise.all(
        customers.map(async c => {
          const balance = await paymentApi.getCustomerBalance(c.id);
          return { id: c.id, name: c.name, debt: balance > 0 ? balance : 0 };
        })
      );
      const totalDebt = customersWithDebt.reduce((s, c) => s + c.debt, 0);

      // Inventory value
      const inventoryValue = products.reduce((s, p) => s + (p.avgBuyPrice * p.stock), 0);
      const inventoryPotentialProfit = products.reduce((s, p) => s + ((p.sellPrice - p.avgBuyPrice) * p.stock), 0);

      // Monthly chart (last 6 months)
      const monthlyChart = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const mStart = format(startOfMonth(d), 'yyyy-MM-dd');
        const mEnd = format(endOfMonth(d), 'yyyy-MM-dd');
        const mSales = sales.filter(s => s.date >= mStart && s.date <= mEnd);
        const mAmount = mSales.reduce((s, x) => s + x.finalAmount, 0);
        const mProfit = mAmount - mSales.reduce((s, x) => s + (x.totalAmount * 0.7), 0); // rough estimate
        monthlyChart.push({
          name: format(d, 'MMM'),
          sales: mAmount,
          profit: Math.max(0, mProfit),
        });
      }

      // Top products
      const productSales: Record<string, number> = {};
      for (const sale of sales) {
        const items = await saleApi.getItems(sale.id);
        for (const item of items) {
          const p = products.find(x => x.id === item.productId);
          if (p) {
            productSales[p.name] = (productSales[p.name] || 0) + item.qty;
          }
        }
      }
      const topProducts = Object.entries(productSales)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      const recentSales = [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

      setData({
        customersCount: customers.length,
        productsCount: products.length,
        lowStockProducts: lowStock,
        todaySales: todaySalesAmount,
        todayProfit: todayProfit,
        monthSales: monthSalesAmount,
        monthProfit: monthSalesAmount * 0.3,
        totalDebt,
        inventoryValue,
        inventoryPotentialProfit,
        monthlyChart,
        topProducts,
        recentSales,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">داشبورد</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">نمای کلی کسب‌وکار</p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {format(new Date(), 'yyyy/MM/dd')}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="مشتریان" value={data.customersCount} icon={Users} color="bg-blue-600" to={statRoutes.find(s => s.title === 'مشتریان')?.route} />
        <StatCard title="کالاها" value={data.productsCount} icon={Package} color="bg-emerald-600" to={statRoutes.find(s => s.title === 'کالاها')?.route} />
        <StatCard
          title="فروش امروز"
          value={data.todaySales.toLocaleString('fa-IR') + ' تومان'}
          icon={ShoppingBag}
          color="bg-amber-500"
          to={statRoutes.find(s => s.title === 'فروش امروز')?.route}
        />
        <StatCard
          title="سود امروز"
          value={data.todayProfit.toLocaleString('fa-IR') + ' تومان'}
          icon={TrendingUp}
          color="bg-rose-500"
          to={statRoutes.find(s => s.title === 'سود امروز')?.route}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="سود ماه جاری"
          value={data.monthProfit.toLocaleString('fa-IR') + ' تومان'}
          icon={ArrowUpRight}
          color="bg-violet-600"
          to={statRoutes.find(s => s.title === 'سود ماه جاری')?.route}
        />
        <StatCard
          title="بدهی مشتریان"
          value={data.totalDebt.toLocaleString('fa-IR') + ' تومان'}
          icon={CreditCard}
          color="bg-orange-600"
          to={statRoutes.find(s => s.title === 'بدهی مشتریان')?.route}
        />
        <StatCard
          title="ارزش انبار"
          value={data.inventoryValue.toLocaleString('fa-IR') + ' تومان'}
          icon={Package}
          color="bg-cyan-600"
          to={statRoutes.find(s => s.title === 'ارزش انبار')?.route}
        />
        <StatCard
          title="سود احتمالی انبار"
          value={data.inventoryPotentialProfit.toLocaleString('fa-IR') + ' تومان'}
          icon={ArrowDownRight}
          color="bg-teal-600"
          to={statRoutes.find(s => s.title === 'سود احتمالی انبار')?.route}
        />
      </div>

      {/* Alerts & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-amber-500" size={20} />
            <h3 className="font-bold text-gray-900 dark:text-white">کالاهای کم موجودی</h3>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هیچ کالایی در حد کم موجودی نیست</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-auto">
              {data.lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                  <span className="text-sm text-amber-700 dark:text-amber-400">{p.stock} {p.unit}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Sales Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm lg:col-span-2">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">فروش و سود ماهانه</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => value.toLocaleString('fa-IR')}
                contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn' }}
              />
              <Area type="monotone" dataKey="sales" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="فروش" />
              <Area type="monotone" dataKey="profit" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="سود" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">کالاهای پرفروش</h3>
          {data.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هنوز فروشی ثبت نشده</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.topProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.topProducts.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => value.toLocaleString('fa-IR')}
                  contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {data.topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-1 text-sm">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-gray-600 dark:text-gray-300">{p.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">آخرین فروش‌ها</h3>
          {data.recentSales.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">هنوز فروشی ثبت نشده</p>
          ) : (
            <div className="space-y-2">
              {data.recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">فاکتور {sale.invoiceNumber}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">{sale.date}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {sale.finalAmount.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
