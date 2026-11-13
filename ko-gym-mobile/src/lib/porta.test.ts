import { LETRAS, MEIO_DA_CAIXA, RACIO, alturaDaPorta, topoDaPorta } from './porta';

// A caixa do numero de socio, medida no ecra
const CAIXA = { topo: 357, base: 409 };

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

const letrasNoEcra = (largura: number, altura: number) => {
  const h = alturaDaPorta(largura, altura);
  const topo = topoDaPorta(largura, altura);
  return { topo: topo + LETRAS.topo * h, base: topo + LETRAS.base * h };
};

describe('a porta no ecra de entrada', () => {
  it.each(ECRAS)('em %ix%i as letras ficam dentro da caixa', (largura, altura) => {
    const letras = letrasNoEcra(largura, altura);
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
    const letras = letrasNoEcra(largura, altura);
    expect(Math.round((letras.topo + letras.base) / 2)).toBe(MEIO_DA_CAIXA);
  });
});
