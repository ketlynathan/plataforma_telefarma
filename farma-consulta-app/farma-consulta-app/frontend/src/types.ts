export interface Consulta {
  id: string;
  pacienteNome: string;
  pacienteEmail: string;
  data: string;
  hora: string;
  status: string;
  observacoes?: string;
}
