import { StyleSheet } from 'react-native';

// Cores da marca KO, iguais as da aplicacao web
export const cores = {
  laranja: '#B8651B',
  laranjaClaro: '#E8842A',
  dourado: '#F5A623',
  fundo: '#1A1A1A',
  fundoCartao: '#2D2D2D',
  fundoElevado: '#3A3A3A',
  texto: '#FFFFFF',
  textoSecundario: '#B8B8B8',
  verde: '#16A34A',
  vermelho: '#DC2626',
  borda: '#4A4A4A',

  // --- Vidro
  // As superficies deixaram de ser cinzentos opacos e passaram a deixar ver
  // o fundo por tras, desfocado. O branco com pouca opacidade funciona em
  // cima de qualquer fundo; um cinzento fixo so funcionava em cima daquele.
  vidro: 'rgba(255,255,255,0.055)',
  vidroForte: 'rgba(255,255,255,0.085)',
  vidroBordo: 'rgba(255,255,255,0.11)',
  // O risco de luz no topo do cartao, que e o que lhe da o ar de vidro
  vidroBrilho: 'rgba(255,255,255,0.16)',
};

export const espaco = {
  xs: 4,
  s: 8,
  m: 16,
  g: 24,
  xg: 32,
};

/** Cantos. Um raio maior pede mais espaco dentro: andam a par. */
export const raio = {
  s: 12,
  m: 18,
  g: 24,
  xg: 30,
  redondo: 999,
};

/**
 * Sombras.
 *
 * Num fundo escuro uma sombra preta nao se ve: o que da relevo e o bordo
 * claro em cima (ver `vidroBrilho`). A sombra fica para destacar o que
 * flutua mesmo, como a janela de reserva.
 */
export const sombra = {
  flutuante: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

/**
 * Uma superfície de vidro sem desfocagem.
 *
 * Usa-se onde desfocar sairia caro — listas que rolam — e dá, a olho, quase
 * o mesmo: o que faz o efeito é o bordo claro, não a desfocagem.
 */
export const superficie = {
  backgroundColor: cores.vidro,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: cores.vidroBordo,
};
