import { StyleSheet } from 'react-native';

// Cores da marca KO, iguais as da aplicacao web
export const cores = {
  laranja: '#B8651B',
  laranjaClaro: '#E8842A',
  dourado: '#F5A623',
  /** O alto do degrade do check-in. E a cor das **letras** de tudo o que e
   *  para carregar: o QR, os pedidos de plano, a reserva na loja e os precos
   *  dos artigos. Por decisao do dono -- so as letras, nao as caixas. */
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
 * O botao de check-in: um degrade **de cima para baixo**, do dourado ao
 * laranja. Escolhido pelo dono de entre vinte e um feitios vistos no proprio
 * ecra.
 *
 * As duas cores saem do **logotipo**, que e um circulo do dourado no meio
 * (#FBBF07) ao laranja do bordo (#F9A107), e vem descidas de brilho. O
 * sentido e de cima para baixo, e nao na diagonal como nas superficies de
 * vidro: num botao largo e baixo, a diagonal quase so se ve nos cantos.
 *
 * O que lhe tirou presenca nao foi a cor -- foi o **tamanho** (passou a ter
 * a altura do botao do QR) e a **sombra**, que saiu: o halo alaranjado era o
 * que o fazia puxar o olho de qualquer ponto do ecra.
 */
export const degradeCheckin = ['#D6A306', '#A85A12'] as const;

/**
 * **O botao de accao principal**, que e o mesmo em dois ecras: o check-in,
 * no Inicio, e o "Deixar uma avaliacao", no Ginasio.
 *
 * Sao os dois o que o dono mais quer que se carregue -- um porque e para
 * isso que a aplicacao existe, o outro porque e o que mais ajuda o ginasio
 * e e o que as pessoas se esquecem de fazer. Por decisao dele, de novembro
 * de 2026, sao **exactamente iguais**: as mesmas cores, o mesmo degrade, o
 * mesmo canto, a mesma altura e a mesma letra.
 *
 * Esteve em dois sitios: o do Ginasio era o dourado chapado, com letras
 * escuras, e o do check-in o degrade. Agora e **uma definicao so**, porque
 * "igual" escrito duas vezes dura ate alguem mexer num dos dois -- e o que
 * se perde nao da erro nenhum, so deixa de ser igual.
 *
 * Quem o usa poe por cima o `degradeCheckin`, de cima para baixo, num
 * `LinearGradient` em `StyleSheet.absoluteFill`. O `backgroundColor` fica
 * por baixo, e e o que se ve se o degrade nao chegar a pintar.
 */
export const botaoPrincipal = {
  backgroundColor: '#B8651B',
  borderRadius: 24,          // raio.g
  // Sem isto o degrade saia pelos cantos arredondados fora
  overflow: 'hidden' as const,
  paddingVertical: 16,       // espaco.m
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  flexDirection: 'row' as const,
  gap: 8,                    // espaco.s
  // Sem sombra: o halo alaranjado que aqui estava puxava o olho de qualquer
  // ponto do ecra, e era metade da presenca de que o dono se queixava.
};

export const botaoPrincipalTexto = {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '800' as const,
  letterSpacing: 1,
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
