/**
 * A tinta na parede da capa do cartão.
 *
 * A fotografia que lá esteve tinha "DIA UM" pintado na parede, e era pintura:
 * ficava "DIA UM" ao sócio que treinava há três anos. A fotografia passou a
 * ser a mesma sala **sem letra nenhuma**, e o que lá está agora é texto — os
 * dias em que aquele sócio treinou, escritos na parede.
 *
 * **Dias, e não treinos** (`training_days`, não `workout_count`): quem treina
 * duas modalidades no mesmo dia fez dois treinos num dia só, e a palavra que
 * está na parede é "DIA". Os treinos contam-se no cartão dos números, logo
 * ali abaixo.
 *
 * A letra é a **Anton**, esticada 13% (`ESTICA`): é a que assenta por cima da
 * pintura original, letra a letra. Entra como ficheiro em `assets/` e não como
 * biblioteca, para não mexer na impressão digital da aplicação.
 */

/** Os números por extenso, que é como estava pintado. Do vinte em diante
 *  passam a algarismos: "DIA VINTE E SETE" não cabe na parede, e "DIA 137"
 *  tem o ar certo — é um número que se gaba. */
export const POR_EXTENSO = [
  'UM',
  'DOIS',
  'TRÊS',
  'QUATRO',
  'CINCO',
  'SEIS',
  'SETE',
  'OITO',
  'NOVE',
  'DEZ',
  'ONZE',
  'DOZE',
  'TREZE',
  'CATORZE',
  'QUINZE',
  'DEZASSEIS',
  'DEZASSETE',
  'DEZOITO',
  'DEZANOVE',
  'VINTE',
];

/**
 * O que a parede diz a este sócio. Quem ainda não treinou nenhuma vez fica
 * com "DIA UM": é o que a fotografia conta — alguém parado à porta, antes de
 * começar —, e no dia do primeiro check-in a parede continua a dizer o mesmo,
 * que é quando passa a ser verdade.
 */
export const nomeDoDia = (treinos: number | null | undefined) => {
  const n = Math.max(1, Math.floor(Number(treinos) || 0));
  return `DIA ${n <= POR_EXTENSO.length ? POR_EXTENSO[n - 1] : n}`;
};

/**
 * Onde a tinta ficava na fotografia antiga, de 0 a 1 — medido nas próprias
 * letras: o alto e o fundo das maiúsculas, que é o que se vê. A fotografia
 * nova tem o mesmo enquadramento, por isso o texto vai para o mesmo sítio.
 */
export const TINTA = { topo: 0.2652, base: 0.3377 };
export const MEIO_DA_TINTA = (TINTA.topo + TINTA.base) / 2;

/** O quanto as maiúsculas da Anton ocupam do tamanho da letra. Medido no
 *  próprio ficheiro: 268 pontos de altura num tamanho de 312. */
export const MAIUSCULA_DA_ANTON = 0.859;

/** A Anton é mais estreita do que a pintura. Esticada 13% assenta-lhe por
 *  cima; medido letra a letra. */
export const ESTICA = 1.13;

/** O tamanho de letra que dá às maiúsculas a mesma altura que a tinta tinha. */
export const tamanhoDaTinta = (alturaDaCapa: number) =>
  Math.round(((TINTA.base - TINTA.topo) * alturaDaCapa) / MAIUSCULA_DA_ANTON);
