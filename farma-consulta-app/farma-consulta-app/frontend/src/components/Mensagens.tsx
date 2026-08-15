import { useEffect, useRef, useState } from 'react';
import { messagesApi } from '../api/endpoints';
import { Mensagem } from '../types';

interface Props {
  consultaId: string;
}

export function Mensagens({ consultaId }: Props) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [erro, setErro] = useState('');
  const [ultimoId, setUltimoId] = useState<string | null>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  const carrega = async () => {
    try {
      const { data } = await messagesApi.list(consultaId, { take: 100 });
      setMensagens(data.mensagens);
      setUltimoId(data.nextCursor);
    } catch {
      // erro silencioso
    }
  };

  // Polling leve (item 21): carrega novas mensagens a cada 10 s.
  useEffect(() => {
    carrega();
    const interval = setInterval(carrega, 10_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId]);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
  }, [mensagens.length]);

  const envia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!texto.trim()) return;
    setErro('');
    try {
      const { data } = await messagesApi.send(consultaId, texto.trim());
      setMensagens((prev) => [...prev, { ...data, remetenteMe: true }]);
      setTexto('');
    } catch (err: any) {
      setErro(err?.response?.data?.message ?? 'Falha ao enviar.');
    }
  };

  const formataHora = (iso: string) =>
    new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fc-chat">
      <div ref={listaRef} style={{ maxHeight: 300, overflowY: 'auto', padding: 8 }}>
        {mensagens.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            Ainda não há mensagens. Converse com o outro participante da consulta.
          </p>
        )}
        {mensagens.map((m) => (
          <div key={m.id} style={{ textAlign: m.remetenteMe ? 'right' : 'left', marginBottom: 6 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '6px 10px',
                borderRadius: 10,
                fontSize: 13,
                background: m.remetenteMe ? 'var(--primary-color)' : '#eef2ee',
                color: m.remetenteMe ? '#fff' : 'var(--text-color)',
                maxWidth: '75%',
                whiteSpace: 'pre-wrap',
              }}
            >
              {m.texto}
              <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>{formataHora(m.createdAt)}</span>
            </span>
          </div>
        ))}
      </div>
      {erro && <div className="fc-alert error" style={{ marginTop: 4 }}>{erro}</div>}
      <form onSubmit={envia} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          className="fc-input"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Digite uma mensagem..."
          style={{ flex: 1 }}
        />
        <button className="fc-button primary" type="submit">
          Enviar
        </button>
      </form>
    </div>
  );
}
