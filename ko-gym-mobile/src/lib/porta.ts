/**
 * Onde a fotografia da porta se encaixa no ecrã de entrada.
 *
 * A fotografia que lá esteve tinha o "DIA UM" pintado na parede, e toda esta
 * conta nasceu para o encaixar dentro da caixa do número de sócio. A nova não
 * tem letras nenhumas — o que ela tem é um **candeeiro**, aceso por cima da
 * porta, e é ele que passa a mandar.
 *
 * A fotografia é desenhada maior do que o ecrã e sobe o que for preciso para
 * a luz do candeeiro acabar exactamente onde o nome do ginásio começa: o nome
 * fica debaixo do foco, como quem está à entrada. Assim o candeeiro cai no
 * mesmo sítio em qualquer telemóvel, em vez de subir e descer com a altura
 * do ecrã.
 *
 * Sobe, e nunca desce: descer descobria o topo. Quando a luz ficaria alta de
 * mais, o que se faz é desenhar a fotografia ainda maior — numa fotografia
 * maior, o candeeiro cai mais abaixo.
 */

/** Onde o candeeiro fica dentro do ficheiro, de 0 a 1 — o foco em si, não o
 *  cone de luz que ele deita por baixo. Medido no próprio `assets/porta.jpg`:
 *  396 a 432 de 1529 pixeis, onde o brilho salta de 79 para 241 e volta a
 *  cair para o cone, à volta de 175. */
export const CANDEEIRO = { topo: 0.259, base: 0.2826 };
export const MEIO_DO_CANDEEIRO = (CANDEEIRO.topo + CANDEEIRO.base) / 2;

/** O que o ficheiro tem de largura por cada ponto de altura (705 por 1529).
 *  É por ele que se sabe se o `cover` estica pela altura ou pela largura. */
export const RACIO = 705 / 1529;

/**
 * Onde as letras do nome do ginásio começam, a contar do topo do ecrã. Não
 * depende do telemóvel: por cima do nome só está o logotipo, que tem medidas
 * fixas — e por isso também não depende do sistema, ao contrário dos campos,
 * que vêm depois de três linhas de texto com acentos. Medido no ecrã: 234.
 *
 * Mede-se pelas **letras** e não pela caixa de texto: a caixa tem espaço
 * vazio por cima das maiúsculas, e a acertar por ela o nome ficava mais
 * abaixo do que parece.
 */
export const NOME_COMECA_AOS = 234;

/** A altura das maiúsculas do nome. */
export const LETRA_DO_NOME = 30;

/** Até onde o nome pode subir: o logotipo acaba aos 212. Num ecrã pequeno a
 *  fotografia já não cabe mais e o candeeiro fica acima do sítio dele — sem
 *  tecto, o nome ia-lhe bater. */
export const NOME_NAO_SOBE_ACIMA_DE = 218;

/** A altura a que a fotografia é desenhada. Nunca menos do que o ecrã. */
export const alturaDaPorta = (largura: number, altura: number) =>
  Math.max(
    // cobrir o ecrã
    altura,
    // e continuar a cobri-lo depois de subir o que tem de subir
    (altura - NOME_COMECA_AOS) / (1 - CANDEEIRO.base),
    // grande o suficiente para a luz chegar ao nome sem a fotografia descer
    NOME_COMECA_AOS / CANDEEIRO.base,
    // e grande o suficiente para ser a altura a mandar no `cover`, não a largura
    largura / RACIO
  );

/** A que distância do topo do ecrã a fotografia começa. Zero ou negativo. */
export const topoDaPorta = (largura: number, altura: number) =>
  Math.min(0, NOME_COMECA_AOS - CANDEEIRO.base * alturaDaPorta(largura, altura));

/** Onde o candeeiro fica, a contar do topo do ecrã. */
export const candeeiroNoEcra = (largura: number, altura: number) =>
  topoDaPorta(largura, altura) + MEIO_DO_CANDEEIRO * alturaDaPorta(largura, altura);

/** Onde a luz do candeeiro acaba, a contar do topo do ecrã. */
export const luzAcabaEm = (largura: number, altura: number) =>
  topoDaPorta(largura, altura) + CANDEEIRO.base * alturaDaPorta(largura, altura);

/**
 * O que o nome do ginásio se desvia para ficar mesmo por baixo do candeeiro.
 * Com a fotografia agarrada ao candeeiro isto dá zero quase sempre; só num
 * ecrã pequeno de mais, onde a fotografia já não pode crescer, é que o nome
 * sobe um pouco ao encontro da luz.
 *
 * Mexe no nome e mais nada: o subtítulo e os campos ficam onde estão.
 */
export const desvioDoNome = (largura: number, altura: number) => {
  const onde = Math.max(NOME_NAO_SOBE_ACIMA_DE, luzAcabaEm(largura, altura));
  return Math.round(onde - NOME_COMECA_AOS);
};
