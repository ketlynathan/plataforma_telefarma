import { useEffect, useState } from 'react';
import { consultasApi, messagesApi } from '../../api/endpoints';
import { Consulta, CONSULTA_STATUS_LABELS, formatFarmaceutico } from '../../types';
import { Mensagens } from '../../components/Mensagens';

function isoToBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

function salaLiberada(consulta: Consulta): boolean {
  if (!consulta.farmaceuticoEntrouEm) return false;
  if (consulta.status !== 'FARMACEUTICO_AGUARDANDO' && consulta.status !== 'EM_ATENDIMENTO') return false;
  const inicio = new Date(`${consulta.data.slice(0, 10)}T${consulta.hora}:00`);
  return Date.now() >= inicio.getTime();
}

function avisoSala(consulta: Consulta): string | null {
  if (!consulta.farmaceuticoEntrouEm) return null;
  const inicio = new Date(`${consulta.data.slice(0, 10)}T${consulta.hora}:00`);
  if (Date.now() < inicio.getTime()) return 'O farmacêutico já abriu a sala. A entrada será liberada no horário agendado; você já pode enviar mensagens.';
  if (consulta.status === 'FARMACEUTICO_AGUARDANDO') return 'O farmacêutico está disponível. Use as mensagens para combinar a entrada, especialmente em caso de atraso.';
  return null;
}

export function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagemAberta, setMensagemAberta] = useState<string | null>(null);
  const [room, setRoom] = useState<{ roomUrl: string; status: string } | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

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
    try {
      const { data } = await consultasApi.room(id);
      setRoom({ roomUrl: data.roomUrl, status: data.status });
    } catch (err: any) {
      setRoom({ roomUrl: '', status: err?.response?.data?.message ?? 'Erro ao abrir sala.' });
    }
  };

  const fechaSala = () => {
    setAberta(null);
    setMensagemAberta(null);
    setRoom(null);
  };

  const mudaStatus = async (id: string, status: string) => {
    try {
      await consultasApi.updateStatus(id, status);
      await carrega();
    } catch {
      // erro silencioso
    }
  };

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
                  <td>{isoToBR(c.data)}</td>
                  <td>{c.hora}</td>
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
            {aberta && room?.roomUrl && (
              <iframe
                src={room.roomUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }}
                title="Sala de consulta"
              />
            )}
            {aberta && !room?.roomUrl && <div className="fc-alert info">{room?.status ?? 'A sala ainda não está liberada.'}</div>}
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
