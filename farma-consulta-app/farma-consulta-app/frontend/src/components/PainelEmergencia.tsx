import { useEffect, useState } from 'react';
import { emergencyApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { EMERGENCY_STATUS_LABELS, EmergencyRequest } from '../types';

const STATUS_ATIVA = ['EM_ABERTO', 'ATENDIDA'];

export function PainelEmergencia() {
  const { user } = useAuth();
  const isFarmaceutico = user?.tipo === 'farmaceutico';
  const isCliente = user?.tipo === 'cliente';
  const [minhaEmergencia, setMinhaEmergencia] = useState<EmergencyRequest | null>(null);
  const [abertas, setAbertas] = useState<EmergencyRequest[]>([]);
  const [emergenciaAceita, setEmergenciaAceita] = useState<EmergencyRequest | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carrega = async () => {
    setCarregando(true);
    try {
      if (isCliente) {
        const { data } = await emergencyApi.minha();
        setMinhaEmergencia(data);
      } else if (isFarmaceutico) {
        const { data } = await emergencyApi.open();
        setAbertas(data);
      }
    } catch {
      // polling silencioso
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carrega();
    const interval = setInterval(carrega, 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCliente, isFarmaceutico]);

  const solicita = async () => {
    setErro('');
    try {
      const { data } = await emergencyApi.solicitar();
      setMinhaEmergencia(data);
      await carrega();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível solicitar.');
    }
  };

  const aceita = async (id: string) => {
    setErro('');
    try {
      const { data } = await emergencyApi.accept(id);
      setEmergenciaAceita(data);
      await carrega();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível aceitar.');
    }
  };

  const abreSala = async (id: string) => {
    setErro('');
    try {
      const { data } = await emergencyApi.openRoom(id);
      setEmergenciaAceita(data);
      await carrega();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível abrir a sala.');
    }
  };

  if (!isFarmaceutico && !isCliente) return null;

  return (
    <div className="fc-panel" style={{ marginTop: 24, borderColor: 'var(--danger-color)' }}>
      <h3 style={{ color: 'var(--danger-color)' }}>Emergência farmacêutica</h3>
      <p style={{ fontSize: 14 }}>
        {isCliente
          ? 'Solicite atendimento imediato. Todos os farmacêuticos ativos serão avisados e poderão entrar na chamada.'
          : 'Atenda solicitações em aberto. Após aceitar, abra a sala para liberar a entrada do paciente.'}
      </p>

      {erro && <div className="fc-alert error">{erro}</div>}

      {isCliente && (
        <>
          {minhaEmergencia && STATUS_ATIVA.includes(minhaEmergencia.status) ? (
            <div>
              <div className="fc-alert info">
                Status: <strong>{EMERGENCY_STATUS_LABELS[minhaEmergencia.status] ?? minhaEmergencia.status}</strong>
              </div>
              {minhaEmergencia.status === 'ATENDIDA' && minhaEmergencia.roomUrl && (
                <>
                  <div className="fc-alert success">O farmacêutico abriu a sala. Você já pode entrar na chamada.</div>
                  <button className="fc-button danger" onClick={() => window.open(minhaEmergencia.roomUrl, '_blank', 'noopener,noreferrer')}>
                    Entrar na sala de emergência
                  </button>
                </>
              )}
              {minhaEmergencia.status === 'ATENDIDA' && !minhaEmergencia.roomUrl && (
                <div className="fc-alert info">O farmacêutico aceitou a emergência. A entrada será liberada assim que ele abrir a sala.</div>
              )}
              {minhaEmergencia.status === 'EM_ABERTO' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Aguardando um farmacêutico. Todos os ativos foram avisados.
                </p>
              )}
            </div>
          ) : (
            <>
              {minhaEmergencia?.status === 'EXPIRADA' && <div className="fc-alert error">Nenhum farmacêutico conseguiu atender sua solicitação dentro do prazo.</div>}
              {minhaEmergencia?.status === 'ENCERRADA' && <div className="fc-alert info">A emergência foi encerrada. Você pode solicitar um novo atendimento.</div>}
              {minhaEmergencia?.status === 'CANCELADA' && <div className="fc-alert info">A emergência anterior foi cancelada. Você pode solicitar um novo atendimento.</div>}
              <button className="fc-button danger" onClick={solicita} disabled={carregando}>Solicitar emergência agora</button>
            </>
          )}
        </>
      )}

      {isFarmaceutico && (
        <>
          {emergenciaAceita?.status === 'ATENDIDA' && (
            <div className="fc-alert success" style={{ marginBottom: 12 }}>
              Emergência aceita para <strong>{emergenciaAceita.cliente?.nome ?? 'o paciente'}</strong>.
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="fc-button danger" style={{ width: 'auto' }} onClick={() => abreSala(emergenciaAceita.id)}>
                  Abrir sala e avisar paciente
                </button>
                {emergenciaAceita.roomUrl && <button className="fc-button primary" style={{ width: 'auto' }} onClick={() => window.open(emergenciaAceita.roomUrl, '_blank', 'noopener,noreferrer')}>Entrar na sala</button>}
              </div>
            </div>
          )}
          {carregando ? <p>Carregando...</p> : abertas.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhuma emergência em aberto no momento.</p>
          ) : (
            <div>
              {abertas.map((em) => (
                <div key={em.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  <span><strong>{em.cliente?.nome}</strong> — aguardando desde {new Date(em.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  <button className="fc-button danger" style={{ width: 'auto', fontSize: 13, padding: '4px 12px' }} onClick={() => aceita(em.id)}>Atender</button>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Ao aceitar, a solicitação fica reservada para você. Abra a sala para notificar e liberar o paciente.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
