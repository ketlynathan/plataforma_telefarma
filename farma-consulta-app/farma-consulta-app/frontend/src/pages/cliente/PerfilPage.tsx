import { FormEvent, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { TIMEZONE_OPTIONS } from '../../utils/timezone';

export function PerfilPage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({
    nome: '', cpf: '', dataNascimento: '', telefone: '', cep: '',
    endereco: '', cidade: '', estado: '', doencasCronicas: '',
    alergias: '', medicamentosUso: '', timezone: 'America/Sao_Paulo',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm({
      nome: user.nome ?? '',
      cpf: user.cpf ?? '',
      dataNascimento: user.dataNascimento ?? '',
      telefone: user.telefone ?? '',
      cep: user.cep ?? '',
      endereco: user.endereco ?? '',
      cidade: user.cidade ?? '',
      estado: user.estado ?? '',
      doencasCronicas: user.doencasCronicas ?? '',
      alergias: user.alergias ?? '',
      medicamentosUso: user.medicamentosUso ?? '',
      timezone: user.timezone ?? 'America/Sao_Paulo',
    });
  }, [user]);

  const update = (key: keyof typeof form) => (e: any) => setForm({ ...form, [key]: e.target.value });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.patch('/users/me', form);
      await refreshUser();
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso.' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message ?? 'Nao foi possivel atualizar o perfil.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Meu Perfil</h1>
      <p>Gerencie seus dados pessoais e de saude</p>

      {message && <div className={`fc-alert ${message.type}`}>{message.text}</div>}

      <form onSubmit={handleSubmit}>
        <h3>Dados Pessoais</h3>
        <div className="fc-grid-2">
          <div className="fc-field">
            <label>Nome completo</label>
            <input className="fc-input" value={form.nome} onChange={update('nome')} />
          </div>
          <div className="fc-field">
            <label>Email</label>
            <input className="fc-input" value={user?.email ?? ''} disabled />
          </div>
          <div className="fc-field">
            <label>CPF</label>
            <input className="fc-input" value={form.cpf} onChange={update('cpf')} placeholder="000.000.000-00" />
          </div>
          <div className="fc-field">
            <label>Data de Nascimento</label>
            <input className="fc-input" value={form.dataNascimento} onChange={update('dataNascimento')} placeholder="dd.mm.aaaa" />
          </div>
          <div className="fc-field">
            <label>Telefone</label>
            <input className="fc-input" value={form.telefone} onChange={update('telefone')} placeholder="(11) 99999-9999" />
          </div>
          <div className="fc-field">
            <label>CEP</label>
            <input className="fc-input" value={form.cep} onChange={update('cep')} placeholder="00000-000" />
          </div>
          <div className="fc-field">
            <label>Endereco</label>
            <input className="fc-input" value={form.endereco} onChange={update('endereco')} placeholder="Rua, numero, complemento" />
          </div>
          <div className="fc-field">
            <label>Cidade</label>
            <input className="fc-input" value={form.cidade} onChange={update('cidade')} placeholder="Sao Paulo" />
          </div>
          <div className="fc-field">
            <label>Estado</label>
            <input className="fc-input" value={form.estado} onChange={update('estado')} placeholder="SP" />
          </div>
        </div>

        <h3>Região e horários</h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Escolha sua região para visualizar a consulta no seu horário local. O horário do farmacêutico também será mostrado como referência.</p>
        <div className="fc-field">
          <label>Meu fuso horário</label>
          <select className="fc-select" value={form.timezone} onChange={update('timezone')}>
            {TIMEZONE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        <h3>Dados de Saude</h3>
        <div className="fc-field">
          <label>Doencas Cronicas</label>
          <textarea className="fc-textarea" value={form.doencasCronicas} onChange={update('doencasCronicas')} />
        </div>
        <div className="fc-field">
          <label>Alergias</label>
          <textarea className="fc-textarea" value={form.alergias} onChange={update('alergias')} />
        </div>
        <div className="fc-field">
          <label>Medicamentos em Uso</label>
          <textarea className="fc-textarea" value={form.medicamentosUso} onChange={update('medicamentosUso')} />
        </div>

        <button className="fc-button primary" type="submit" disabled={submitting}>
          Salvar alteracoes
        </button>
      </form>
    </div>
  );
}
