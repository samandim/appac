import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { settingsApi } from '../db';
import bcrypt from 'bcryptjs';

export default function Login() {
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const pw = await settingsApi.getPassword();
      setHasPassword(!!pw);
    };
    check();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pw = await settingsApi.getPassword();
    if (!pw) {
      if (newPassword !== confirmPassword) {
        setError('رمز عبورها یکسان نیستند');
        return;
      }
      if (newPassword.length < 4) {
        setError('رمز عبور باید حداقل ۴ کاراکتر باشد');
        return;
      }
      const hash = await bcrypt.hash(newPassword, 10);
      await settingsApi.setPassword(hash);
      await settingsApi.set('lastSession', 'active');
      navigate('/');
      return;
    }
    const valid = await bcrypt.compare(password, pw);
    if (valid) {
      await settingsApi.set('lastSession', 'active');
      navigate('/');
    } else {
      setError('رمز عبور اشتباه است');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">ح</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">حسابدار</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">نرم‌افزار مدیریت کسب‌وکار</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {hasPassword === false ? (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                این اولین ورود شماست. لطفاً رمز عبور تنظیم کنید.
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور جدید</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تکرار رمز عبور</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رمز عبور</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 dark:text-white"
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-2 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {hasPassword === false ? 'تنظیم رمز عبور' : 'ورود'}
          </button>
        </form>
      </div>
    </div>
  );
}
