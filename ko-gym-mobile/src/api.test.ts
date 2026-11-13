import { enderecoDaImagem, enderecoReduzido } from './api';

/**
 * O servidor devolve caminhos relativos (`/api/uploads/abc.jpg`) e a
 * aplicação precisa do endereço inteiro. A miniatura é a mesma fotografia
 * encolhida: as da loja são de 1600x1600 para cartões de 360, e sem as
 * encolher o Android desistia de desenhar algumas.
 */
describe('o endereço de uma imagem', () => {
  it('junta o endereço do servidor ao caminho', () => {
    expect(enderecoDaImagem('/api/uploads/abc.jpg')).toMatch(/\/api\/uploads\/abc\.jpg$/);
    expect(enderecoDaImagem('/api/uploads/abc.jpg')).toMatch(/^https?:\/\//);
  });

  it('deixa em paz um endereço que já venha inteiro', () => {
    const fora = 'https://exemplo.pt/foto.jpg';
    expect(enderecoDaImagem(fora)).toBe(fora);
  });

  it('sem caminho não devolve endereço nenhum', () => {
    expect(enderecoDaImagem(null)).toBeNull();
    expect(enderecoDaImagem(undefined)).toBeNull();
    expect(enderecoDaImagem('')).toBeNull();
  });
});

describe('a miniatura', () => {
  it('aponta para as miniaturas, com a largura pedida', () => {
    const url = enderecoReduzido('/api/uploads/abc.jpg');
    expect(url).toMatch(/\/api\/miniaturas\/abc\.jpg\?w=720$/);
  });

  it('aceita outra largura', () => {
    expect(enderecoReduzido('/api/uploads/abc.jpg', 360)).toMatch(/\?w=360$/);
  });

  it('não mexe no que não é nosso', () => {
    // Um endereço de fora não passa pelo nosso servidor: encolhê-lo não é
    // connosco
    const fora = 'https://exemplo.pt/foto.jpg';
    expect(enderecoReduzido(fora)).toBe(fora);
  });

  it('sem caminho não devolve endereço nenhum', () => {
    expect(enderecoReduzido(null)).toBeNull();
  });
});
