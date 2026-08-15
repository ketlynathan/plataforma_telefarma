import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_TITLE } from '../config';
import { authApi } from '../api/endpoints';

export function RecuperarSenhaPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const enviaCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess('Se a conta existir, enviamos um código de 6 dígitos para o seu e-mail.');
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível enviar o código.');
    } finally {
      setSubmitting(false);
    }
  };

  const verificaCodigo = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await authApi.verifyReset(email, codigo);
      setResetToken(data.resetToken);
      setStep(3);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Código inválido ou expirado.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmaNovaSenha = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (novaSenha.length < 6) {
      setError('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.confirmReset({ email, codigo, novaSenha, resetToken });
      setSuccess('Senha atualizada com sucesso! Você já pode entrar.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Não foi possível redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fc-shell" style={{ display: 'flex', justifyContent: 'center' }}>
      <div className="fc-card" style={{ maxWidth: 480, width: '100%' }}>
        <h1 style={{ marginTop: 0 }}>{APP_TITLE}</h1>
        <p>Recuperação de senha</p>
        <div className="fc-steps">
          <span className={step >= 1 ? 'done' : ''}>1. E-mail</span>
          <span className={step >= 2 ? 'done' : ''}>2. Código</span>
          <span className={step >= 3 ? 'done' : ''}>3. Nova senha</span>
        </div>

        {error && <div className="fc-alert error">{error}</div>}
        {success && <div className="fc-alert success">{success}</div>}

        {step === 1 && (
          <form onSubmit={enviaCodigo}>
            <div className="fc-field">
              <label>Email da conta</label>
              <input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="fc-button primary" type="submit" disabled={submitting}>
              Enviar código
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={verificaCodigo}>
            <div className="fc-field">
              <label>Código de 6 dígitos</label>
              <input
                className="fc-input"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                style={{ letterSpacing: 8, fontSize: 20, textAlign: 'center' }}
              />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              O código expira em 15 minutos. Errou o e-mail?{' '}
              <a href="/recuperar-senha" className="fc-link">Recomeçar</a>
            </p>
            <button className="fc-button primary" type="submit" disabled={submitting || codigo.length !== 6}>
              Verificar código
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={confirmaNovaSenha}>
            <div className="fc-field">
              <label>Nova senha</label>
              <input className="fc-input" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} required />
            </div>
            <div className="fc-field">
              <label>Confirmar nova senha</label>
              <input className="fc-input" type="password" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} required />
            </div>
            <button className="fc-button primary" type="submit" disabled={submitting}>
              Salvar nova senha
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
