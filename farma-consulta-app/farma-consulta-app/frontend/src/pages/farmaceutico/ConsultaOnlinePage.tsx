import { useEffect, useState } from 'react';
import { consultasApi } from '../../api/endpoints';
import { Consulta, CONSULTA_STATUS_LABELS, VideoRoomSession } from '../../types';
import { Mensagens } from '../../components/Mensagens';
import { SalaVideo } from '../../components/SalaVideo';
import { appTodayIso } from '../../utils/timezone';

function isoToBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function ConsultaOnlinePage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagemAberta, setMensagemAberta] = useState<string | null>(null);
  const [room, setRoom] = useState<VideoRoomSession | null>(null);
  const [roomError, setRoomError] = useState('');

  const carrega = async () => {
    setCarregando(true);
    try {
      const { data } = await consultasApi.mine();
      const hoje = appTodayIso();
      const filtradas = data.filter(
        (c) =>
          c.data.slice(0, 10) >= hoje &&
          c.status !== 'CANCELADA' &&
          c.status !== 'CONCLUIDA',
      );
      setConsultas(filtradas.slice(0, 20));
    } catch {
      // erro silencioso
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carrega();
    const interval = window.setInterval(carrega, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  const entraSalaAtual = async (id: string) => {
    setAberta(id);
    setRoom(null);
    setRoomError('');
    try {
      const { data } = await consultasApi.room(id);
      setRoom(data);
      await carrega();
    } catch (err: any) {
      setRoomError(err?.response?.data?.message ?? 'Não foi possível abrir a sala.');
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

  const fechaSala = async () => {
    if (aberta) {
      try {
        await consultasApi.closeRoom(aberta);
      } catch {
        // Mesmo se a sala externa já tiver sido fechada, atualizamos a tela local.
      }
    }
    setAberta(null);
    setMensagemAberta(null);
    setRoom(null);
    setRoomError('');
    await carrega();
  };

  return (
    <div>
      <h1>Consultas agendadas</h1>
      <p>Abra a sala entre 30 minutos antes e 40 minutos depois do horário. O paciente receberá automaticamente o acesso à mesma chamada.</p>

      {carregando ? (
        <p>Carregando...</p>
      ) : consultas.length === 0 ? (
        <div className="fc-alert info">Nenhuma consulta em aberto.</div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <tr key={c.id}>
                <td>{c.pacienteNome}</td>
                <td>{isoToBR(c.data)}</td>
                <td>{c.hora}</td>
                <td>{CONSULTA_STATUS_LABELS[c.status] ?? c.status}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="fc-button primary"
                      style={{ width: 'auto', fontSize: 13, padding: '4px 10px' }}
                      onClick={() => entraSalaAtual(c.id)}
                    >
                      {c.status === 'FARMACEUTICO_AUSENTE' ? 'Reabrir atendimento' : c.farmaceuticoEntrouEm ? 'Entrar na sala atual' : 'Abrir atendimento'}
                    </button>
                    <button
                      className="fc-button"
                      style={{ fontSize: 13, padding: '4px 10px' }}
                      onClick={() => setMensagemAberta(c.id)}
                    >
                      Mensagem
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {(aberta || mensagemAberta) && (
        <div className="fc-modal" style={{ display: 'block' }}>
          <div className="fc-modal-content">
            <h2>{aberta ? 'Sala de atendimento' : 'Mensagens da consulta'}</h2>
            {aberta && room && <SalaVideo session={room} onJoined={() => { if (aberta) void marcaEntrada(aberta); }} onClosed={() => { void fechaSala(); }} />}
            {aberta && !room && <div className="fc-alert error">{roomError || 'Não foi possível criar a sala. Tente novamente.'}</div>}
            <Mensagens consultaId={aberta ?? mensagemAberta!} />
            <button className="fc-button" style={{ marginTop: 12 }} onClick={fechaSala}>
              Fechar sala e atualizar status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
