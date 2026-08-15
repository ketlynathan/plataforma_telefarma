import { useEffect, useState } from 'react';
import { emergencyApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { EMERGENCY_STATUS_LABELS } from '../types';

export function PainelEmergencia() {
  const { user } = useAuth();
  const isFarmaceutico = user?.tipo === 'farmaceutico';
  const isCliente = user?.tipo === 'cliente';

  const [minhaEmergencia, setMinhaEmergencia] = useState<any>(null);
  const [abertas, setAbertas] = useState<any[]>([]);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carrega = () => {
    setCarregando(true);
    if (isCliente) {
      emergencyApi
        .minha()
        .then(({ data }) => setMinhaEmergencia(data))
        .catch(() => {});
    } else if (isFarmaceutico) {
      emergencyApi
        .open()
        .then(({ data }) => setAbertas(data))
        .catch(() => {});
    }
    setCarregando(false);
  };

  useEffect(() => {
    carrega();
    const interval = setInterval(carrega, 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solicita = async () => {
    setErro('');
    try {
      await emergencyApi.solicitar();
      await carrega();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível solicitar.');
    }
  };

  const aceita = async (id: string) => {
    try {
      const { data } = await emergencyApi.accept(id);
      if (data.roomUrl) window.open(data.roomUrl, '_blank', 'noopener,noreferrer');
      await carrega();
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Não foi possível aceitar.');
    }
  };

  if (!isFarmaceutico && !isCliente) return null;

  return (
    <div className="fc-panel" style={{ marginTop: 24, borderColor: 'var(--danger-color)' }}>
      <h3 style={{ color: 'var(--danger-color)' }}>Emergência farmacêutica</h3>
      <p style={{ fontSize: 14 }}>
        {isCliente
          ? 'Solicite atendimento imediato. Um farmacêutico disponível para emergências verá sua solicitação e entrará em contato pela sala de vídeo.'
          : 'Atenda solicitações de emergência em aberto. A sala de vídeo é criada automaticamente ao aceitar.'}
      </p>

      {erro && <div className="fc-alert error">{erro}</div>}

      {isCliente && (
        <>
          {minhaEmergencia && minhaEmergencia.status !== 'EXPIRADA' && minhaEmergencia.status !== 'CANCELADA' ? (
            <div>
              <div className="fc-alert info">
                Status: <strong>{EMERGENCY_STATUS_LABELS[minhaEmergencia.status] ?? minhaEmergencia.status}</strong>
              </div>
              {minhaEmergencia.roomUrl && (
                <button className="fc-button danger" onClick={() => window.open(minhaEmergencia.roomUrl, '_blank', 'noopener,noreferrer')}>
                  Entrar na sala de emergência
                </button>
              )}
              {minhaEmergencia.status === 'EM_ABERTO' && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Aguardando um farmacêutico. Solicitações em aberto expiram em 30 minutos.
                </p>
              )}
            </div>
          ) : (
            <button className="fc-button danger" onClick={solicita} disabled={carregando}>
              Solicitar emergência agora
            </button>
          )}
        </>
      )}

      {isFarmaceutico && (
        <>
          {carregando ? (
            <p>Carregando...</p>
          ) : abertas.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Nenhuma emergência em aberto no momento.</p>
          ) : (
            <div>
              {abertas.map((em) => (
                <div key={em.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
                  <span>
                    <strong>{em.cliente?.nome}</strong> — aguardando desde {new Date(em.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button className="fc-button danger" style={{ fontSize: 13, padding: '4px 12px' }} onClick={() => aceita(em.id)}>
                    Atender
                  </button>
                </div>
              ))}
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Ao atender, a sala de vídeo é gerada automaticamente e a solicitação fica reservada para você.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
