import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { consultasApi, messagesApi } from '../../api/endpoints';
import { Consulta, CONSULTA_STATUS_LABELS, formatFarmaceutico } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Mensagens } from '../../components/Mensagens';
import { SalaVideo } from '../../components/SalaVideo';
import type { VideoRoomSession } from '../../types';
import { appDateTimeToDate, formatConsultationTimes } from '../../utils/timezone';

function isoToBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function salaLiberada(consulta: Consulta): boolean {
  if (!consulta.farmaceuticoEntrouEm) return false;
  if (consulta.status !== 'FARMACEUTICO_AGUARDANDO' && consulta.status !== 'EM_ATENDIMENTO' && consulta.status !== 'FARMACEUTICO_AUSENTE') return false;
  const inicio = consulta.agendadoEmUtc
    ? new Date(consulta.agendadoEmUtc)
    : appDateTimeToDate(consulta.data.slice(0, 10), consulta.hora, consulta.agendaTimezone);
  const encerraEm = inicio.getTime() + 40 * 60_000;
  return Date.now() <= encerraEm;
}

function avisoSala(consulta: Consulta): string | null {
  if (!consulta.farmaceuticoEntrouEm) return null;
  if (consulta.status === 'FARMACEUTICO_AGUARDANDO' || consulta.status === 'FARMACEUTICO_AUSENTE') return 'O farmacêutico abriu a sala. Você já pode entrar na mesma chamada ou enviar uma mensagem.';
  return null;
}

export function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagemAberta, setMensagemAberta] = useState<string | null>(null);
  const [room, setRoom] = useState<VideoRoomSession | null>(null);
  const [roomError, setRoomError] = useState('');
  const [naoLidas, setNaoLidas] = useState(0);
  const [consultaDoLinkAberta, setConsultaDoLinkAberta] = useState(false);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const carrega = async () => {
    setLoading(true);
    try {
      const { data } = await consultasApi.me();
      setConsultas(data);
    } catch {
      // erro silencioso
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carrega();
    const interval = setInterval(() => {
      messagesApi.unreadCount().then(({ data }) => setNaoLidas(data.count ?? 0)).catch(() => {});
      carrega();
    }, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entraNaSala = async (id: string) => {
    setAberta(id);
    setRoomError('');
    try {
      const { data } = await consultasApi.room(id);
      setRoom(data);
    } catch (err: any) {
      setRoom(null);
      setRoomError(err?.response?.data?.message ?? 'Erro ao abrir sala.');
    }
  };

  const marcaEntrada = async (id: string) => {
    try {
      await consultasApi.enterRoom(id);
      await carrega();
    } catch {
      // O polling continuará refletindo o estado persistido.
    }
  };

  const fechaSala = () => {
    setAberta(null);
    setMensagemAberta(null);
    setRoom(null);
    setRoomError('');
  };

  const mudaStatus = async (id: string, status: string) => {
    try {
      await consultasApi.updateStatus(id, status);
      await carrega();
    } catch {
      // erro silencioso
    }
  };

  useEffect(() => {
    const id = searchParams.get('consulta');
    if (!id || consultaDoLinkAberta || !consultas.some((consulta) => consulta.id === id)) return;
    setConsultaDoLinkAberta(true);
    void entraNaSala(id);
  }, [consultas, consultaDoLinkAberta, searchParams]);

  return (
    <div>
      <h1>Minhas consultas {naoLidas > 0 && <span className="fc-badge">{naoLidas} nova(s)</span>}</h1>

      {loading ? (
        <p>Carregando...</p>
      ) : consultas.length === 0 ? (
        <div className="fc-alert info">Nenhuma consulta encontrada para este usuário.</div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Farmacêutico(a)</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Observações</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {[...consultas]
              .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
              .map((c) => (
                <tr key={c.id}>
                  <td>{c.farmaceutico ? formatFarmaceutico(c.farmaceutico.nome, c.farmaceutico.tratamento, c.farmaceutico.crf) : '—'}</td>
                  <td>{formatConsultationTimes(c.data, c.hora, c.agendaTimezone, user?.timezone, c.agendadoEmUtc).userDate}</td>
                  <td>
                    <strong>{formatConsultationTimes(c.data, c.hora, c.agendaTimezone, user?.timezone, c.agendadoEmUtc).userTime}</strong>
                    <small style={{ display: 'block', color: 'var(--text-muted)' }}>
                      Agenda: {formatConsultationTimes(c.data, c.hora, c.agendaTimezone, user?.timezone, c.agendadoEmUtc).agendaDate} {formatConsultationTimes(c.data, c.hora, c.agendaTimezone, user?.timezone, c.agendadoEmUtc).agendaTime}
                    </small>
                  </td>
                  <td>{CONSULTA_STATUS_LABELS[c.status] ?? c.status}</td>
                  <td>{c.observacoes}</td>
                  <td>
                    {c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA' && salaLiberada(c) && (
                      <button className="fc-button primary" style={{ width: 'auto', fontSize: 13, padding: '4px 10px' }} onClick={() => entraNaSala(c.id)}>
                        Entrar na consulta
                      </button>
                    )}
                    {c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA' && !salaLiberada(c) && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: '2.8rem', fontSize: 13, color: 'var(--text-muted)' }}>
                        {c.farmaceuticoEntrouEm ? 'Sala aberta; aguarde o horário' : 'Aguardando liberação'}
                      </span>
                    )}
                    {avisoSala(c) && <div className="fc-alert info" style={{ margin: '4px 0', padding: '6px 8px', fontSize: 12 }}>{avisoSala(c)}</div>}
                    {c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA' && (
                      <button className="fc-button" style={{ fontSize: 13, padding: '4px 10px', marginLeft: 6 }} onClick={() => setMensagemAberta(c.id)}>
                        Mensagem
                      </button>
                    )}
                    {(c.status === 'AGENDADA' || c.status === 'CONFIRMADA' || c.status === 'FARMACEUTICO_AGUARDANDO' || c.status === 'EM_ATENDIMENTO') && (
                      <button
                        className="fc-button danger"
                        style={{ fontSize: 13, padding: '4px 10px', marginLeft: 6 }}
                        onClick={() => mudaStatus(c.id, 'CANCELADA')}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}

      {(aberta || mensagemAberta) && (
        <div className="fc-modal" style={{ display: 'block' }}>
          <div className="fc-modal-content">
            <h2>{aberta ? 'Consulta' : 'Mensagens da consulta'}</h2>
            {aberta && room?.roomUrl && <SalaVideo session={room} onJoined={() => { if (aberta) void marcaEntrada(aberta); }} onClosed={fechaSala} />}
            {aberta && !room?.roomUrl && <div className="fc-alert info">{roomError || 'A sala ainda não está liberada.'}</div>}
            <Mensagens consultaId={aberta ?? mensagemAberta!} />
            <button className="fc-button" style={{ marginTop: 12 }} onClick={fechaSala}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
