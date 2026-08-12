import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Consulta } from '../../types';

export function FarmaceuticoDashboardPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Consulta[]>('/consultas').then(({ data }) => {
      setConsultas(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Carregando...</p>;

  const hojeStr = new Date().toISOString().slice(0, 10);
  const hoje = consultas.filter((c) => c.data.slice(0, 10) === hojeStr);
  const pacientesUnicos = new Set(consultas.map((c) => c.pacienteEmail)).size;

  return (
    <div>
      <h1>Dashboard do farmaceutico</h1>
      <p>Acompanhe a agenda, a demanda do dia e a base de pacientes.</p>

      <div className="fc-metrics">
        <div className="fc-metric">
          <div className="value">{consultas.length}</div>
          <div className="label">Consultas totais</div>
        </div>
        <div className="fc-metric">
          <div className="value">{hoje.length}</div>
          <div className="label">Consultas hoje</div>
        </div>
        <div className="fc-metric">
          <div className="value">{pacientesUnicos}</div>
          <div className="label">Pacientes unicos</div>
        </div>
      </div>

      <h3>Agenda do dia</h3>
      {hoje.length === 0 ? (
        <div className="fc-alert info">Nao ha consultas marcadas para hoje.</div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Hora</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...hoje].sort((a, b) => a.hora.localeCompare(b.hora)).map((c) => (
              <tr key={c.id}>
                <td>{c.pacienteNome}</td>
                <td>{c.hora}</td>
                <td>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
