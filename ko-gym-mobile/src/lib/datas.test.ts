import { dataPt } from './datas';

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
