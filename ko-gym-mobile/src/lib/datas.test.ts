import { dataPt, jaPassou } from './datas';

/**
 * Estava copiada em três ficheiros e as cópias já tinham divergido: duas
 * devolviam `null` sem data e a terceira devolvia texto vazio. Agora é uma
 * só, e estes testes são o que a prende.
 */
describe('a data como se lê em Portugal', () => {
  it('escreve o dia antes do mês', () => {
    // Em inglês isto daria 11/16/2026, que em Portugal se lê como outro dia
    expect(dataPt('2026-11-16T00:00:00+00:00')).toBe('16/11/2026');
  });

  it('não recua um dia nas datas guardadas com hora', () => {
    // As datas vêm do servidor com hora e fuso. A meia-noite em UTC é 00h ou
    // 01h em Lisboa, nunca o dia anterior.
    expect(dataPt('2026-07-01T00:00:00+00:00')).toBe('01/07/2026');
    expect(dataPt('2026-01-01T00:00:00+00:00')).toBe('01/01/2026');
  });

  it('sem data devolve nada, e não texto vazio', () => {
    // Foi a diferença entre `null` e `''` que separou as três cópias
    expect(dataPt(null)).toBeNull();
    expect(dataPt(undefined)).toBeNull();
    expect(dataPt('')).toBeNull();
  });
});

describe('jaPassou', () => {
  const hoje = new Date(2026, 10, 15); // 15 de novembro de 2026

  it('ontem passou, amanha nao', () => {
    expect(jaPassou('2026-11-14', hoje)).toBe(true);
    expect(jaPassou('2026-11-16', hoje)).toBe(false);
  });

  it('o proprio dia ainda nao passou', () => {
    // Um seguro valido ate hoje ainda vale hoje
    expect(jaPassou('2026-11-15', hoje)).toBe(false);
  });

  it('le o dia do texto, com hora e fuso', () => {
    expect(jaPassou('2026-11-14T00:00:00+00:00', hoje)).toBe(true);
    expect(jaPassou('2026-11-15T23:00:00+00:00', hoje)).toBe(false);
  });

  it('sem data nao se sabe', () => {
    expect(jaPassou(null, hoje)).toBeNull();
    expect(jaPassou(undefined, hoje)).toBeNull();
    expect(jaPassou('', hoje)).toBeNull();
  });

  it('muda de ano sem se enganar', () => {
    expect(jaPassou('2025-12-31', hoje)).toBe(true);
    expect(jaPassou('2027-01-01', hoje)).toBe(false);
  });
});
