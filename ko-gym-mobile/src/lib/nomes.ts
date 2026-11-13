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

/**
 * O nome de uma modalidade, sem o emoji que vem agarrado.
 *
 * Na base de dados as modalidades chamam-se "🥊 Boxe", "🦵 Kickboxing",
 * "🏋️ Musculação". Juntos num ecrã são uma luva, uma perna, um quimono, um
 * bíceps e um halterofilista — desenhos de autores diferentes, tamanhos
 * diferentes e, em Android, alguns nem sequer aparecem iguais.
 *
 * Por decisão do dono saem da aplicação. O que fica a distinguir cada
 * modalidade é a **cor**, que cada uma já tem e que é a mesma em todo o lado.
 *
 * Tira-se só o que está **à frente** do nome: um emoji no meio de um nome
 * escrito à mão é escolha de quem o escreveu, e não se mexe.
 */
export const semEmoji = (nome?: string | null): string =>
  String(nome ?? '')
    .replace(
      /^(?:[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]|\s)+/u,
      ''
    )
    .trim();
