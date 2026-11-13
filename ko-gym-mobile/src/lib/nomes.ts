/**
 * O nome do sócio, como ele aparece no cartão.
 */

/**
 * Nome próprio e apelido, e mais nada.
 *
 * Decisão do dono: "José Manuel dos Santos Oliveira" não cabe na largura de
 * um telemóvel, e num cartão o que conta é reconhecer-se quem ele é. Fica
 * "José Oliveira".
 *
 * Um nome de uma palavra só fica como está — não se inventa apelido.
 */
export const nomeCurto = (nome?: string | null): string => {
  const partes = String(nome ?? '').trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes[0]} ${partes[partes.length - 1]}`;
};
