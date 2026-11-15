import { euros, valorEmEuros } from './dinheiro';

describe('o dinheiro escreve-se à portuguesa', () => {
  test('vírgula nos cêntimos e o símbolo no fim', () => {
    expect(euros(35)).toBe('35,00 €');
    expect(euros(35.5)).toBe('35,50 €');
    expect(euros(0)).toBe('0,00 €');
  });

  test('os milhares levam ponto', () => {
    expect(euros(1250)).toBe('1.250,00 €');
    expect(euros(12345.67)).toBe('12.345,67 €');
    expect(euros(1000000)).toBe('1.000.000,00 €');
    // 999 não leva separador nenhum
    expect(euros(999.99)).toBe('999,99 €');
  });

  test('o sinal vem antes de tudo, e não entre o número e o símbolo', () => {
    expect(euros(-35)).toBe('-35,00 €');
    expect(euros(-1250.5)).toBe('-1.250,50 €');
  });

  test('arredonda aos cêntimos', () => {
    expect(euros(35.456)).toBe('35,46 €');
    expect(euros(0.005)).toBe('0,01 €');
  });

  test('não existe -0,00 €', () => {
    expect(euros(-0)).toBe('0,00 €');
    expect(euros(-0.001)).toBe('0,00 €');
  });

  test('o que não é número conta como zero, em vez de rebentar', () => {
    expect(euros(null)).toBe('0,00 €');
    expect(euros(undefined)).toBe('0,00 €');
    expect(euros('')).toBe('0,00 €');
    expect(euros(NaN)).toBe('0,00 €');
    expect(euros(Infinity)).toBe('0,00 €');
  });

  test('um valor numa cadeia de texto conta como número', () => {
    expect(euros('35.5')).toBe('35,50 €');
  });

  test('o número sem o símbolo, para onde o € já está escrito', () => {
    expect(valorEmEuros(35)).toBe('35,00');
    expect(valorEmEuros(1250)).toBe('1.250,00');
  });
});
