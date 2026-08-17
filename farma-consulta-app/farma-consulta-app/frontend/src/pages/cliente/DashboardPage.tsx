import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Consulta, CONSULTA_STATUS_LABELS } from '../../types';
import { PainelEmergencia } from '../../components/PainelEmergencia';

export function ClienteDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  const carrega = () => {
    api
      .get<Consulta[]>('/consultas/me')
      .then(({ data }) => setConsultas(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    carrega();
    const interval = window.setInterval(carrega, 10_000);
    return () => window.clearInterval(interval);
  }, []);

  if (loading) return <p>Carregando...</p>;

  const hojeStr = new Date().toISOString().slice(0, 10);
  const agendadas = consultas.filter((c) => c.data.slice(0, 10) >= hojeStr && c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA');
  const realizadas = consultas.filter((c) => c.status === 'CONCLUIDA' || c.status === 'CANCELADA' || c.status === 'FARMACEUTICO_AUSENTE' || c.data.slice(0, 10) < hojeStr);

  return (
    <div>
      <h1>Bem-vindo</h1>
      <h3>{user?.nome}</h3>

      <div className="fc-metrics">
        <div className="fc-metric">
          <div className="value">{agendadas.length}</div>
          <div className="label">Proximas Consultas</div>
          <div className="delta">Agendadas para voce</div>
        </div>
        <div className="fc-metric">
          <div className="value">{realizadas.length}</div>
          <div className="label">Historico</div>
          <div className="delta">Consultas realizadas</div>
        </div>
        <div className="fc-metric">
          <div className="value">Nova Consulta</div>
          <div className="label">Agendar</div>
          <div className="delta">Agende uma nova teleconsulta</div>
        </div>
      </div>

      <PainelEmergencia />

      <h3>Proximas Consultas</h3>
      {agendadas.length === 0 ? (
        <div>
          <div className="fc-alert info">Voce nao tem consultas agendadas</div>
          <button className="fc-button primary" onClick={() => navigate('/cliente/agendar')}>
            Agendar Agora
          </button>
        </div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Observacoes</th>
            </tr>
          </thead>
          <tbody>
            {agendadas
              .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
              .map((c) => (
                <tr key={c.id}>
                  <td>{c.data.slice(0, 10)}</td>
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
