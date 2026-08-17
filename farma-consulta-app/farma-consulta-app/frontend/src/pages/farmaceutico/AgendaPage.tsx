import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { availabilityApi, consultasApi } from '../../api/endpoints';
import { Consulta, CONSULTA_STATUS_LABELS, AvailabilitySlot } from '../../types';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function isoToBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function SlotEditor({ onSave }: { onSave: () => void }) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>(
    DIAS.map((_, diaSemana) => ({ diaSemana, horaInicio: '08:00', horaFim: '12:00', ativo: false })),
  );
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(true);

  useEffect(() => {
    availabilityApi
      .getMe()
      .then(({ data }) => {
        const mapa: Record<number, AvailabilitySlot> = {};
        data.forEach((s) => {
          mapa[s.diaSemana] = s;
        });
        const carregados = DIAS.map((_, diaSemana) =>
          mapa[diaSemana] ?? { diaSemana, horaInicio: '08:00', horaFim: '12:00', ativo: false },
        );
        setSlots(carregados);
        // Se já existe disponibilidade configurada, começa recolhido.
        setAberto(!carregados.some((s) => s.ativo));
      })
      .catch((err) => {
        console.error('Falha ao carregar disponibilidade', err);
      });
  }, []);

  const salva = async () => {
    setSalvando(true);
    try {
      const payload = slots
        .filter((s) => s.ativo)
        .map((s) => ({
          diaSemana: s.diaSemana,
          horaInicio: s.horaInicio,
          horaFim: s.horaFim,
        }));
      await availabilityApi.update(payload);
      onSave();
      setAberto(false);
    } catch (err) {
      console.error('Falha ao salvar disponibilidade', err);
    } finally {
      setSalvando(false);
    }
  };

  const diasAtivos = slots.filter((s) => s.ativo);

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        onClick={() => setAberto((prev) => !prev)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Disponibilidade semanal</h3>
          {!aberto && (
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {diasAtivos.length === 0
                ? 'Nenhum dia ativo configurado.'
                : diasAtivos.map((s) => `${DIAS[s.diaSemana]} ${s.horaInicio}-${s.horaFim}`).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          className="fc-button secondary"
          style={{ width: 'auto', padding: '0.4rem 1rem' }}
          onClick={(e) => {
            e.stopPropagation();
            setAberto((prev) => !prev);
          }}
        >
          {aberto ? 'Recolher' : 'Editar'}
        </button>
      </div>

      {aberto && (
        <>
          <table className="fc-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Dia</th>
                <th>Ativo</th>
                <th>Início</th>
                <th>Fim</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={s.diaSemana}>
                  <td>{DIAS[s.diaSemana]}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={s.ativo ?? false}
                      onChange={(e) =>
                        setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, ativo: e.target.checked } : p)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="fc-input"
                      type="time"
                      value={s.horaInicio}
                      onChange={(e) => setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, horaInicio: e.target.value } : p)))}
                    />
                  </td>
                  <td>
                    <input
                      className="fc-input"
                      type="time"
                      value={s.horaFim}
                      onChange={(e) => setSlots((prev) => prev.map((p, idx) => (idx === i ? { ...p, horaFim: e.target.value } : p)))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="fc-button primary" style={{ marginTop: 12, width: 'auto', padding: '0.6rem 1.5rem' }} onClick={salva} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar disponibilidade'}
          </button>
        </>
      )}
    </div>
  );
}

function ConviteForm() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const envia = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado('');
    setErro('');
    setEnviando(true);
    try {
      const { data } = await api.post('/invites', { email });
      setEnviado(data.mensagem ?? 'Convite enviado por e-mail.');
      setEmail('');
    } catch (err: any) {
      console.error('Falha ao enviar convite', err);
      setErro(err?.response?.data?.message ?? 'Não foi possível enviar o convite.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Convidar farmacêutico(a)</h3>
      <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
        Farmacêuticos só podem entrar na plataforma por convite. Envie o link de cadastro para um colega.
      </p>
      {enviado && <div className="fc-alert success">{enviado}</div>}
      {erro && <div className="fc-alert error">{erro}</div>}
      <form onSubmit={envia}>
        <div className="fc-field">
          <label>Email do colega</label>
          <input
            className="fc-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button
          className="fc-button primary"
          type="submit"
          disabled={enviando}
          style={{ width: 'auto', padding: '0.6rem 1.5rem' }}
        >
          {enviando ? 'Enviando...' : 'Enviar convite'}
        </button>
      </form>
    </div>
  );
}

export function AgendaPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  const carrega = () => {
    setLoading(true);
    consultasApi
      .mine()
      .then(({ data }) => setConsultas(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carrega();
    const interval = window.setInterval(carrega, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Minha agenda</h1>
      <SlotEditor onSave={carrega} />
      <ConviteForm />

      <h3>Consultas agendadas</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : consultas.length === 0 ? (
        <div className="fc-alert info">Nenhuma consulta cadastrada até o momento.</div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Email</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Observações</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <tr key={c.id}>
                <td>{c.pacienteNome}</td>
                <td>{c.pacienteEmail}</td>
                <td>{isoToBR(c.data)}</td>
                <td>{c.hora}</td>
                <td>{CONSULTA_STATUS_LABELS[c.status] ?? c.status}</td>
                <td>{c.observacoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
