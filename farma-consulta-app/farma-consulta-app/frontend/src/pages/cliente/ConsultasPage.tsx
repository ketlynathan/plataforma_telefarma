import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Consulta } from '../../types';

export function ConsultasPage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Consulta[]>('/consultas/me').then(({ data }) => {
      setConsultas(data);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1>Minhas consultas</h1>
      {loading ? (
        <p>Carregando...</p>
      ) : consultas.length === 0 ? (
        <div className="fc-alert info">Nenhuma consulta encontrada para este usuario.</div>
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
            {[...consultas]
              .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora))
              .map((c) => (
                <tr key={c.id}>
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
