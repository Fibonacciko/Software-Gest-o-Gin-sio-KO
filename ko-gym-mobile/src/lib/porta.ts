import { Platform } from 'react-native';

/**
 * Onde a fotografia da porta se encaixa no ecrã de entrada.
 *
 * O "DIA UM" está pintado na parede da fotografia, e a caixa do número de
 * sócio cai mesmo por cima dele. Com a fotografia esticada à altura do ecrã,
 * as letras ficavam numa *fracção* dessa altura: num telemóvel mais alto
 * desciam, num mais baixo subiam, e acabavam sempre a roçar uma das linhas
 * da caixa.
 *
 * Por isso a fotografia deixa de estar agarrada ao ecrã e passa a estar
 * agarrada à caixa: desenha-se maior do que o ecrã e sobe o que for preciso
 * para as letras ficarem no meio dela, seja qual for o telemóvel.
 *
 * Sobe, e nunca desce: descer descobria o topo. Quando as letras ficariam
 * altas de mais, o que se faz é desenhar a fotografia ainda maior — numa
 * fotografia maior, as letras caem mais abaixo.
 *
 * O mesmo cálculo serve o **nome do ginásio**, que se desvia o que for
 * preciso para ficar mesmo por baixo do candeeiro — a apanhar a luz que ele
 * deita, como quem está debaixo dele. Candeeiro e letras estão na mesma
 * fotografia, a uma distância fixa um do outro: quem acerta um acerta o
 * outro.
 */

/** Onde as letras do "DIA UM" ficam dentro do ficheiro, de 0 a 1.
 *  Medido no próprio `assets/porta.jpg`: 626 e 699 de 1529 pixeis. */
export const LETRAS = { topo: 0.4094, base: 0.4572 };
export const MEIO_DAS_LETRAS = (LETRAS.topo + LETRAS.base) / 2;

/** E onde fica o candeeiro — o foco de luz, não o clarão que ele deixa na
 *  parede mais abaixo. Medido no ficheiro: 400 a 430 de 1529. */
export const CANDEEIRO = { topo: 0.2616, base: 0.2812 };
export const MEIO_DO_CANDEEIRO = (CANDEEIRO.topo + CANDEEIRO.base) / 2;

/** O que o ficheiro tem de largura por cada ponto de altura (705 por 1529).
 *  É por ele que se sabe se o `cover` estica pela altura ou pela largura. */
export const RACIO = 705 / 1529;

/**
 * O meio da caixa do número de sócio, a contar do topo do ecrã. Não depende
 * do tamanho do telemóvel — o formulário tem margens fixas —, mas depende
 * do **sistema**: no Android as linhas de texto com acentos ("Ginásio",
 * "sócio", "Número") ficam mais altas, e as três que estão por cima da caixa
 * empurram-na para baixo. Medido a 383 no navegador; no telemóvel do dono o
 * DIA UM aparecia subido, que é esta descida vista do outro lado.
 */
export const MEIO_NO_NAVEGADOR = 383;
export const DESCIDA_NO_ANDROID = 8;
export const MEIO_DA_CAIXA =
  MEIO_NO_NAVEGADOR + (Platform.OS === 'android' ? DESCIDA_NO_ANDROID : 0);

/** Metade da altura da caixa (52 pixeis), para quem precise dos bordos. */
export const MEIA_CAIXA = 26;

/** O quanto o meio do nome do ginásio fica acima do meio da caixa. É a mesma
 *  coluna de elementos nos dois, por isso a distância não muda de telemóvel
 *  para telemóvel. Medido no ecrã: 383 menos 249. */
export const NOME_ACIMA_DA_CAIXA = 134;

/** A letra do nome, e por aí o topo da caixa de texto dele. */
export const LETRA_DO_NOME = 30;
export const TOPO_DO_NOME = NOME_ACIMA_DA_CAIXA + LETRA_DO_NOME / 2;

/** A altura a que a fotografia é desenhada. Nunca menos do que o ecrã. */
export const alturaDaPorta = (largura: number, altura: number) =>
  Math.max(
    // cobrir o ecrã
    altura,
    // e continuar a cobri-lo depois de subir o que tem de subir
    (altura - MEIO_DA_CAIXA) / (1 - MEIO_DAS_LETRAS),
    // grande o suficiente para as letras chegarem à caixa sem ter de descer
    MEIO_DA_CAIXA / MEIO_DAS_LETRAS,
    // e grande o suficiente para ser a altura a mandar no `cover`, não a largura
    largura / RACIO
  );

/** A que distância do topo do ecrã a fotografia começa. Zero ou negativo. */
export const topoDaPorta = (largura: number, altura: number) =>
  Math.min(0, MEIO_DA_CAIXA - MEIO_DAS_LETRAS * alturaDaPorta(largura, altura));

/** Onde o candeeiro fica, a contar do topo do ecrã. */
export const candeeiroNoEcra = (largura: number, altura: number) =>
  topoDaPorta(largura, altura) + MEIO_DO_CANDEEIRO * alturaDaPorta(largura, altura);

/** Até onde o nome pode subir: o logotipo acaba aos 212. Num ecrã muito alto
 *  a fotografia cresce para o cobrir e o candeeiro sobe com ela — sem tecto,
 *  o nome ia-lhe bater. */
export const NOME_NAO_SOBE_ACIMA_DE = 218;

/**
 * O que o nome do ginásio se desvia para ficar mesmo por baixo do candeeiro:
 * a caixa de texto dele começa onde a luz acaba. Normalmente desce.
 *
 * Mexe no nome e mais nada: o subtítulo, os campos e, com eles, o "DIA UM"
 * dentro da caixa ficam onde estão.
 */
export const desvioDoNome = (largura: number, altura: number) => {
  const fimDaLuz =
    topoDaPorta(largura, altura) + CANDEEIRO.base * alturaDaPorta(largura, altura);
  const onde = Math.max(NOME_NAO_SOBE_ACIMA_DE, fimDaLuz);
  return Math.round(onde - (MEIO_DA_CAIXA - TOPO_DO_NOME));
};
