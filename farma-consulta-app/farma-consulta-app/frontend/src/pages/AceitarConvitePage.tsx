import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { APP_TITLE } from '../config';
import { invitesApi, authApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

export function AceitarConvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [validando, setValidando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    invitesApi
      .get(token)
      .then(({ data }) => setEmail(data.email))
      .catch((err: any) => setErro(err?.response?.data?.message ?? 'Convite inválido ou expirado.'))
      .finally(() => setValidando(false));
  }, [token]);

  const completaCadastro = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    if (nome.trim().length < 2 || senha.length < 6) {
      setErro('Preencha nome completo e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await invitesApi.complete(token!, { nome, senha, telefone });
      // Loga automaticamente após aceitar o convite.
      await login(data.email, senha);
      navigate('/farmaceutico');
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível concluir o cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fc-shell" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="fc-card" style={{ maxWidth: 480, width: '100%' }}>
        <h1 style={{ marginTop: 0 }}>{APP_TITLE}</h1>
        <p>Convite para farmacêutico(a)</p>

        {validando ? (
          <p>Validando convite...</p>
        ) : erro ? (
          <div className="fc-alert error">{erro}</div>
        ) : (
          <form onSubmit={completaCadastro}>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Conta vinculada ao convite: <strong>{email}</strong>
            </p>
            <div className="fc-field">
              <label>Nome completo</label>
              <input className="fc-input" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Senha</label>
              <input className="fc-input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Telefone (opcional)</label>
              <input className="fc-input" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <button className="fc-button primary" type="submit" disabled={submitting}>
              Aceitar convite e entrar
            </button>
          </form>
        )}

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 14 }}>
          <a href="/login" className="fc-link">Voltar ao login</a>
        </div>
      </div>
    </div>
  );
}
