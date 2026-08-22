import { api } from './client';
import type { Consulta, Mensagem, SlotFarmaceutico, AvailabilitySlot, EmergencyRequest, VideoRoomSession } from '../types';

// ---------- Auth / recuperação de senha ----------

export const authApi = {
  register: (payload: { nome: string; email: string; senha: string; telefone?: string }) =>
    api.post('/auth/register', payload),
  login: (email: string, senha: string) => api.post('/auth/login', { email, senha }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  verifyReset: (email: string, codigo: string) =>
    api.post('/auth/reset-password/verify', { email, codigo }),
  confirmReset: (payload: { email: string; codigo: string; novaSenha: string; resetToken: string }) =>
    api.post('/auth/reset-password/confirm', payload),
};

// ---------- Convites ----------

export const invitesApi = {
  create: (email: string) => api.post('/invites', { email }),
  get: (token: string) => api.get(`/invites/${token}`),
  complete: (token: string, payload: { nome: string; senha: string; telefone?: string }) =>
    api.post(`/invites/${token}/complete`, payload),
};

// ---------- Disponibilidade ----------

export const availabilityApi = {
  getMe: () => api.get<AvailabilitySlot[]>('/availability/me'),
  update: (slots: AvailabilitySlot[]) => api.put('/availability/me', { slots }),
  getSlots: (dataIso: string) => api.get<SlotFarmaceutico[]>('/availability/slots', { params: { data: dataIso } }),
  createBlockout: (payload: { inicio: string; fim: string; motivo?: string }) =>
    api.post('/availability/blockouts', payload),
  getBlockouts: () => api.get('/availability/blockouts'),
  deleteBlockout: (id: string) => api.delete(`/availability/blockouts/${id}`),
};

// ---------- Consultas ----------

export const calendarApi = {
  status: () => api.get<{ configured: boolean; connected: boolean; connectedAt: string | null }>('/calendar/status'),
  connect: () => api.get<{ url: string }>('/calendar/connect'),
  disconnect: () => api.post<{ connected: false }>('/calendar/disconnect'),
};

export const consultasApi = {
  create: (payload: { farmaceuticoId: string; data: string; hora: string; observacoes?: string }) =>
    api.post<Consulta>('/consultas', payload),
  me: () => api.get<Consulta[]>('/consultas/me'),
  mine: () => api.get<Consulta[]>('/consultas'),
  pacientes: () => api.get('/consultas/pacientes'),
  room: (id: string) => api.get<VideoRoomSession>(`/consultas/${id}/room`),
  newRoom: (id: string) => api.post<VideoRoomSession>(`/consultas/${id}/new-room`),
  enterRoom: (id: string) => api.post<Consulta>(`/consultas/${id}/enter-room`),
  admitLate: (id: string) => api.post(`/consultas/${id}/admit-late`),
  closeRoom: (id: string) => api.post(`/consultas/${id}/close-room`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/consultas/${id}/status`, { status }),
};

// ---------- Pagamentos ----------

export interface PaymentPrice {
  id: string;
  slug: string;
  nome: string;
  descricao?: string | null;
  tipoAtendimento: string;
  valorCentavos: number;
  versao: number;
}

export const paymentsApi = {
  prices: () => api.get<PaymentPrice[]>('/payments/prices'),
  checkout: (payload: { productPriceId: string; farmaceuticoId: string; data: string; hora: string; observacoes?: string }) =>
    api.post<{ paymentId: string; checkoutUrl: string; expiresAt: string; amountCentavos: number; product: PaymentPrice }>('/payments/checkout', payload),
  get: (id: string) => api.get(`/payments/${id}`),
  adminPrices: () => api.get('/payments/admin/prices'),
  createAdminPrice: (payload: { slug: string; nome: string; descricao?: string; tipoAtendimento: string; valorCentavos: number }) =>
    api.post('/payments/admin/prices', payload),
  updateAdminPrice: (id: string, payload: { nome?: string; descricao?: string; valorCentavos?: number; ativo?: boolean }) =>
    api.patch(`/payments/admin/prices/${id}`, payload),
  adminPayments: () => api.get('/payments/admin/payments'),
};

// ---------- Prontuário clínico ----------

export interface ProntuarioEntrada {
  id: string;
  prontuarioId: string;
  consultaId?: string | null;
  farmaceuticoId: string;
  assunto: string;
  tipo: string;
  conteudo: string;
  conduta?: string | null;
  orientacoes?: string | null;
  encaminhamento?: string | null;
  status: string;
  versao: number;
  criadoEm: string;
  atualizadoEm: string;
  finalizadoEm?: string | null;
  farmaceutico?: { id: string; nome: string; tratamento?: string | null; crf?: string | null };
  consulta?: { id: string; data: string; hora: string; status: string } | null;
}

export interface ProntuarioResumo {
  id: string;
  pacienteId: string;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
  ultimoAtendimentoEm?: string | null;
  paciente: { id: string; nome: string; email: string };
  entradas: ProntuarioEntrada[];
}

export const prontuarioApi = {
  meu: () => api.get<ProntuarioResumo>('/prontuario/me'),
  porId: (id: string) => api.get<ProntuarioResumo>(`/prontuario/${id}`),
  pacientes: () => api.get<Array<{ pacienteId: string; prontuarioId: string; pacienteNome: string; pacienteEmail: string; status: string; atualizadoEm: string; ultimoAtendimentoEm?: string | null }>>('/prontuario/pacientes'),
  criarEntrada: (payload: {
    prontuarioId: string;
    consultaId?: string;
    assunto: string;
    tipo?: string;
    conteudo: string;
    conduta?: string;
    orientacoes?: string;
    encaminhamento?: string;
  }) => api.post<ProntuarioEntrada>('/prontuario/entradas', payload),
  atualizarEntrada: (id: string, payload: Partial<Pick<ProntuarioEntrada, 'assunto' | 'tipo' | 'conteudo' | 'conduta' | 'orientacoes' | 'encaminhamento'>>) =>
    api.patch<ProntuarioEntrada>(`/prontuario/entradas/${id}`, payload),
  finalizarEntrada: (id: string) => api.post<ProntuarioEntrada>(`/prontuario/entradas/${id}/finalizar`),
  consentimentos: () => api.get('/prontuario/consentimentos'),
  criarConsentimento: (payload: { tipo: string; versaoDocumento: string; finalidade: string; aceito: boolean }) =>
    api.post('/prontuario/consentimentos', payload),
  revogarConsentimento: (id: string) => api.post(`/prontuario/consentimentos/${id}/revogar`),
  concederAcesso: (payload: { farmaceuticoId: string; consultaId?: string; expiraEm?: string }) =>
    api.post('/prontuario/acessos', payload),
  protocolos: () => api.get('/prontuario/protocolos'),
  criarProtocolo: (payload: { nome: string; descricao?: string; camposJson: Record<string, unknown> }) =>
    api.post('/prontuario/protocolos', payload),
  atualizarProtocolo: (id: string, payload: { nome?: string; descricao?: string; ativo?: boolean; camposJson?: Record<string, unknown> }) =>
    api.patch(`/prontuario/protocolos/${id}`, payload),
  listarAnexos: (consultaId?: string) => api.get('/prontuario/anexos', { params: consultaId ? { consultaId } : undefined }),
  uploadAnexo: (file: File, options?: { consultaId?: string; entradaId?: string }) => {
    const data = new FormData();
    data.append('file', file);
    return api.post('/prontuario/anexos', data, { params: options });
  },
  downloadAnexo: (id: string) => api.get<{ url: string }>(`/prontuario/anexos/${id}/download`),
  baixarAnexoUrl: (id: string) => `${api.defaults.baseURL}/prontuario/anexos/${id}/download`,
  listarPrescricoes: (consultaId: string) => api.get(`/prontuario/prescricoes`, { params: { consultaId } }),
  criarPrescricao: (payload: { consultaId: string; conteudo: string }) => api.post('/prontuario/prescricoes', payload),
  atualizarPrescricao: (id: string, payload: { conteudo: string }) => api.patch(`/prontuario/prescricoes/${id}`, payload),
  finalizarPrescricao: (id: string) => api.post(`/prontuario/prescricoes/${id}/finalizar`),
  baixarPrescricaoUrl: (id: string) => `${api.defaults.baseURL}/prontuario/prescricoes/${id}/download`,
};

// ---------- Mensagens ----------

export const messagesApi = {
  send: (consultaId: string, texto: string) =>
    api.post<Mensagem>(`/messages/${consultaId}`, { texto }),
  list: (consultaId: string, params?: { take?: number; before?: string }) =>
    api.get<{ mensagens: Mensagem[]; nextCursor: string | null }>(`/messages/${consultaId}`, { params }),
  status: (consultaId: string) =>
    api.get<{
      status: string;
      roomSlug: string | null;
      outroUsuarioNome: string | null;
      naoLidas: number;
      ultimaMensagem: Mensagem | null;
    }>(`/messages/${consultaId}/status`),
  unreadCount: () => api.get<{ count?: number }>('/messages/unread/count'),
};

// ---------- Emergência ----------

export const emergencyApi = {
  solicitar: () => api.post<EmergencyRequest>('/emergency'),
  minha: () => api.get<EmergencyRequest | null>('/emergency/mine'),
  open: () => api.get<EmergencyRequest[]>('/emergency/open'),
  accept: (id: string) => api.post<EmergencyRequest>(`/emergency/${id}/accept`),
  openRoom: (id: string) => api.post<EmergencyRequest>(`/emergency/${id}/open-room`),
  room: (id: string) => api.get<VideoRoomSession>(`/emergency/${id}/room`),
  enterRoom: (id: string) => api.post<EmergencyRequest>(`/emergency/${id}/enter-room`),
  start: (id: string) => api.post(`/emergency/${id}/start`),
  close: (id: string, payload: { status: string; motivoEncerramento?: string }) =>
    api.patch(`/emergency/${id}/close`, payload),
};
