/**
 * Onde a fotografia da porta se encaixa no ecrã de entrada.
 *
 * O "DIA UM" está pintado na parede da fotografia, e a caixa do número de
 * sócio cai mesmo por cima dele. Com a fotografia esticada à altura do ecrã,
 * as letras ficavam numa *fracção* dessa altura: num telemóvel mais alto
 * desciam, num mais baixo subiam, e acabavam sempre a roçar uma das linhas
 * da caixa — a de cima aqui, a de baixo no telemóvel do dono.
 *
 * Por isso a fotografia deixa de estar agarrada ao ecrã e passa a estar
 * agarrada à caixa: desenha-se maior do que o ecrã e sobe o que for preciso
 * para as letras ficarem no meio dela, seja qual for o telemóvel.
 *
 * Sobe, e nunca desce: descer descobria o topo. Quando as letras ficariam
 * altas de mais, o que se faz é desenhar a fotografia ainda maior — numa
 * fotografia maior, as letras caem mais abaixo.
 */

/** Onde as letras ficam dentro do ficheiro, de 0 (topo) a 1 (fundo).
 *  Medido no próprio `assets/porta.jpg`: 626 e 699 de 1529 pixeis. */
export const LETRAS = { topo: 0.4094, base: 0.4572 };
export const MEIO_DAS_LETRAS = (LETRAS.topo + LETRAS.base) / 2;

/** O que o ficheiro tem de largura por cada ponto de altura (705 por 1529).
 *  É por ele que se sabe se o `cover` estica pela altura ou pela largura. */
export const RACIO = 705 / 1529;

/** O meio da caixa do número de sócio, em pixeis a contar do topo do ecrã.
 *  Não depende do telemóvel: o formulário tem margens fixas. Medido no ecrã. */
export const MEIO_DA_CAIXA = 383;

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
