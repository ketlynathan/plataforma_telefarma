import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { Consulta } from '../../types';

interface Paciente { pacienteNome: string; pacienteEmail: string; }

export function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Paciente[]>('/consultas/pacientes'),
      api.get<Consulta[]>('/consultas'),
    ]).then(([pacientesRes, consultasRes]) => {
      setPacientes(pacientesRes.data);
      setConsultas(consultasRes.data);
      if (pacientesRes.data.length > 0) setSelectedEmail(pacientesRes.data[0].pacienteEmail);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Carregando...</p>;
  if (pacientes.length === 0) {
    return (
      <div>
        <h1>Pacientes</h1>
        <div className="fc-alert info">Nenhum paciente com consulta registrada.</div>
      </div>
    );
  }

  const consultasPaciente = consultas
    .filter((c) => c.pacienteEmail === selectedEmail)
    .sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const pacienteNome = consultasPaciente[0]?.pacienteNome ?? '-';

  return (
    <div>
      <h1>Pacientes</h1>
      <div className="fc-field" style={{ maxWidth: 420 }}>
        <label>Selecione um paciente</label>
        <select className="fc-select" value={selectedEmail} onChange={(e) => setSelectedEmail(e.target.value)}>
          {pacientes.map((p) => (
            <option key={p.pacienteEmail} value={p.pacienteEmail}>
              {p.pacienteEmail}
            </option>
          ))}
        </select>
      </div>

      <h3>{pacienteNome}</h3>
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
          {consultasPaciente.map((c) => (
            <tr key={c.id}>
              <td>{c.data.slice(0, 10)}</td>
              <td>{c.hora}</td>
              <td>{c.status}</td>
              <td>{c.observacoes}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
