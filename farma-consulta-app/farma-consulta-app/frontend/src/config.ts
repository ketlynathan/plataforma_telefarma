export const APP_TITLE = 'Farma Consulta';
export const APP_ICON = '💊';

export const COLORS = {
  primary: '#0f766e',
  secondary: '#f0fdfa',
  accent: '#f59e0b',
};

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api';

export const LOGO_SMALL = new URL('./assets/logo-pequeno.svg', import.meta.url).href;
export const LOGO_FULL = new URL('./assets/logo-completo.svg', import.meta.url).href;
