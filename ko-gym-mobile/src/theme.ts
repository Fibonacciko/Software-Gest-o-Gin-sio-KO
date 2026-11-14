import { StyleSheet } from 'react-native';

// Cores da marca KO, iguais as da aplicacao web
export const cores = {
  laranja: '#B8651B',
  laranjaClaro: '#E8842A',
  dourado: '#F5A623',
  /** O alto do degrade dos botoes, para o texto que nao pode ser degrade --
   *  os precos da loja. Ver `degradeDourado`, mais abaixo. */
  ouro: '#D6A306',
  // Os escuros sao **verde-azulados**, nao cinzentos. Vieram da fotografia da
  // porta do ginasio: #0c1417 no escuro, #3a6c61 na parede iluminada, #aee0bb
  // no halo da luz. Por decisao do dono, que quis essa tonalidade em toda a
  // aplicacao.
  //
  // De caminho, resolveu-se uma coisa: o laranja da marca destaca-se muito
  // mais em cima de verde-azulado do que em cima de cinzento, porque sao
  // cores opostas. O cinzento competia com ele.
  fundo: '#0E1B1E',
  fundoCartao: '#1B2E31',
  fundoElevado: '#28413F',
  texto: '#FFFFFF',
  textoSecundario: '#A8BBB8',
  verde: '#16A34A',
  vermelho: '#DC2626',
  borda: '#3E5A57',

  /** O halo da luz da fotografia. E a cor das manchas de luz do fundo. */
  luz: '#AEE0BB',

  // --- Vidro
  // As superficies deixaram de ser cinzentos opacos e passaram a deixar ver
  // o fundo por tras, desfocado. O branco com pouca opacidade funciona em
  // cima de qualquer fundo; um cinzento fixo so funcionava em cima daquele.
  vidro: 'rgba(255,255,255,0.075)',
  vidroForte: 'rgba(255,255,255,0.11)',
  vidroBordo: 'rgba(255,255,255,0.15)',
  // O risco de luz no topo do cartao, que e o que lhe da o ar de vidro
  vidroBrilho: 'rgba(255,255,255,0.24)',
};

/**
 * **A cor de tudo o que e para carregar**: um degrade de cima para baixo, do
 * dourado ao laranja. Escolhido pelo dono para o botao de check-in, de entre
 * vinte e um feitios vistos no proprio ecra, e dali alargado a aplicacao
 * toda -- o QR, os pedidos de plano, a marcacao de aulas, a reserva na loja
 * e a avaliacao no Google.
 *
 * As duas cores saem do **logotipo**, que e um circulo do dourado no meio
 * (#FBBF07) ao laranja do bordo (#F9A107), e vem descidas de brilho. O
 * sentido e de cima para baixo, e nao na diagonal como nas superficies de
 * vidro: num botao largo e baixo, a diagonal quase so se ve nos cantos.
 *
 * Quem o pinta e o `BotaoDourado`, para o degrade ser o mesmo em todo o
 * lado.
 */
export const degradeDourado = ['#D6A306', '#A85A12'] as const;

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
 * Num fundo escuro uma sombra preta sozinha quase nao se ve. O que levanta
 * o cartao do fundo sao tres coisas juntas: o **bordo claro em cima**
 * (`vidroBrilho`), a **luz que cai no painel** (o gradiente de canto a canto,
 * no `Vidro`) e so depois a sombra, larga e fraca, a dar-lhe chao. A quarta,
 * e a que mais se sente na mao, e o cartao andar ao contrario do fundo
 * quando se inclina o telemovel.
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
