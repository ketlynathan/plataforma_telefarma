import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PublicUserTipo } from '../context/AuthContext';
import { APP_TITLE } from '../config';

export function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'cadastro'>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // login state
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // cadastro state
  const [nome, setNome] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSenha, setRegSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipo, setTipo] = useState<PublicUserTipo>('cliente');

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, senha);
      navigate('/');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Email ou senha invalidos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!nome || !regEmail || !regSenha) {
      setError('Preencha nome, email e senha.');
      return;
    }
    setSubmitting(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
      await register({ nome, email: regEmail, senha: regSenha, tipo, telefone, timezone });
      setSuccess('Conta criada com sucesso. Agora voce ja pode entrar.');
      setMode('login');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Nao foi possivel criar a conta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fc-shell" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="fc-card" style={{ maxWidth: 480, width: '100%' }}>
        <div style={{ marginBottom: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>
          Plataforma de teleatendimento
        </div>
        <h1 style={{ marginTop: 0 }}>{APP_TITLE}</h1>
        <p>Entre para gerenciar consultas, acompanhar pacientes e manter seu perfil atualizado.</p>

        <div className="fc-nav">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            Login
          </button>
          <button className={mode === 'cadastro' ? 'active' : ''} onClick={() => setMode('cadastro')}>
            Cadastro
          </button>
        </div>

        {error && <div className="fc-alert error">{error}</div>}
        {success && <div className="fc-alert success">{success}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="fc-field">
              <label>Email</label>
              <input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Senha</label>
              <input className="fc-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <button className="fc-button primary" type="submit" disabled={submitting}>
              Entrar
            </button>
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <a
                href="/recuperar-senha"
                className="fc-link"
                style={{ fontSize: 14, color: 'var(--primary-color)', textDecoration: 'none' }}
              >
                Esqueceu sua senha?
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="fc-field">
              <label>Nome completo</label>
              <input className="fc-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Email</label>
              <input className="fc-input" type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Senha</label>
              <input className="fc-input" type="password" value={regSenha} onChange={(e) => setRegSenha(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Telefone</label>
              <input className="fc-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div className="fc-field">
              <label>Perfil</label>
              <select className="fc-select" value={tipo} onChange={(e) => setTipo(e.target.value as PublicUserTipo)}>
                <option value="cliente">cliente</option>
                <option value="farmaceutico">farmaceutico</option>
              </select>
            </div>
            <button className="fc-button primary" type="submit" disabled={submitting}>
              Criar conta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
