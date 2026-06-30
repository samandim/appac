import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Truck, Package, ShoppingCart,
  ShoppingBag, CreditCard, Receipt, BarChart3, Settings, LogOut,
  Menu, ChevronRight
} from 'lucide-react';
import { settingsApi } from '../db';

const menuItems = [
  { path: '/', label: 'داشبورد', icon: LayoutDashboard },
  { path: '/customers', label: 'مشتریان', icon: Users },
  { path: '/suppliers', label: 'تامین‌کنندگان', icon: Truck },
  { path: '/products', label: 'کالا و انبار', icon: Package },
  { path: '/purchases', label: 'خریدها', icon: ShoppingCart },
  { path: '/sales', label: 'فروش‌ها', icon: ShoppingBag },
  { path: '/payments', label: 'پرداخت‌ها', icon: CreditCard },
  { path: '/expenses', label: 'هزینه‌ها', icon: Receipt },
  { path: '/reports', label: 'گزارشات', icon: BarChart3 },
  { path: '/settings', label: 'تنظیمات', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await settingsApi.set('lastSession', '');
    navigate('/login');
  };

  return (
    <aside className={`${collapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300`}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">ح</span>
            </div>
            <span className="font-bold text-gray-800 dark:text-gray-100">حسابدار</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
        >
          <Menu size={20} />
        </button>
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              <Icon size={20} />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
              {!collapsed && item.path === '/' && (
                <ChevronRight size={16} className="mr-auto text-gray-400 dark:text-gray-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full"
        >
          <LogOut size={20} />
          {!collapsed && <span className="text-sm font-medium">خروج</span>}
        </button>
      </div>
    </aside>
  );
}
