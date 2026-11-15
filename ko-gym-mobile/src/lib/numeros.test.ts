import { comVirgula, diferenca } from './numeros';

describe('os números escrevem-se com vírgula', () => {
  test('a casa decimal leva vírgula', () => {
    expect(comVirgula(79.8)).toBe('79,8');
    expect(comVirgula(55.25)).toBe('55,25');
  });

  test('um número inteiro não ganha casas que a balança não deu', () => {
    expect(comVirgula(7)).toBe('7');
    expect(comVirgula(35)).toBe('35');
  });

  test('aceita o número escrito em texto, como vem do servidor', () => {
    expect(comVirgula('20.6')).toBe('20,6');
  });

  test('o que não é número não escreve nada, em vez de NaN', () => {
    expect(comVirgula(null)).toBe('');
    expect(comVirgula(undefined)).toBe('');
    expect(comVirgula('')).toBe('');
  });

  test('negativos mantêm o sinal', () => {
    expect(comVirgula(-1.5)).toBe('-1,5');
  });
});

describe('a diferença diz sempre para que lado foi', () => {
  test('subir leva o sinal à frente', () => {
    expect(diferenca(2.5)).toBe('+2,5');
  });

  test('descer leva o menos', () => {
    expect(diferenca(-4.4)).toBe('-4,4');
  });

  test('zero não leva sinal nenhum', () => {
    expect(diferenca(0)).toBe('0,0');
  });

  test('arredonda às casas pedidas', () => {
    expect(diferenca(2.46)).toBe('+2,5');
    expect(diferenca(2.46, 2)).toBe('+2,46');
    expect(diferenca(-6, 0)).toBe('-6');
  });

  test('o que não é número não escreve nada', () => {
    expect(diferenca(NaN)).toBe('');
  });
});
