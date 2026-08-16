import { useEffect, useState } from 'react';
import { consultasApi } from '../../api/endpoints';
import { Consulta, CONSULTA_STATUS_LABELS } from '../../types';
import { Mensagens } from '../../components/Mensagens';

function isoToBR(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_PASSEIVEIS = ['AGENDADA', 'CONFIRMADA', 'CLIENTE_AGUARDANDO', 'FARMACEUTICO_AGUARDANDO', 'EM_ATENDIMENTO'];

export function ConsultaOnlinePage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [mensagemAberta, setMensagemAberta] = useState<string | null>(null);
  const [roomUrl, setRoomUrl] = useState('');

  const carrega = async () => {
    setCarregando(true);
    try {
      const { data } = await consultasApi.mine();
      // Mostra consultas de hoje e futuras em aberto.
      const hoje = new Date().toISOString().slice(0, 10);
      const filtradas = data.filter((c) => c.data.slice(0, 10) >= hoje && c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA');
      setConsultas(filtradas.slice(0, 20));
    } catch {
      // erro silencioso
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carrega();
  }, []);

  const abreSala = async (id: string) => {
    setAberta(id);
    try {
      const { data } = await consultasApi.newRoom(id);
      setRoomUrl(data.roomUrl);
    } catch {
      setRoomUrl('');
    }
  };

  const fechaSala = async () => {
    if (aberta) {
      try {
        await consultasApi.closeRoom(aberta);
      } catch {
        // Mesmo se a sala externa já tiver sido fechada, a janela local pode ser encerrada.
      }
    }
    setAberta(null);
    setMensagemAberta(null);
    setRoomUrl('');
    await carrega();
  };

  const admiteAtrasado = async (id: string) => {
    try {
      await consultasApi.admitLate(id);
      await carrega();
    } catch {
      // erro silencioso
    }
  };

  const passouTolerancia = (consulta: Consulta) => {
    const inicio = new Date(`${consulta.data.slice(0, 10)}T${consulta.hora}:00`);
    return Date.now() > inicio.getTime() + (consulta.toleranciaMin ?? 15) * 60_000;
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
      <h1>Consultas agendadas</h1>
      <p>Abra a sala de vídeo para conduzir o atendimento e acompanhe as transições de status.</p>

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
                    <button className="fc-button primary" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => abreSala(c.id)}>
                      Abrir / entrar na sala
                    </button>
                    <button className="fc-button" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => setMensagemAberta(c.id)}>
                      Mensagem
                    </button>
                    {passouTolerancia(c) && (c.status === 'FARMACEUTICO_AGUARDANDO' || c.status === 'CLIENTE_AGUARDANDO') && (
                      <button className="fc-button danger" style={{ fontSize: 13, padding: '4px 10px' }} onClick={() => admiteAtrasado(c.id)}>
                        Admitir paciente atrasado
                      </button>
                    )}
                    <select
                      className="fc-select"
                      style={{ fontSize: 13, padding: '3px 6px' }}
                      value={c.status}
                      onChange={(e) => mudaStatus(c.id, e.target.value)}
                    >
                      {STATUS_PASSEIVEIS.map((s) => (
                        <option key={s} value={s}>{CONSULTA_STATUS_LABELS[s]}</option>
                      ))}
                      <option value="CONCLUIDA">Concluída</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
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
            {aberta && roomUrl && <iframe src={roomUrl} allow="camera; microphone; fullscreen; display-capture; autoplay" style={{ width: '100%', height: 420, border: 'none', borderRadius: 8 }} title="Sala de consulta" />}
            {aberta && !roomUrl && <div className="fc-alert error">Não foi possível criar a sala. Tente novamente.</div>}
            <Mensagens consultaId={aberta ?? mensagemAberta!} />
            <button className="fc-button" style={{ marginTop: 12 }} onClick={fechaSala}>Fechar sala e atualizar status</button>
          </div>
        </div>
      )}
    </div>
  );
}
