import { FormEvent, useEffect, useState } from 'react';
import { availabilityApi, consultasApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { SlotFarmaceutico, formatFarmaceutico } from '../../types';
import { appTodayIso } from '../../utils/timezone';

function addDays(n: number): string {
  const [year, month, day] = appTodayIso().split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + n);
  return date.toISOString().slice(0, 10);
}

function isoToBR(iso: string): string {
  const [y, m, dd] = iso.split('-');
  return `${dd}/${m}/${y}`;
}

export function AgendamentoPage() {
  const { user } = useAuth();
  const [data, setData] = useState(addDays(0));
  const [slots, setSlots] = useState<SlotFarmaceutico[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [farmaceuticoId, setFarmaceuticoId] = useState('');
  const [hora, setHora] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const carregaSlots = async (dataIso: string) => {
  setCarregandoSlots(true);
  setFarmaceuticoId('');
  setHora('');
  try {
    const { data: lista } = await availabilityApi.getSlots(dataIso);
    setSlots(lista);
  } catch (err: any) {
    console.error('Falha ao buscar horários disponíveis', err);
    setSlots([]);
    setMessage({
      type: 'error',
      text: err?.response?.data?.message ?? 'Não foi possível carregar os horários disponíveis. Tente novamente.',
    });
  } finally {
    setCarregandoSlots(false);
  }
};

useEffect(() => {
  if (data) carregaSlots(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [data]);

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  setMessage(null);
  if (!farmaceuticoId || !hora) {
    setMessage({ type: 'error', text: 'Escolha o farmacêutico e o horário.' });
    return;
  }
  setSubmitting(true);
  try {
    await consultasApi.create({ farmaceuticoId, data, hora, observacoes });
    setMessage({ type: 'success', text: 'Consulta agendada com sucesso.' });
    setHora('');
    setObservacoes('');
    await carregaSlots(data);
  } catch (err: any) {
    console.error('Falha ao agendar consulta', err);
    setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Erro ao agendar consulta.' });
  } finally {
    setSubmitting(false);
  }
};

  const horariosDoFarmaceutico =
    slots.find((s) => s.farmaceuticoId === farmaceuticoId)?.horariosLivres ?? [];

  return (
    <div>
      <h1>Agendar consulta</h1>
      <p>Escolha a data, o farmacêutico e o horário disponível para o seu atendimento.</p>

      {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
        <div className="fc-field">
          <label>Data</label>
          <input
            className="fc-input"
            type="date"
            min={addDays(0)}
            max={addDays(30)}
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </div>

        <div className="fc-field">
          <label>Farmacêutico(a)</label>
          {carregandoSlots ? (
            <p>Carregando disponibilidade...</p>
          ) : slots.filter((s) => s.horariosLivres.length > 0).length === 0 ? (
            <div className="fc-alert info">
              Nenhum horário disponível para esta data. Escolha outro dia.
            </div>
          ) : (
            <select
              className="fc-select"
              value={farmaceuticoId}
              onChange={(e) => {
                setFarmaceuticoId(e.target.value);
                setHora('');
              }}
              required
            >
              <option value="">Selecione o farmacêutico</option>
              {slots
                .filter((s) => s.horariosLivres.length > 0)
                .map((s) => (
                  <option key={s.farmaceuticoId} value={s.farmaceuticoId}>
                    {formatFarmaceutico(s.farmaceuticoNome, s.farmaceuticoTratamento, s.farmaceuticoCrf)} ({s.horariosLivres.length} horário(s) livre(s))
                  </option>
                ))}
            </select>
          )}
        </div>

        {farmaceuticoId && (
          <div className="fc-field">
            <label>Horário disponível — {isoToBR(data)}</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {horariosDoFarmaceutico.map((h) => (
                <button
                  key={h}
                  type="button"
                  className={`fc-button ${hora === h ? 'primary' : ''}`}
                  style={{ padding: '6px 14px', fontSize: 14 }}
                  onClick={() => setHora(h)}
                >
                  {h}
                </button>
              ))}
            </div>
            {hora && <p style={{ fontSize: 13, marginTop: 8 }}>Selecionado: {hora}</p>}
          </div>
        )}

        <div className="fc-field">
          <label>Observações</label>
          <textarea
            className="fc-textarea"
            placeholder="Ex.: alergias, uso contínuo de medicamentos..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>
        <p>Paciente: {user?.nome}</p>
        <button className="fc-button primary" type="submit" disabled={submitting || !hora}>
          Confirmar agendamento
        </button>
      </form>
    </div>
  );
}
