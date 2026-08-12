import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api/client';

export type UserTipo = 'cliente' | 'farmaceutico';

export interface User {
  id: string;
  nome: string;
  email: string;
  tipo: UserTipo;
  telefone?: string;
  cpf?: string;
  dataNascimento?: string;
  cep?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  doencasCronicas?: string;
  alergias?: string;
  medicamentosUso?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (data: { nome: string; email: string; senha: string; tipo: UserTipo; telefone?: string }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    const token = localStorage.getItem('fc_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get<User>('/users/me');
      setUser(data);
    } catch {
      localStorage.removeItem('fc_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, senha: string) => {
    const { data } = await api.post('/auth/login', { email, senha });
    localStorage.setItem('fc_token', data.access_token);
    setUser(data.user);
  };

  const register = async (payload: { nome: string; email: string; senha: string; tipo: UserTipo; telefone?: string }) => {
    await api.post('/auth/register', payload);
  };

  const logout = () => {
    localStorage.removeItem('fc_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
