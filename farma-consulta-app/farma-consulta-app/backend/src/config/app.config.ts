// Equivalente a config.py (APP_TITLE, APP_ICON, cores, colunas)
export const appConfig = {
  title: 'Farma Consulta',
  icon: '💊',
  colors: {
    primary: '#0f766e',
    secondary: '#f0fdfa',
    accent: '#f59e0b',
  },
  userColumns: [
    'nome',
    'email',
    'senha',
    'tipo',
    'telefone',
    'cpf',
    'dataNascimento',
    'cep',
    'endereco',
    'cidade',
    'estado',
    'doencasCronicas',
    'alergias',
    'medicamentosUso',
  ],
  consultaColumns: [
    'id',
    'pacienteNome',
    'pacienteEmail',
    'data',
    'hora',
    'status',
    'observacoes',
  ],
} as const;

export type UserTipo = 'cliente' | 'farmaceutico';
