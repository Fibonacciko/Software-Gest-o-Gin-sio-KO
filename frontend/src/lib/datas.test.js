import {
  diaLocal,
  diaSeguinte,
  primeiroDiaDoMes,
  ultimoDiaDoMes
} from './datas';

describe('as datas lêem-se, não se convertem', () => {
  test('um dia qualquer sai como está', () => {
    expect(diaLocal(new Date(2026, 10, 12))).toBe('2026-11-12');
  });

  test('o mês e o dia levam zero à frente', () => {
    expect(diaLocal(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  test('a meia-noite do horário de verão não recua um dia', () => {
    // Esta é a razão de ser deste ficheiro. Em Lisboa, 1 de julho às 00:00
    // é 30 de junho às 23:00 em UTC, e o toISOString() devolvia "2026-06-30".
    const meiaNoiteDeJulho = new Date(2026, 6, 1, 0, 0, 0);
    expect(diaLocal(meiaNoiteDeJulho)).toBe('2026-07-01');
  });

  test('o fim do dia também não avança', () => {
    expect(diaLocal(new Date(2026, 6, 1, 23, 59, 59))).toBe('2026-07-01');
  });
});

describe('o dia seguinte', () => {
  test('é o dia a seguir', () => {
    expect(diaSeguinte(new Date(2026, 10, 12))).toBe('2026-11-13');
  });

  test('vira o mês', () => {
    expect(diaSeguinte(new Date(2026, 10, 30))).toBe('2026-12-01');
  });

  test('vira o ano', () => {
    expect(diaSeguinte(new Date(2026, 11, 31))).toBe('2027-01-01');
  });

  test('conta o 29 de fevereiro de um ano bissexto', () => {
    expect(diaSeguinte(new Date(2028, 1, 28))).toBe('2028-02-29');
  });
});

describe('os limites do mês', () => {
  test('o primeiro dia', () => {
    expect(primeiroDiaDoMes(new Date(2026, 6, 18))).toBe('2026-07-01');
  });

  test('o último dia de um mês de 31', () => {
    expect(ultimoDiaDoMes(new Date(2026, 6, 18))).toBe('2026-07-31');
  });

  test('o último dia de um mês de 30', () => {
    expect(ultimoDiaDoMes(new Date(2026, 5, 18))).toBe('2026-06-30');
  });

  test('o último dia de fevereiro, bissexto e não', () => {
    expect(ultimoDiaDoMes(new Date(2026, 1, 10))).toBe('2026-02-28');
    expect(ultimoDiaDoMes(new Date(2028, 1, 10))).toBe('2028-02-29');
  });
});
