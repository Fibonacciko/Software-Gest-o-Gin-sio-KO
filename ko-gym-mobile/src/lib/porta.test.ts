import {
  LETRAS,
  CANDEEIRO,
  MEIO_DA_CAIXA,
  MEIA_CAIXA,
  NOME_ACIMA_DA_CAIXA,
  RACIO,
  alturaDaPorta,
  topoDaPorta,
  candeeiroNoEcra,
  subidaDoNome,
} from './porta';

// A caixa do numero de socio: o meio e medido, a altura sao 52 pixeis
const CAIXA = { topo: MEIO_DA_CAIXA - MEIA_CAIXA, base: MEIO_DA_CAIXA + MEIA_CAIXA };

// Os telemoveis que interessam, do mais baixo ao mais alto que se ve hoje
const ECRAS: [number, number][] = [
  [360, 780],
  [393, 800],
  [393, 852],
  [393, 873],
  [400, 895],
  [412, 915],
  [430, 950],
];

const naFotografia = (faixa: { topo: number; base: number }, largura: number, altura: number) => {
  const h = alturaDaPorta(largura, altura);
  const topo = topoDaPorta(largura, altura);
  return { topo: topo + faixa.topo * h, base: topo + faixa.base * h };
};

describe('a porta no ecra de entrada', () => {
  it.each(ECRAS)('em %ix%i as letras ficam dentro da caixa', (largura, altura) => {
    const letras = naFotografia(LETRAS, largura, altura);
    expect(letras.topo).toBeGreaterThan(CAIXA.topo);
    expect(letras.base).toBeLessThan(CAIXA.base);
  });

  it.each(ECRAS)('em %ix%i a fotografia cobre o ecra todo', (largura, altura) => {
    const h = alturaDaPorta(largura, altura);
    const topo = topoDaPorta(largura, altura);
    expect(topo).toBeLessThanOrEqual(0);
    expect(topo + h).toBeGreaterThanOrEqual(altura);
    // E a altura e que manda no `cover`: esticada, ela ja chega para a largura
    expect(h * RACIO).toBeGreaterThanOrEqual(largura);
  });

  it.each(ECRAS)('em %ix%i as letras ficam no meio da caixa', (largura, altura) => {
    const letras = naFotografia(LETRAS, largura, altura);
    expect(Math.round((letras.topo + letras.base) / 2)).toBe(MEIO_DA_CAIXA);
  });
});

describe('o nome do ginasio debaixo do candeeiro', () => {
  // O nome tem 30 pixeis de letra; as maiusculas ocupam cerca de 0,72 disso
  const METADE_DAS_LETRAS = (30 * 0.72) / 2;
  const meioDoNome = (largura: number, altura: number) =>
    MEIO_DA_CAIXA - NOME_ACIMA_DA_CAIXA + subidaDoNome(largura, altura);

  it.each(ECRAS)('em %ix%i o nome fica debaixo do foco de luz', (largura, altura) => {
    const luz = naFotografia(CANDEEIRO, largura, altura);
    const meio = meioDoNome(largura, altura);
    expect(meio).toBeGreaterThanOrEqual(luz.topo);
    expect(meio).toBeLessThanOrEqual(luz.base);
  });

  it('sobe o nome, nunca o desce: a luz esta por cima dele', () => {
    for (const [largura, altura] of ECRAS) {
      expect(subidaDoNome(largura, altura)).toBeLessThan(0);
    }
  });

  it('o nome nao sobe ao ponto de bater no logotipo, que acaba aos 212', () => {
    for (const [largura, altura] of ECRAS) {
      const topo = meioDoNome(largura, altura) - METADE_DAS_LETRAS;
      expect(topo).toBeGreaterThan(212);
    }
  });

  it('o candeeiro fica sempre acima da caixa', () => {
    for (const [largura, altura] of ECRAS) {
      expect(candeeiroNoEcra(largura, altura)).toBeLessThan(MEIO_DA_CAIXA);
    }
  });
});
