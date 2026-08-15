import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { TopNav } from './components/TopNav';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ClienteDashboardPage } from './pages/cliente/DashboardPage';
import { AgendamentoPage } from './pages/cliente/AgendamentoPage';
import { ConsultasPage } from './pages/cliente/ConsultasPage';
import { PerfilPage } from './pages/cliente/PerfilPage';
import { FarmaceuticoDashboardPage } from './pages/farmaceutico/DashboardPage';
import { AgendaPage } from './pages/farmaceutico/AgendaPage';
import { PacientesPage } from './pages/farmaceutico/PacientesPage';
import { ConsultaOnlinePage } from './pages/farmaceutico/ConsultaOnlinePage';
import { RecuperarSenhaPage } from './pages/RecuperarSenhaPage';
import { AceitarConvitePage } from './pages/AceitarConvitePage';
import { PainelEmergencia } from './components/PainelEmergencia';

const CLIENTE_NAV = [
  { label: 'Dashboard', path: '/cliente' },
  { label: 'Agendar consulta', path: '/cliente/agendar' },
  { label: 'Minhas consultas', path: '/cliente/consultas' },
  { label: 'Perfil', path: '/cliente/perfil' },
];

const FARMACEUTICO_NAV = [
  { label: 'Dashboard', path: '/farmaceutico' },
  { label: 'Agenda', path: '/farmaceutico/agenda' },
  { label: 'Consulta online', path: '/farmaceutico/consulta-online' },
  { label: 'Pacientes', path: '/farmaceutico/pacientes' },
];

function ClienteLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="fc-shell">
      <TopNav options={CLIENTE_NAV} activePath={location.pathname} />
      {children}
    </div>
  );
}

function FarmaceuticoLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <div className="fc-shell">
      <TopNav options={FARMACEUTICO_NAV} activePath={location.pathname} />
      {children}
    </div>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="fc-shell">Carregando...</div>;
  if (!user) return <HomePage />;
  return <Navigate to={user.tipo === 'cliente' ? '/cliente' : '/farmaceutico'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar-senha" element={<RecuperarSenhaPage />} />
      <Route path="/aceitar-convite/:token" element={<AceitarConvitePage />} />

      <Route
        path="/cliente"
        element={
          <ProtectedRoute tipo="cliente">
            <ClienteLayout><ClienteDashboardPage /></ClienteLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/agendar"
        element={
          <ProtectedRoute tipo="cliente">
            <ClienteLayout><AgendamentoPage /></ClienteLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/consultas"
        element={
          <ProtectedRoute tipo="cliente">
            <ClienteLayout><ConsultasPage /></ClienteLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cliente/perfil"
        element={
          <ProtectedRoute tipo="cliente">
            <ClienteLayout><PerfilPage /></ClienteLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/farmaceutico"
        element={
          <ProtectedRoute tipo="farmaceutico">
            <FarmaceuticoLayout><FarmaceuticoDashboardPage /></FarmaceuticoLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmaceutico/agenda"
        element={
          <ProtectedRoute tipo="farmaceutico">
            <FarmaceuticoLayout><AgendaPage /></FarmaceuticoLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmaceutico/consulta-online"
        element={
          <ProtectedRoute tipo="farmaceutico">
            <FarmaceuticoLayout><ConsultaOnlinePage /></FarmaceuticoLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/farmaceutico/pacientes"
        element={
          <ProtectedRoute tipo="farmaceutico">
            <FarmaceuticoLayout><PacientesPage /></FarmaceuticoLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
