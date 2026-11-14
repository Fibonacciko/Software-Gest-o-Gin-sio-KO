import { nomeDoDia, tamanhoDaTinta, TINTA, MEIO_DA_TINTA, POR_EXTENSO } from './dia';

describe('o que a parede diz', () => {
  it('conta por extenso ate ao vinte', () => {
    expect(nomeDoDia(1)).toBe('DIA UM');
    expect(nomeDoDia(2)).toBe('DIA DOIS');
    expect(nomeDoDia(3)).toBe('DIA TRÊS');
    expect(nomeDoDia(14)).toBe('DIA CATORZE');
    expect(nomeDoDia(16)).toBe('DIA DEZASSEIS');
    expect(nomeDoDia(20)).toBe('DIA VINTE');
  });

  it('passa a algarismos a partir do vinte e um', () => {
    expect(nomeDoDia(21)).toBe('DIA 21');
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

  it('os numeros estao em portugues de Portugal', () => {
    expect(POR_EXTENSO).toContain('CATORZE');
    expect(POR_EXTENSO).toContain('DEZASSEIS');
    expect(POR_EXTENSO).toContain('DEZASSETE');
    expect(POR_EXTENSO).toContain('DEZANOVE');
    expect(POR_EXTENSO).not.toContain('QUATORZE');
    expect(POR_EXTENSO).not.toContain('DEZESSEIS');
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
