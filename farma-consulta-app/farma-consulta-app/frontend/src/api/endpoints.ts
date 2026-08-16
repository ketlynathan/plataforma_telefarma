import { api } from './client';
import type { Consulta, Mensagem, SlotFarmaceutico, AvailabilitySlot, EmergencyRequest } from '../types';

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

export const consultasApi = {
  create: (payload: { farmaceuticoId: string; data: string; hora: string; observacoes?: string }) =>
    api.post<Consulta>('/consultas', payload),
  me: () => api.get<Consulta[]>('/consultas/me'),
  mine: () => api.get<Consulta[]>('/consultas'),
  pacientes: () => api.get('/consultas/pacientes'),
  room: (id: string) => api.get<{ roomSlug: string; roomUrl: string; status: string; toleranciaMin?: number }>(`/consultas/${id}/room`),
  newRoom: (id: string) => api.post<{ roomSlug: string; roomUrl: string; status?: string }>(`/consultas/${id}/new-room`),
  admitLate: (id: string) => api.post(`/consultas/${id}/admit-late`),
  closeRoom: (id: string) => api.post(`/consultas/${id}/close-room`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/consultas/${id}/status`, { status }),
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
  start: (id: string) => api.post(`/emergency/${id}/start`),
  close: (id: string, payload: { status: string; motivoEncerramento?: string }) =>
    api.patch(`/emergency/${id}/close`, payload),
};
