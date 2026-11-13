import { nomeCurto } from './nomes';

/**
 * Decisão do dono: no cartão fica o nome próprio e o apelido, e mais nada.
 * Um nome completo português não cabe na largura de um telemóvel.
 */
describe('o nome no cartão', () => {
  it('fica com o primeiro e o último', () => {
    expect(nomeCurto('José Manuel dos Santos Oliveira')).toBe('José Oliveira');
  });

  it('deixa em paz quem já tem dois', () => {
    expect(nomeCurto('Ana Ferreira')).toBe('Ana Ferreira');
  });

  it('não inventa apelido a quem só tem um nome', () => {
    expect(nomeCurto('Ricardo')).toBe('Ricardo');
  });

  it('não se perde com espaços a mais', () => {
    expect(nomeCurto('  Maria   João   Silva  ')).toBe('Maria Silva');
  });

  it('sem nome não rebenta', () => {
    // A ficha pode vir sem nome; um cartão sem nome é feio, um ecrã em branco
    // é pior
    expect(nomeCurto('')).toBe('');
    expect(nomeCurto(null)).toBe('');
    expect(nomeCurto(undefined)).toBe('');
  });
});
