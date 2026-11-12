import {
  dentroDoPeriodo,
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

describe('um dia basta: o fim do período é opcional', () => {
  test('sem o "até", conta só o próprio dia', () => {
    expect(dentroDoPeriodo('2026-11-07', '2026-11-07', '')).toBe(true);
    expect(dentroDoPeriodo('2026-11-08', '2026-11-07', '')).toBe(false);
    expect(dentroDoPeriodo('2026-11-06', '2026-11-07', '')).toBe(false);
  });

  test('o "até" por preencher é o mesmo que não o haver', () => {
    for (const vazio of ['', null, undefined]) {
      expect(dentroDoPeriodo('2026-11-07', '2026-11-07', vazio)).toBe(true);
      expect(dentroDoPeriodo('2026-11-09', '2026-11-07', vazio)).toBe(false);
    }
  });

  test('com o "até", é o intervalo todo, pontas incluídas', () => {
    expect(dentroDoPeriodo('2026-11-01', '2026-11-01', '2026-11-30')).toBe(true);
    expect(dentroDoPeriodo('2026-11-30', '2026-11-01', '2026-11-30')).toBe(true);
    expect(dentroDoPeriodo('2026-11-15', '2026-11-01', '2026-11-30')).toBe(true);
    expect(dentroDoPeriodo('2026-12-01', '2026-11-01', '2026-11-30')).toBe(false);
  });

  test('a data vem com hora e isso não atrapalha', () => {
    expect(dentroDoPeriodo('2026-11-07T00:00:00+00:00', '2026-11-07', '')).toBe(true);
    expect(dentroDoPeriodo('2026-11-07T23:30:00+00:00', '2026-11-07', '')).toBe(true);
  });

  test('o sábado não passa a sexta no horário de verão', () => {
    // `new Date('2026-07-01')` em Lisboa é 30 de junho às 23:00. Por isso se
    // compara o texto: o primeiro de julho tem de cair em julho.
    expect(dentroDoPeriodo('2026-07-01', '2026-07-01', '2026-07-31')).toBe(true);
    expect(dentroDoPeriodo('2026-07-01', '2026-06-01', '2026-06-30')).toBe(false);
  });

  test('sem dia escolhido, nada cai dentro', () => {
    expect(dentroDoPeriodo('2026-11-07', '', '')).toBe(false);
    expect(dentroDoPeriodo('', '2026-11-07', '')).toBe(false);
    expect(dentroDoPeriodo(null, '2026-11-07', '')).toBe(false);
  });
});
