import { nomeDoDia, tamanhoDaTinta, TINTA, MEIO_DA_TINTA, POR_EXTENSO } from './dia';

describe('o que a parede diz', () => {
  it('conta por extenso ate ao nove', () => {
    expect(nomeDoDia(1)).toBe('DIA UM');
    expect(nomeDoDia(2)).toBe('DIA DOIS');
    expect(nomeDoDia(3)).toBe('DIA TRÊS');
    expect(nomeDoDia(4)).toBe('DIA QUATRO');
    expect(nomeDoDia(9)).toBe('DIA NOVE');
  });

  it('passa a algarismos a partir do dez', () => {
    expect(nomeDoDia(10)).toBe('DIA 10');
    expect(nomeDoDia(17)).toBe('DIA 17');
    expect(nomeDoDia(137)).toBe('DIA 137');
    expect(nomeDoDia(1000)).toBe('DIA 1000');
  });

  // Quem ainda nao treinou esta no dia um: e o que a fotografia conta.
  it('quem ainda nao treinou fica no dia um', () => {
    expect(nomeDoDia(0)).toBe('DIA UM');
    expect(nomeDoDia(null)).toBe('DIA UM');
    expect(nomeDoDia(undefined)).toBe('DIA UM');
    expect(nomeDoDia(-3)).toBe('DIA UM');
  });

  // A parede livre entre os caixilhos da porta da 196 pixeis no ecra, e o
  // "DIA " mais o espaco levam 54. Por extenso ate ao vinte, o DEZASSETE
  // encostava aos caixilhos dos dois lados; acabando no nove, a frase mais
  // larga e o "DIA QUATRO". Dez letras e o tecto que isso da.
  it('nenhuma frase cresce ao ponto de bater nos caixilhos', () => {
    const maior = Math.max(
      ...Array.from({ length: 9999 }, (_, i) => nomeDoDia(i + 1).length)
    );
    expect(maior).toBeLessThanOrEqual('DIA QUATRO'.length);
  });

  it('as palavras sao as dos nove primeiros dias', () => {
    expect(POR_EXTENSO).toHaveLength(9);
    expect(POR_EXTENSO[0]).toBe('UM');
    expect(POR_EXTENSO[8]).toBe('NOVE');
  });
});

describe('o tamanho da tinta', () => {
  // A capa tem 312 mais a barra de estado, que varia de telemovel para
  // telemovel. As letras tem de crescer com ela, para ficarem do mesmo
  // tamanho na parede.
  it.each([
    [312 + 24, 28],
    [312 + 40, 30],
    [312 + 56, 31],
  ])('numa capa de %i a letra fica em %i', (capa, esperado) => {
    expect(tamanhoDaTinta(capa)).toBe(esperado);
  });

  it('a tinta fica no terco de cima da capa, por baixo do candeeiro', () => {
    expect(TINTA.topo).toBeGreaterThan(0.2);
    expect(TINTA.base).toBeLessThan(0.4);
    expect(MEIO_DA_TINTA).toBeCloseTo(0.3014, 3);
  });
});
