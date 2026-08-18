export interface VideoRoomSession {
  provider: 'jaas' | 'meet-jitsi';
  domain: string;
  roomName: string;
  roomUrl: string;
  scriptUrl?: string;
  jwt?: string;
  expiresAt?: string;
  agendaTimezone?: string;
  agendadoEmUtc?: string | null;
  roomSlug: string;
  status: ConsultaStatus;
  farmaceuticoEntrouEm?: string | null;
  clienteEntrouEm?: string | null;
  toleranciaMin?: number;
}

export interface Consulta {
  id: string;
  pacienteNome: string;
  pacienteEmail: string;
  data: string;
  hora: string;
  status: ConsultaStatus;
  observacoes?: string;
  farmaceutico?: { id: string; nome: string; tratamento?: string | null; crf?: string | null };
  roomSlug?: string;
  roomToken?: string;
  farmaceuticoEntrouEm?: string | null;
  clienteEntrouEm?: string | null;
  toleranciaMin?: number;
  agendaTimezone?: string;
  agendadoEmUtc?: string | null;
}

export function formatFarmaceutico(nome: string, tratamento?: string | null, crf?: string | null): string {
  return `${tratamento ? `${tratamento} ` : ''}${nome}${crf ? ` — CRF ${crf}` : ''}`;
}

export type ConsultaStatus =
  | 'AGENDADA'
  | 'CONFIRMADA'
  | 'CLIENTE_AGUARDANDO'
  | 'FARMACEUTICO_AGUARDANDO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDA'
  | 'CLIENTE_AUSENTE'
  | 'FARMACEUTICO_AUSENTE'
  | 'CANCELADA'
  | 'REAGENDADA';

export const CONSULTA_STATUS_LABELS: Record<string, string> = {
  AGENDADA: 'Agendada',
  CONFIRMADA: 'Confirmada',
  CLIENTE_AGUARDANDO: 'Cliente aguardando',
  FARMACEUTICO_AGUARDANDO: 'Farmacêutico aguardando',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDA: 'Concluída',
  CLIENTE_AUSENTE: 'Cliente ausente',
  FARMACEUTICO_AUSENTE: 'Farmacêutico ausente',
  CANCELADA: 'Cancelada',
  REAGENDADA: 'Reagendada',
};

export interface Mensagem {
  id: string;
  consultaId: string;
  remetenteId: string;
  destinatarioId: string;
  texto: string;
  lida: boolean;
  createdAt: string;
  remetenteMe?: boolean;
}

export interface SlotFarmaceutico {
  farmaceuticoId: string;
  farmaceuticoNome: string;
  farmaceuticoTratamento?: string | null;
  farmaceuticoCrf?: string | null;
  horariosLivres: string[];
  agendaTimezone?: string;
}

export interface AvailabilitySlot {
  id?: string;
  diaSemana: number;
  horaInicio: string;
  horaFim: string;
  ativo?: boolean;
}

export interface EmergencyRequest {
  id: string;
  clienteId: string;
  farmaceuticoId?: string | null;
  status: 'EM_ABERTO' | 'ATENDIDA' | 'FARMACEUTICO_AGUARDANDO' | 'EM_ATENDIMENTO' | 'CONCLUIDA' | 'FALHA_ATENDIMENTO' | 'EXPIRADA' | 'CANCELADA' | 'ENCERRADA';
  roomSlug?: string | null;
  roomToken?: string | null;
  farmaceuticoEntrouEm?: string | null;
  clienteEntrouEm?: string | null;
  criadoEm: string;
  aceitoEm?: string | null;
  iniciadoEm?: string | null;
  encerradoEm?: string | null;
  cliente?: { id: string; nome: string; email: string };
  farmaceutico?: { id: string; nome: string } | null;
  roomUrl?: string;
  salaAbertaEm?: string | null;
  salaPronta?: boolean;
  notificacaoPaciente?: string;
  roomSession?: VideoRoomSession;
}

export const EMERGENCY_STATUS_LABELS: Record<string, string> = {
  EM_ABERTO: 'Aguardando farmacêutico',
  ATENDIDA: 'Farmacêutico aceitou',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
  ENCERRADA: 'Encerrada',
  FARMACEUTICO_AGUARDANDO: 'Farmacêutico aguardando',
  EM_ATENDIMENTO: 'Em atendimento',
  CONCLUIDA: 'Concluída',
  FALHA_ATENDIMENTO: 'Falha no atendimento',
};
