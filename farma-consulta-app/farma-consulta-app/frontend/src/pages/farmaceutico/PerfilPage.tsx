import { FormEvent, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../api/client';
import { calendarApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { TIMEZONE_OPTIONS } from '../../utils/timezone';

type CalendarState = { configured: boolean; connected: boolean; connectedAt: string | null };

export function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [form, setForm] = useState({ tratamento: 'Dr.', nome: '', telefone: '', crf: '', banco: '', agencia: '', contaBancaria: '', chavePix: '', timezone: 'America/Sao_Paulo' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calendar, setCalendar] = useState<CalendarState | null>(null);
  const [calendarBusy, setCalendarBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      tratamento: user.tratamento ?? 'Dr.', nome: user.nome ?? '', telefone: user.telefone ?? '', crf: user.crf ?? '',
      banco: user.banco ?? '', agencia: user.agencia ?? '', contaBancaria: user.contaBancaria ?? '', chavePix: user.chavePix ?? '',
      timezone: user.timezone ?? 'America/Sao_Paulo',
    });
  }, [user]);

  useEffect(() => {
    let ativo = true;
    calendarApi.status()
      .then(({ data }) => { if (ativo) setCalendar(data); })
      .catch(() => { if (ativo) setCalendar(null); });
    const query = new URLSearchParams(location.search);
    if (query.get('calendar') === 'connected') {
      setMessage({ type: 'success', text: 'Google Calendar conectado. Os próximos agendamentos criarão eventos automaticamente.' });
      window.history.replaceState({}, '', location.pathname);
    }
    if (query.get('calendar') === 'error') {
      setMessage({ type: 'error', text: 'Não foi possível concluir a conexão com o Google Calendar. Tente novamente.' });
      window.history.replaceState({}, '', location.pathname);
    }
    return () => { ativo = false; };
  }, [location.pathname, location.search]);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => ({ ...current, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setMessage(null); setSubmitting(true);
    try { await api.patch('/users/me', form); await refreshUser(); setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' }); }
    catch (err: any) { setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível atualizar o perfil.' }); }
    finally { setSubmitting(false); }
  };

  const connectCalendar = async () => {
    setCalendarBusy(true); setMessage(null);
    try {
      const { data } = await calendarApi.connect();
      window.location.assign(data.url);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível iniciar a conexão com o Google Calendar.' });
      setCalendarBusy(false);
    }
  };

  const disconnectCalendar = async () => {
    if (!window.confirm('Desconectar o Google Calendar? Os eventos já criados continuarão no calendário, mas novos agendamentos não serão adicionados.')) return;
    setCalendarBusy(true); setMessage(null);
    try {
      await calendarApi.disconnect();
      setCalendar((current) => current ? { ...current, connected: false, connectedAt: null } : current);
      setMessage({ type: 'success', text: 'Google Calendar desconectado.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível desconectar o Google Calendar.' });
    } finally { setCalendarBusy(false); }
  };

  return <div>
    <h1>Meu perfil profissional</h1>
    <p>Esses dados podem ser exibidos aos pacientes durante o agendamento.</p>
    {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}
    <form onSubmit={submit} style={{ maxWidth: 720 }}>
      <h3>Identificação profissional</h3>
      <div className="fc-grid-2">
        <div className="fc-field"><label>Tratamento</label><select className="fc-select" value={form.tratamento} onChange={update('tratamento')}><option>Dr.</option><option>Dra.</option></select></div>
        <div className="fc-field"><label>Nome completo</label><input className="fc-input" value={form.nome} onChange={update('nome')} required /></div>
        <div className="fc-field"><label>E-mail</label><input className="fc-input" value={user?.email ?? ''} disabled /></div>
        <div className="fc-field"><label>Telefone</label><input className="fc-input" value={form.telefone} onChange={update('telefone')} /></div>
        <div className="fc-field"><label>CRF</label><input className="fc-input" value={form.crf} onChange={update('crf')} placeholder="Ex.: SP-123456" /></div>
      </div>
      <h3>Fuso da agenda</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Os horários das consultas serão definidos neste fuso e convertidos para o paciente quando ele estiver em outra região.</p>
      <div className="fc-field">
        <label>Região da agenda</label>
        <select className="fc-select" value={form.timezone} onChange={update('timezone')}>
          {TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      <section className="fc-card" style={{ margin: '24px 0', maxWidth: 720 }}>
        <h3 style={{ marginTop: 0 }}>Google Calendar</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Conecte o seu calendário para que cada nova consulta seja criada automaticamente com o paciente como convidado e lembretes de 30, 15 e 0 minutos. O paciente também recebe o convite e um arquivo de calendário no e-mail de confirmação.
        </p>
        {!calendar?.configured && <div className="fc-alert info">A integração ainda não foi configurada pela plataforma.</div>}
        {calendar?.configured && calendar.connected && <div className="fc-alert success">Calendário conectado. Os próximos agendamentos serão adicionados ao calendário principal.</div>}
        {calendar?.configured && !calendar.connected && <div className="fc-alert info">Nenhum calendário conectado a este perfil.</div>}
        {calendar?.configured && (calendar.connected ? (
          <button type="button" className="fc-button" onClick={disconnectCalendar} disabled={calendarBusy}>
            {calendarBusy ? 'Desconectando...' : 'Desconectar Google Calendar'}
          </button>
        ) : (
          <button type="button" className="fc-button primary" onClick={connectCalendar} disabled={calendarBusy}>
            {calendarBusy ? 'Abrindo Google...' : 'Conectar Google Calendar'}
          </button>
        ))}
      </section>

      <h3>Dados bancários</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Campos opcionais, preparados para futuros repasses.</p>
      <div className="fc-grid-2">
        <div className="fc-field"><label>Banco</label><input className="fc-input" value={form.banco} onChange={update('banco')} /></div>
        <div className="fc-field"><label>Agência</label><input className="fc-input" value={form.agencia} onChange={update('agencia')} /></div>
        <div className="fc-field"><label>Conta</label><input className="fc-input" value={form.contaBancaria} onChange={update('contaBancaria')} /></div>
        <div className="fc-field"><label>Chave Pix</label><input className="fc-input" value={form.chavePix} onChange={update('chavePix')} /></div>
      </div>
      <button className="fc-button primary" type="submit" disabled={submitting}>{submitting ? 'Salvando...' : 'Salvar alterações'}</button>
    </form>
  </div>;
}
