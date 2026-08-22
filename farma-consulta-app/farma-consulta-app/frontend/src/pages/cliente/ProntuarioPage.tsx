import { useEffect, useState } from 'react';
import { prontuarioApi, ProntuarioResumo } from '../../api/endpoints';

function formatDate(value: string) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProntuarioPage() {
  const [prontuario, setProntuario] = useState<ProntuarioResumo | null>(null);
  const [consentido, setConsentido] = useState(false);
  const [consentimentoId, setConsentimentoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [prontuarioResponse, consentimentosResponse] = await Promise.all([
        prontuarioApi.meu(),
        prontuarioApi.consentimentos(),
      ]);
      setProntuario(prontuarioResponse.data);
      const consentimentoAtivo = (consentimentosResponse.data as Array<{ id: string; tipo: string; aceito: boolean; revogadoEm?: string | null }>)
        .find((item) => item.tipo === 'TRATAMENTO_DADOS_SAUDE' && item.aceito && !item.revogadoEm);
      setConsentimentoId(consentimentoAtivo?.id ?? null);
      setConsentido(Boolean(consentimentoAtivo));
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível carregar o prontuário.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const revogarConsentimento = async () => {
    if (!consentimentoId || !window.confirm('Deseja revogar esta ciência? Novos registros clínicos poderão ficar bloqueados até uma nova manifestação.')) return;
    try {
      await prontuarioApi.revogarConsentimento(consentimentoId);
      setConsentido(false);
      setConsentimentoId(null);
      setMessage({ type: 'success', text: 'Ciência revogada. Você poderá registrar uma nova manifestação quando desejar.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível revogar a ciência.' });
    }
  };

  const aceitarConsentimento = async () => {
    setSavingConsent(true);
    setMessage(null);
    try {
      await prontuarioApi.criarConsentimento({
        tipo: 'TRATAMENTO_DADOS_SAUDE',
        versaoDocumento: '1.0',
        finalidade: 'Registro, continuidade e segurança do cuidado farmacêutico por meio da Telefarmácia.',
        aceito: true,
      });
      setConsentido(true);
      setMessage({ type: 'success', text: 'Ciência registrada com sucesso.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Não foi possível registrar sua ciência.' });
    } finally {
      setSavingConsent(false);
    }
  };

  if (loading) return <p>Carregando prontuário...</p>;
  if (!prontuario) return <div className="fc-alert error">Prontuário indisponível.</div>;

  return (
    <div>
      <h1>Meu prontuário</h1>
      <p>Histórico longitudinal dos registros realizados durante seus atendimentos farmacêuticos.</p>

      {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}

      {consentido && (
        <section className="fc-card" style={{ maxWidth: 760, marginBottom: 20 }}>
          <h2>Ciência registrada</h2>
          <p>O tratamento dos dados de saúde está autorizado para continuidade e segurança do cuidado farmacêutico.</p>
          <button className="fc-button" type="button" onClick={revogarConsentimento}>Revogar ciência</button>
        </section>
      )}

      {!consentido && (
        <section className="fc-card" style={{ maxWidth: 760, marginBottom: 20 }}>
          <h2>Ciência sobre o tratamento dos dados</h2>
          <p>
            Seus dados de saúde podem ser registrados para continuidade e segurança do cuidado farmacêutico.
            Consulte a política de privacidade da plataforma antes de prosseguir.
          </p>
          <button className="fc-button primary" type="button" onClick={aceitarConsentimento} disabled={savingConsent}>
            {savingConsent ? 'Registrando...' : 'Li e concordo com esta finalidade'}
          </button>
        </section>
      )}

      <section className="fc-card" style={{ maxWidth: 760, marginBottom: 20 }}>
        <strong>{prontuario.paciente.nome}</strong>
        <p style={{ marginBottom: 0 }}>Status: {prontuario.status === 'ATIVO' ? 'Ativo' : prontuario.status}</p>
        <p style={{ marginBottom: 0 }}>Última atualização: {formatDate(prontuario.atualizadoEm)}</p>
      </section>

      {prontuario.entradas.length === 0 ? (
        <div className="fc-alert info">Ainda não há registros finalizados no prontuário.</div>
      ) : (
        <div style={{ display: 'grid', gap: 14, maxWidth: 860 }}>
          {prontuario.entradas.map((entrada) => (
            <article className="fc-card" key={entrada.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>{entrada.assunto}</h3>
                  <p style={{ margin: 0, fontSize: 13, color: '#667085' }}>
                    {entrada.tipo} · {formatDate(entrada.criadoEm)} · {entrada.farmaceutico?.nome ?? 'Farmacêutico'}
                  </p>
                </div>
                <span>{entrada.status === 'FINALIZADO' ? 'Finalizado' : 'Em elaboração'}</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap' }}>{entrada.conteudo}</p>
              {entrada.conduta && <p><strong>Conduta:</strong> {entrada.conduta}</p>}
              {entrada.orientacoes && <p><strong>Orientações:</strong> {entrada.orientacoes}</p>}
              {entrada.encaminhamento && <p><strong>Encaminhamento:</strong> {entrada.encaminhamento}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
