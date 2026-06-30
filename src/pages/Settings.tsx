import { useState, useEffect } from 'react';
import { Save, Download, Upload, Database, Shield, Key, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { settingsApi, exportDatabase, importDatabase } from '../db';
import bcrypt from 'bcryptjs';
import type { BusinessInfo } from '../types';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: 'کسب‌وکار من', phone: '', address: '', logo: '',
    currency: 'تومان', invoicePrefix: 'INV', nextInvoiceNumber: 1,
  });
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const info = await settingsApi.getBusinessInfo();
      setBusinessInfo(info);
    };
    load();
  }, []);

  const handleSaveBusiness = async () => {
    await settingsApi.setBusinessInfo(businessInfo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    const current = await settingsApi.getPassword();
    if (current) {
      const valid = await bcrypt.compare(currentPassword, current);
      if (!valid) { setPasswordError('رمز عبور فعلی اشتباه است'); return; }
    }
    if (newPassword !== confirmPassword) { setPasswordError('رمز عبورها یکسان نیستند'); return; }
    if (newPassword.length < 4) { setPasswordError('رمز عبور باید حداقل ۴ کاراکتر باشد'); return; }
    const hash = await bcrypt.hash(newPassword, 10);
    await settingsApi.setPassword(hash);
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExport = async () => {
    const data = await exportDatabase();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hesabdar-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    if (confirm('این عملیات تمام داده‌های فعلی را جایگزین می‌کند. آیا مطمئن هستید؟')) {
      await importDatabase(text);
      alert('بازیابی با موفقیت انجام شد');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">تنظیمات</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">اطلاعات کسب‌وکار و امنیت</p>
      </div>

      {saved && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg text-sm">
          تغییرات با موفقیت ذخیره شد
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Database size={20} className="text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold text-gray-900 dark:text-white">اطلاعات کسب‌وکار</h3>
          </div>
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نام کسب‌وکار</label>
              <input value={businessInfo.name} onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">شماره تماس</label>
              <input value={businessInfo.phone} onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">آدرس</label>
              <textarea value={businessInfo.address} onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">واحد پول</label>
                <select value={businessInfo.currency} onChange={(e) => setBusinessInfo({ ...businessInfo, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                  <option value="تومان">تومان</option>
                  <option value="ریال">ریال</option>
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">پیش‌وند فاکتور</label>
                <input value={businessInfo.invoicePrefix} onChange={(e) => setBusinessInfo({ ...businessInfo, invoicePrefix: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <button onClick={handleSaveBusiness} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
              <Save size={16} /> ذخیره تنظیمات
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={20} className="text-amber-600 dark:text-amber-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">امنیت</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور فعلی</label>
              <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور جدید</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تکرار رمز عبور</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500" /></div>
            {passwordError && <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            <button type="submit" className="w-full flex items-center justify-center gap-2 bg-amber-600 text-white py-2 rounded-lg hover:bg-amber-700">
              <Key size={16} /> تغییر رمز عبور
            </button>
          </form>
        </div>

        {/* Theme Toggle */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sun size={20} className="text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-bold text-gray-900 dark:text-white">ظاهر</h3>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">تم نمایشی برنامه را انتخاب کنید</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'light'
                    ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Sun size={18} />
                <span className="text-sm font-medium">روشن</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Moon size={18} />
                <span className="text-sm font-medium">تاریک</span>
              </button>
            </div>
          </div>
        </div>

        {/* Backup */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Download size={20} className="text-emerald-600 dark:text-emerald-500" />
            <h3 className="font-bold text-gray-900 dark:text-white">پشتیبان‌گیری و بازیابی</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">دانلود پشتیبان از تمام داده‌ها</p>
              <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700">
                <Download size={16} /> دانلود پشتیبان (JSON)
              </button>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">بازیابی داده‌ها از فایل پشتیبان</p>
              <label className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer w-fit">
                <Upload size={16} /> بارگذاری فایل
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
