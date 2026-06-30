import { useState, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, BarChart3, TrendingUp, ShoppingCart, ShoppingBag, Package } from 'lucide-react';
import { saleApi, purchaseApi, productApi, customerApi, expenseApi, paymentApi } from '../db';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'inventory' | 'customers'>('sales');
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [summary, setSummary] = useState({
    totalSales: 0, totalProfit: 0, totalPurchases: 0, totalExpenses: 0,
    netProfit: 0, totalCustomers: 0, totalProducts: 0,
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    const [sales, purchases, products, customers, expenses] = await Promise.all([
      saleApi.getAll(), purchaseApi.getAll(), productApi.getAll(),
      customerApi.getAll(), expenseApi.getAll(),
    ]);

    const filteredSales = dateRange.from && dateRange.to
      ? sales.filter(s => s.date >= dateRange.from && s.date <= dateRange.to)
      : sales;

    const totalSales = filteredSales.reduce((s, x) => s + x.finalAmount, 0);
    const totalPurchases = purchases.reduce((s, x) => s + x.totalAmount, 0);
    const totalExpenses = expenses.reduce((s, x) => s + x.amount, 0);

    let totalProfit = 0;
    for (const sale of filteredSales) {
      const items = await saleApi.getItems(sale.id);
      totalProfit += items.reduce((s, item) => s + item.profit, 0);
    }

    setSummary({
      totalSales, totalProfit, totalPurchases, totalExpenses,
      netProfit: totalProfit - totalExpenses, totalCustomers: customers.length,
      totalProducts: products.length,
    });

    // Sales chart by month
    const salesByMonth: Record<string, number> = {};
    for (const s of filteredSales) {
      const month = s.date.slice(0, 7);
      salesByMonth[month] = (salesByMonth[month] || 0) + s.finalAmount;
    }
    setSalesData(Object.entries(salesByMonth).map(([name, value]) => ({ name, value })));

    // Profit chart by month
    const profitByMonth: Record<string, number> = {};
    for (const s of filteredSales) {
      const month = s.date.slice(0, 7);
      const items = await saleApi.getItems(s.id);
      const profit = items.reduce((sum, item) => sum + item.profit, 0);
      profitByMonth[month] = (profitByMonth[month] || 0) + profit;
    }
    setProfitData(Object.entries(profitByMonth).map(([name, value]) => ({ name, value })));

    // Inventory
    setInventoryData(products.map(p => ({
      name: p.name,
      stock: p.stock,
      value: p.avgBuyPrice * p.stock,
      potentialProfit: (p.sellPrice - p.avgBuyPrice) * p.stock,
    })));

    // Customer data
    const customerStats = await Promise.all(
      customers.map(async c => {
        const cSales = filteredSales.filter(s => s.customerId === c.id);
        const total = cSales.reduce((s, x) => s + x.finalAmount, 0);
        const balance = await paymentApi.getCustomerBalance(c.id);
        return { name: c.name, total, debt: balance > 0 ? balance : 0, count: cSales.length };
      })
    );
    setCustomerData(customerStats.sort((a, b) => b.total - a.total));
  };

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });

    const fontFace = 'helvetica';
    doc.setFont(fontFace);
    doc.setFontSize(18);
    doc.text('Hesabdar Report', 140, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 30, { align: 'center' });

    const data = activeTab === 'sales' ? salesData.map(s => [s.name, s.value.toLocaleString()])
      : activeTab === 'profit' ? profitData.map(s => [s.name, s.value.toLocaleString()])
      : activeTab === 'inventory' ? inventoryData.map(s => [s.name, s.stock, s.value.toLocaleString()])
      : customerData.map(s => [s.name, s.total.toLocaleString(), s.debt.toLocaleString(), s.count]);

    const headers = activeTab === 'sales' ? [['Month', 'Amount']]
      : activeTab === 'profit' ? [['Month', 'Profit']]
      : activeTab === 'inventory' ? [['Product', 'Stock', 'Value']]
      : [['Customer', 'Total', 'Debt', 'Invoices']];

    (doc as any).autoTable({
      head: headers,
      body: data,
      startY: 40,
      theme: 'grid',
      styles: { font: fontFace, fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    doc.save(`report-${activeTab}.pdf`);
  };

  const exportToExcel = () => {
    const data = activeTab === 'sales' ? salesData
      : activeTab === 'profit' ? profitData
      : activeTab === 'inventory' ? inventoryData
      : customerData;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `report-${activeTab}.xlsx`);
  };

  const tabs = [
    { key: 'sales' as const, label: 'گزارش فروش', icon: ShoppingBag },
    { key: 'profit' as const, label: 'گزارش سود', icon: TrendingUp },
    { key: 'inventory' as const, label: 'گزارش انبار', icon: Package },
    { key: 'customers' as const, label: 'گزارش مشتریان', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">گزارشات</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">گزارش‌های مالی و آماری</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm">
            <FileText size={16} /> PDF
          </button>
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
            <FileSpreadsheet size={16} /> Excel
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">کل فروش</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalSales.toLocaleString('fa-IR')} تومان</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">کل سود</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalProfit.toLocaleString('fa-IR')} تومان</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">سود خالص</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.netProfit.toLocaleString('fa-IR')} تومان</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm text-gray-500 dark:text-gray-400">کل هزینه‌ها</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalExpenses.toLocaleString('fa-IR')} تومان</p>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">بازه زمانی:</span>
        <input type="date" value={dateRange.from} onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" />
        <span className="text-gray-400 dark:text-gray-500">تا</span>
        <input type="date" value={dateRange.to} onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white" />
        <button onClick={() => setDateRange({ from: '', to: '' })} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">همه</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Chart Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
        {activeTab === 'sales' && (
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">نمودار فروش</h3>
            {salesData.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای موجود نیست</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('fa-IR')} contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn' }} />
                  <Bar dataKey="value" fill="#3b82f6" name="فروش" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {activeTab === 'profit' && (
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">نمودار سود</h3>
            {profitData.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">داده‌ای موجود نیست</p>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={profitData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => value.toLocaleString('fa-IR')} contentStyle={{ direction: 'rtl', fontFamily: 'Vazirmatn' }} />
                  <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} name="سود" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">گزارش انبار</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">کالا</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">موجودی</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">ارزش</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">سود احتمالی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {inventoryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.stock}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.value.toLocaleString('fa-IR')} تومان</td>
                      <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">{item.potentialProfit.toLocaleString('fa-IR')} تومان</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">گزارش مشتریان</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">مشتری</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">کل خرید</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">بدهی</th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تعداد فاکتور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {customerData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.total.toLocaleString('fa-IR')} تومان</td>
                      <td className="px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">{item.debt.toLocaleString('fa-IR')} تومان</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
