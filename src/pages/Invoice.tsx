import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Printer, Download } from 'lucide-react';
import { saleApi, customerApi, productApi, settingsApi } from '../db';
import type { Sale, Customer, Product } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Invoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [sale, setSale] = useState<Sale | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessInfo, setBusinessInfo] = useState({ name: '', phone: '', address: '', currency: 'تومان' });

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    const s = await saleApi.getById(id!);
    if (!s) { navigate('/sales'); return; }
    setSale(s);
    const c = await customerApi.getById(s.customerId);
    setCustomer(c || null);
    const saleItems = await saleApi.getItems(s.id);
    const prods = await productApi.getAll();
    setProducts(prods);
    const fullItems = saleItems.map(item => {
      const p = prods.find(pr => pr.id === item.productId);
      return { ...item, productName: p?.name || 'کالا' };
    });
    setItems(fullItems);
    const info = await settingsApi.getBusinessInfo();
    setBusinessInfo(info);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const fontFace = 'helvetica';
    doc.setFont(fontFace);

    // Header
    doc.setFontSize(20);
    doc.text(businessInfo.name || 'Hesabdar', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Phone: ${businessInfo.phone || '-'}`, 105, 28, { align: 'center' });
    doc.text(`Address: ${businessInfo.address || '-'}`, 105, 33, { align: 'center' });

    // Invoice Info
    doc.setFontSize(14);
    doc.text('INVOICE', 105, 45, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Invoice #: ${sale?.invoiceNumber || '-'}`, 20, 55);
    doc.text(`Date: ${sale?.date || '-'}`, 20, 62);
    doc.text(`Customer: ${customer?.name || '-'}`, 20, 69);
    doc.text(`Phone: ${customer?.phone || '-'}`, 20, 76);

    // Items table
    const tableData = items.map(item => [
      item.productName,
      item.qty.toString(),
      item.unitPrice.toLocaleString(),
      item.total.toLocaleString(),
    ]);

    (doc as any).autoTable({
      startY: 85,
      head: [['Product', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'grid',
      styles: { font: fontFace, fontSize: 10, halign: 'center' },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(11);
    doc.text(`Total: ${sale?.totalAmount.toLocaleString() || '0'}`, 160, finalY, { align: 'right' });
    doc.text(`Discount: ${sale?.discount.toLocaleString() || '0'}`, 160, finalY + 7, { align: 'right' });
    doc.setFontSize(14);
    doc.text(`Final: ${sale?.finalAmount.toLocaleString() || '0'} ${businessInfo.currency}`, 160, finalY + 18, { align: 'right' });

    doc.save(`invoice-${sale?.invoiceNumber}.pdf`);
  };

  if (!sale || !customer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => navigate('/sales')} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
          <ArrowRight size={16} /> بازگشت
        </button>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 bg-gray-800 dark:bg-gray-950 text-white px-4 py-2 rounded-lg hover:bg-gray-900 dark:hover:bg-gray-900">
            <Printer size={16} /> چاپ
          </button>
          <button onClick={handlePDF} className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div ref={printRef} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{businessInfo.name || 'حسابدار'}</h1>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {businessInfo.phone && <span className="ml-4">{businessInfo.phone}</span>}
            {businessInfo.address && <span>{businessInfo.address}</span>}
          </div>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">فاکتور فروش</h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <p className="text-gray-500 dark:text-gray-400">شماره فاکتور:</p>
            <p className="font-bold text-gray-900 dark:text-white">{sale.invoiceNumber}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">تاریخ:</p>
            <p className="font-bold text-gray-900 dark:text-white">{sale.date}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">مشتری:</p>
            <p className="font-bold text-gray-900 dark:text-white">{customer.name}</p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">شماره تماس:</p>
            <p className="font-bold text-gray-900 dark:text-white">{customer.phone}</p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full border border-gray-200 dark:border-gray-700 rounded-lg mb-6">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">ردیف</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">کالا</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">تعداد</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">قیمت واحد</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-300">جمع</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item, idx) => (
              <tr key={item.id}>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{idx + 1}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{item.productName}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.qty}</td>
                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">{item.unitPrice.toLocaleString('fa-IR')}</td>
                <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">{item.total.toLocaleString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">جمع کل:</span>
            <span className="font-bold text-gray-900 dark:text-white">{sale.totalAmount.toLocaleString('fa-IR')} {businessInfo.currency}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">تخفیف:</span>
            <span className="font-bold text-gray-900 dark:text-white">{sale.discount.toLocaleString('fa-IR')} {businessInfo.currency}</span>
          </div>
          <div className="flex justify-between text-lg border-t border-gray-200 dark:border-gray-700 pt-2">
            <span className="font-bold text-gray-900 dark:text-white">مبلغ نهایی:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{sale.finalAmount.toLocaleString('fa-IR')} {businessInfo.currency}</span>
          </div>
        </div>

        {sale.notes && (
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium text-gray-700 dark:text-gray-200">توضیحات:</span> {sale.notes}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400 dark:text-gray-500">
          <p>با تشکر از خرید شما</p>
        </div>
      </div>
    </div>
  );
}
