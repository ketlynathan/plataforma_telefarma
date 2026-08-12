import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Consulta } from '../../types';

export function AgendaPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Consulta[]>('/consultas').then(({ data }) => {
      setConsultas(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1>Agenda geral</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : consultas.length === 0 ? (
        <div className="fc-alert info">Nenhuma consulta cadastrada ate o momento.</div>
      ) : (
        <table className="fc-table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Email</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Observacoes</th>
            </tr>
          </thead>
          <tbody>
            {consultas.map((c) => (
              <tr key={c.id}>
                <td>{c.pacienteNome}</td>
                <td>{c.pacienteEmail}</td>
                <td>{c.data.slice(0, 10)}</td>
                <td>{c.hora}</td>
                <td>{c.status}</td>
                <td>{c.observacoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
