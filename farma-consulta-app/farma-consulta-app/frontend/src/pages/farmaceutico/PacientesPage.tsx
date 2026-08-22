import { FormEvent, useEffect, useMemo, useState } from 'react';
import { consultasApi, prontuarioApi, ProntuarioResumo } from '../../api/endpoints';
import { Consulta } from '../../types';

interface PacienteProntuario {
  pacienteId: string;
  prontuarioId: string;
  pacienteNome: string;
  pacienteEmail: string;
  status: string;
  atualizadoEm: string;
  ultimoAtendimentoEm?: string | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function PacientesPage() {
  const [pacientes, setPacientes] = useState<PacienteProntuario[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [prontuario, setProntuario] = useState<ProntuarioResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProntuario, setLoadingProntuario] = useState(false);
  const [anexos, setAnexos] = useState<Record<string, Array<{ id: string; nomeArquivo: string; criadoEm: string }>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ assunto: '', conteudo: '', conduta: '', orientacoes: '', encaminhamento: '', consultaId: '' });

  const carregarPacientes = async () => {
    setLoading(true);
    try {
      const [pacientesResponse, consultasResponse] = await Promise.all([
        prontuarioApi.pacientes(),
        consultasApi.mine(),
      ]);
      setPacientes(pacientesResponse.data);
      setConsultas(consultasResponse.data);
      if (pacientesResponse.data.length > 0) setSelectedId(pacientesResponse.data[0].prontuarioId);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível carregar os pacientes.' });
    } finally {
      setLoading(false);
    }
  };

  const carregarAnexos = async (items: Consulta[]) => {
    const entries = await Promise.all(items.map(async (consulta) => {
      try {
        const { data } = await prontuarioApi.listarAnexos(consulta.id);
        return [consulta.id, data as Array<{ id: string; nomeArquivo: string; criadoEm: string }>] as const;
      } catch {
        return [consulta.id, []] as const;
      }
    }));
    setAnexos(Object.fromEntries(entries));
  };

  const abrirAnexo = async (id: string) => {
    try {
      const { data } = await prontuarioApi.downloadAnexo(id);
      window.open(data.url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível abrir o anexo.' });
    }
  };

  const carregarProntuario = async (id: string) => {
    if (!id) return;
    setLoadingProntuario(true);
    try {
      const response = await prontuarioApi.porId(id);
      setProntuario(response.data);
      const consultasDoPaciente = consultas.filter((item) => item.pacienteEmail === response.data.paciente.email && item.status !== 'CANCELADA');
      void carregarAnexos(consultasDoPaciente);
      const consulta = consultasDoPaciente[0];
      setForm((current) => ({ ...current, consultaId: consulta?.id ?? '' }));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível carregar o prontuário.' });
    } finally {
      setLoadingProntuario(false);
    }
  };

  useEffect(() => {
    carregarPacientes();
  }, []);

  useEffect(() => {
    if (selectedId && consultas.length >= 0) carregarProntuario(selectedId);
  }, [selectedId, consultas]);

  const consultasPaciente = useMemo(
    () => consultas.filter((item) => item.pacienteEmail === prontuario?.paciente.email && item.status !== 'CANCELADA'),
    [consultas, prontuario?.paciente.email],
  );

  const criarEntrada = async (event: FormEvent) => {
    event.preventDefault();
    if (!prontuario || !form.consultaId) {
      setMessage({ type: 'error', text: 'Selecione a consulta relacionada ao registro.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await prontuarioApi.criarEntrada({
        prontuarioId: prontuario.id,
        consultaId: form.consultaId,
        assunto: form.assunto,
        conteudo: form.conteudo,
        conduta: form.conduta || undefined,
        orientacoes: form.orientacoes || undefined,
        encaminhamento: form.encaminhamento || undefined,
      });
      setMessage({ type: 'success', text: 'Registro salvo como rascunho. Finalize-o após revisar o conteúdo.' });
      setForm((current) => ({ ...current, assunto: '', conteudo: '', conduta: '', orientacoes: '', encaminhamento: '' }));
      await carregarProntuario(prontuario.id);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível salvar o registro.' });
    } finally {
      setSaving(false);
    }
  };

  const finalizar = async (id: string) => {
    try {
      await prontuarioApi.finalizarEntrada(id);
      if (prontuario) await carregarProntuario(prontuario.id);
      setMessage({ type: 'success', text: 'Registro finalizado e incluído na linha do tempo.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível finalizar o registro.' });
    }
  };

  if (loading) return <p>Carregando pacientes...</p>;
  if (pacientes.length === 0) {
    return (
      <div>
        <h1>Pacientes e prontuário</h1>
        <div className="fc-alert info">Nenhum paciente com consulta registrada.</div>
      </div>
    );
  }

  const pacienteSelecionado = pacientes.find((item) => item.prontuarioId === selectedId);

  return (
    <div>
      <h1>Pacientes e prontuário</h1>
      <p>O acesso ao prontuário é registrado e limitado aos pacientes relacionados à sua assistência.</p>

      {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}

      <div className="fc-field" style={{ maxWidth: 560 }}>
        <label>Selecione um paciente</label>
        <select className="fc-select" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          {pacientes.map((paciente) => (
            <option key={paciente.prontuarioId} value={paciente.prontuarioId}>
              {paciente.pacienteNome} — {paciente.pacienteEmail}
            </option>
          ))}
        </select>
      </div>

      {loadingProntuario || !prontuario ? (
        <p>Carregando prontuário...</p>
      ) : (
        <>
          <section className="fc-card" style={{ maxWidth: 860, marginBottom: 20 }}>
            <h2>{prontuario.paciente.nome}</h2>
            <p>{prontuario.paciente.email}</p>
            <p style={{ marginBottom: 0 }}>
              Prontuário {prontuario.status === 'ATIVO' ? 'ativo' : prontuario.status} · Atualizado em {formatDate(prontuario.atualizadoEm)}
            </p>
            {pacienteSelecionado?.ultimoAtendimentoEm && <p style={{ marginBottom: 0 }}>Último atendimento: {formatDate(pacienteSelecionado.ultimoAtendimentoEm)}</p>}
          </section>

          <section className="fc-card" style={{ maxWidth: 860, marginBottom: 20 }}>
            <h2>Novo registro de atendimento</h2>
            <form onSubmit={criarEntrada}>
              <div className="fc-field">
                <label>Consulta relacionada</label>
                <select className="fc-select" value={form.consultaId} onChange={(event) => setForm({ ...form, consultaId: event.target.value })} required>
                  <option value="">Selecione uma consulta</option>
                  {consultasPaciente.map((consulta) => (
                    <option key={consulta.id} value={consulta.id}>
                      {consulta.data.slice(0, 10)} às {consulta.hora} — {consulta.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fc-field">
                <label>Assunto</label>
                <input className="fc-input" value={form.assunto} onChange={(event) => setForm({ ...form, assunto: event.target.value })} required maxLength={160} />
              </div>
              <div className="fc-field">
                <label>Evolução e avaliação</label>
                <textarea className="fc-textarea" value={form.conteudo} onChange={(event) => setForm({ ...form, conteudo: event.target.value })} required minLength={3} />
              </div>
              <div className="fc-field">
                <label>Conduta</label>
                <textarea className="fc-textarea" value={form.conduta} onChange={(event) => setForm({ ...form, conduta: event.target.value })} />
              </div>
              <div className="fc-field">
                <label>Orientações</label>
                <textarea className="fc-textarea" value={form.orientacoes} onChange={(event) => setForm({ ...form, orientacoes: event.target.value })} />
              </div>
              <div className="fc-field">
                <label>Encaminhamento ou retorno</label>
                <textarea className="fc-textarea" value={form.encaminhamento} onChange={(event) => setForm({ ...form, encaminhamento: event.target.value })} />
              </div>
              <button className="fc-button primary" type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar rascunho'}
              </button>
            </form>
          </section>

          <section className="fc-card" style={{ maxWidth: 860, marginBottom: 20 }}>
            <h2>Receitas médicas anexadas</h2>
            {consultasPaciente.every((consulta) => (anexos[consulta.id] ?? []).length === 0) ? (
              <p style={{ color: '#667085' }}>Nenhum documento anexado nas consultas deste paciente.</p>
            ) : consultasPaciente.map((consulta) => (anexos[consulta.id] ?? []).length > 0 && (
              <div key={consulta.id} style={{ marginBottom: 10 }}>
                <strong>Consulta de {consulta.data.slice(0, 10)} às {consulta.hora}</strong>
                {(anexos[consulta.id] ?? []).map((anexo) => (
                  <div key={anexo.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                    <span>{anexo.nomeArquivo} · {formatDate(anexo.criadoEm)}</span>
                    <button className="fc-button" type="button" onClick={() => void abrirAnexo(anexo.id)}>Abrir documento</button>
                  </div>
                ))}
              </div>
            ))}
          </section>

          <section style={{ display: 'grid', gap: 14, maxWidth: 860 }}>
            <h2>Linha do tempo</h2>
            {prontuario.entradas.length === 0 ? (
              <div className="fc-alert info">Ainda não há registros neste prontuário.</div>
            ) : prontuario.entradas.map((entrada) => (
              <article className="fc-card" key={entrada.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <h3 style={{ marginBottom: 4 }}>{entrada.assunto}</h3>
                    <p style={{ margin: 0, fontSize: 13, color: '#667085' }}>
                      {entrada.tipo} · {formatDate(entrada.criadoEm)} · versão {entrada.versao}
                    </p>
                  </div>
                  <span>{entrada.status === 'FINALIZADO' ? 'Finalizado' : 'Rascunho'}</span>
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{entrada.conteudo}</p>
                {entrada.conduta && <p><strong>Conduta:</strong> {entrada.conduta}</p>}
                {entrada.orientacoes && <p><strong>Orientações:</strong> {entrada.orientacoes}</p>}
                {entrada.encaminhamento && <p><strong>Encaminhamento:</strong> {entrada.encaminhamento}</p>}
                {entrada.status !== 'FINALIZADO' && <button className="fc-button" type="button" onClick={() => finalizar(entrada.id)}>Finalizar registro</button>}
              </article>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
