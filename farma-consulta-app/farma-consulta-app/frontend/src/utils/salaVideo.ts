export function gerarSala(nome: string): string {
  const slug = nome
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://meet.jit.si/${slug || 'consulta-online'}`;
}

export function gerarTokenSala(): string {
  // Gera um identificador aleatório e imprevisível para dificultar acesso indevido à sala
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}