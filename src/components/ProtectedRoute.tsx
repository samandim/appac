import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { settingsApi } from '../db';

export default function ProtectedRoute() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      const pw = await settingsApi.getPassword();
      const session = await settingsApi.get('lastSession');
      if (!pw) {
        setIsAuth(true);
      } else {
        setIsAuth(session === 'active');
      }
    };
    check();
  }, []);

  if (isAuth === null) return null;
  return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
}
