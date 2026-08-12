export function gerarSala(nome: string): string {
  const slug = nome
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `https://demo.daily.co/${slug || 'consulta-online'}`;
}
