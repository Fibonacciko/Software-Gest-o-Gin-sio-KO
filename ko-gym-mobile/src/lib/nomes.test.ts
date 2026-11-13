import { nomeCurto, semEmoji } from './nomes';

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

describe('o nome de uma modalidade', () => {
  it('tira o emoji que vem à frente', () => {
    expect(semEmoji('🥊 Boxe')).toBe('Boxe');
    expect(semEmoji('🦵 Kickboxing')).toBe('Kickboxing');
    expect(semEmoji('🥋 Jiu-Jitsu')).toBe('Jiu-Jitsu');
    expect(semEmoji('💪 CrossFit')).toBe('CrossFit');
    expect(semEmoji('🧘 Yoga')).toBe('Yoga');
    expect(semEmoji('💃 Dança')).toBe('Dança');
    expect(semEmoji('🤸 Pilates')).toBe('Pilates');
    expect(semEmoji('👤 PT (Treino Personalizado)')).toBe('PT (Treino Personalizado)');
  });

  it('tira também os que levam dois caracteres', () => {
    // O halterofilista vem com um "seletor de variação" colado atrás
    expect(semEmoji('🏋️ Musculação')).toBe('Musculação');
  });

  it('deixa em paz um nome que não traga nenhum', () => {
    expect(semEmoji('Aula Experimental')).toBe('Aula Experimental');
    expect(semEmoji('Boxe')).toBe('Boxe');
  });

  it('não mexe no que está no meio do nome', () => {
    // Um emoji a meio é escolha de quem escreveu o nome
    expect(semEmoji('Boxe 🥊 Iniciados')).toBe('Boxe 🥊 Iniciados');
  });

  it('sem nome não rebenta', () => {
    expect(semEmoji(null)).toBe('');
    expect(semEmoji(undefined)).toBe('');
    expect(semEmoji('')).toBe('');
  });
});
