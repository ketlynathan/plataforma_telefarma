import { FormEvent, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const HORARIOS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export function AgendamentoPage() {
  const { user } = useAuth();
  const [data, setData] = useState('');
  const [hora, setHora] = useState(HORARIOS[0]);
  const [observacoes, setObservacoes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post('/consultas', { data, hora, observacoes });
      setMessage({ type: 'success', text: 'Consulta agendada com sucesso.' });
      setData('');
      setObservacoes('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Erro ao agendar consulta.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Agendar consulta</h1>
      <p>Escolha a melhor data e horario para seu atendimento.</p>

      {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="fc-field">
          <label>Data</label>
          <input
            className="fc-input"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>
        <div className="fc-field">
          <label>Horario</label>
          <select className="fc-select" value={hora} onChange={(e) => setHora(e.target.value)}>
            {HORARIOS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div className="fc-field">
          <label>Observacoes</label>
          <textarea
            className="fc-textarea"
            placeholder="Ex.: alergias, uso continuo de medicamentos..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
        <p>Paciente: {user?.nome}</p>
        <button className="fc-button primary" type="submit" disabled={submitting}>
          Confirmar agendamento
        </button>
      </form>
    </div>
  );
}
