import { euros } from './dinheiro';

describe('o dinheiro a portuguesa', () => {
  it('leva virgula e o simbolo no fim', () => {
    expect(euros(35)).toBe('35,00 €');
    expect(euros(15.5)).toBe('15,50 €');
    expect(euros(0)).toBe('0,00 €');
  });

  it('arredonda aos centimos', () => {
    expect(euros(19.999)).toBe('20,00 €');
    expect(euros(1 / 3)).toBe('0,33 €');
  });

  it('aguenta valores grandes e negativos', () => {
    expect(euros(1234.5)).toBe('1234,50 €');
    expect(euros(-20)).toBe('-20,00 €');
  });

  it('sem numero nao rebenta', () => {
    expect(euros(undefined as unknown as number)).toBe('0,00 €');
    expect(euros(NaN)).toBe('0,00 €');
  });
});
