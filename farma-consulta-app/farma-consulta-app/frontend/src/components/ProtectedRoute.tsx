import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserTipo } from '../context/AuthContext';

export function ProtectedRoute({ tipo, children }: { tipo?: UserTipo; children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="fc-shell">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (tipo && user.tipo !== tipo) {
    const fallback = user.tipo === 'cliente' ? '/cliente' : user.tipo === 'admin' ? '/admin' : '/farmaceutico';
    return <Navigate to={fallback} replace />;
  }
  return <>{children}</>;
}
