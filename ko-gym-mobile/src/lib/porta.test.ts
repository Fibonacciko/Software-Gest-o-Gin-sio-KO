import {
  LETRAS,
  CANDEEIRO,
  MEIO_DA_CAIXA,
  MEIA_CAIXA,
  TOPO_DO_NOME,
  LETRA_DO_NOME,
  NOME_NAO_SOBE_ACIMA_DE,
  RACIO,
  alturaDaPorta,
  topoDaPorta,
  candeeiroNoEcra,
  desvioDoNome,
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

describe('o nome do ginasio por baixo do candeeiro', () => {
  const nomeNoEcra = (largura: number, altura: number) => {
    const topo = MEIO_DA_CAIXA - TOPO_DO_NOME + desvioDoNome(largura, altura);
    return { topo, base: topo + LETRA_DO_NOME };
  };

  it.each(ECRAS)('em %ix%i o nome comeca onde a luz acaba', (largura, altura) => {
    const luz = naFotografia(CANDEEIRO, largura, altura);
    const nome = nomeNoEcra(largura, altura);
    // por baixo da luz, nao por cima dela nem dentro dela
    expect(nome.topo).toBeGreaterThanOrEqual(Math.min(luz.base, NOME_NAO_SOBE_ACIMA_DE));
    // e encostado: um pixel de arredondamento e tudo o que se admite
    expect(nome.topo).toBeLessThanOrEqual(Math.max(luz.base, NOME_NAO_SOBE_ACIMA_DE) + 1);
  });

  it.each(ECRAS)('em %ix%i o nome nao bate no logotipo nem no subtitulo', (largura, altura) => {
    const nome = nomeNoEcra(largura, altura);
    // o logotipo acaba aos 212
    expect(nome.topo).toBeGreaterThan(212);
    // e o subtitulo comeca 95 pixeis acima do meio da caixa
    expect(nome.base).toBeLessThan(MEIO_DA_CAIXA - 95);
  });

  it('o candeeiro fica sempre acima da caixa', () => {
    for (const [largura, altura] of ECRAS) {
      expect(candeeiroNoEcra(largura, altura)).toBeLessThan(MEIO_DA_CAIXA);
    }
  });
});
