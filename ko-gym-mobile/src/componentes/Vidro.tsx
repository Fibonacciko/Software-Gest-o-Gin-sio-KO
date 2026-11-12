import { useContext } from 'react';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ContextoDaInclinacao } from './Fundo';
import { cores, raio } from '../theme';

type Props = {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
  /**
   * Desfoca mesmo o que está por trás.
   *
   * Fica reservado às superfícies que **não rolam** — a barra de baixo, o
   * cartão do estado, as janelas. Desfocar é trabalho para a placa gráfica a
   * cada imagem, e numa lista que rola com dez cartões à vista isso nota-se
   * nos telemóveis mais fracos. Nos restantes basta a translucidez, que a
   * olho dá quase o mesmo e não custa nada.
   */
  desfocado?: boolean;
  /** Um pouco mais opaco, para o que tem de se destacar do resto. */
  forte?: boolean;
  /** Fica quieto, sem pairar. Para o que é moldura do ecrã e não conteúdo. */
  fixo?: boolean;
};

/** Quanto o cartão anda ao contrário do fundo, de um extremo ao outro. */
const PAIRA = 14;

const VidroDesfocado = Animated.createAnimatedComponent(BlurView);

/**
 * Uma superfície de vidro.
 *
 * O que lhe dá o aspecto não é a transparência: é o **risco de luz no bordo
 * de cima**. É assim que o vidro se comporta com uma luz vinda de cima, e sem
 * ele um cartão translúcido parece só um cartão desbotado.
 *
 * **O cartão paira.** Ao inclinar o telemóvel, ele desliza para o lado
 * *contrário* ao do fundo. É assim que o olho distingue uma coisa pousada de
 * uma coisa suspensa: a pousada acompanha o que está atrás, a suspensa
 * move-se contra. São só 14 pixeis — o suficiente para se sentir, pouco para
 * se dar por ele. A inclinação vem do `Fundo`, por contexto; sem `Fundo` à
 * volta (ou num aparelho sem acelerómetro) o cartão fica simplesmente
 * quieto.
 *
 * A **sombra** é a outra metade do efeito. Até aqui só o botão de check-in a
 * tinha, para nada lhe roubar o destaque; a do cartão é de propósito muito
 * mais fraca e sem cor, só para lhe dar chão. O botão continua a ser o único
 * com sombra alaranjada.
 */
export default function Vidro({ children, estilo, desfocado, forte, fixo }: Props) {
  const fundo = forte ? cores.vidroForte : cores.vidro;
  const inclinacao = useContext(ContextoDaInclinacao);

  const aPairar =
    !fixo && inclinacao
      ? {
          transform: [
            {
              translateX: inclinacao.x.interpolate({
                inputRange: [-1, 1],
                outputRange: [-PAIRA, PAIRA],
              }),
            },
            {
              translateY: inclinacao.y.interpolate({
                inputRange: [-1, 1],
                outputRange: [-PAIRA, PAIRA],
              }),
            },
          ],
        }
      : null;

  const conteudo = (
    <>
      {/* A luz que cai no painel: mais clara no canto de cima à esquerda, a
          apagar-se até ao fundo. É o que transforma um rectângulo translúcido
          numa chapa de vidro virada à luz — sozinho, o bordo claro em cima
          dava-lhe o risco mas não lhe dava o corpo. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.015)', 'transparent']}
        locations={[0, 0.45, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={estilos.brilho} pointerEvents="none" />
      {children}
    </>
  );

  if (desfocado) {
    return (
      <VidroDesfocado
        intensity={Platform.OS === 'android' ? 28 : 40}
        tint="dark"
        // Sem isto o Android desenha só um véu cinzento, sem desfocar nada
        experimentalBlurMethod="dimezisBlurView"
        style={[estilos.base, estilos.sombra, { backgroundColor: fundo }, estilo, aPairar]}
      >
        {conteudo}
      </VidroDesfocado>
    );
  }

  return (
    <Animated.View
      style={[estilos.base, estilos.sombra, { backgroundColor: fundo }, estilo, aPairar]}
    >
      {conteudo}
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: raio.g,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.vidroBordo,
    overflow: 'hidden',
  },
  // Larga e fraca: é chão, não é relevo. Uma sombra curta e escura fazia o
  // cartão parecer recortado em papel; esta só o levanta do fundo.
  sombra: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 6,
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: raio.g,
    right: raio.g,
    height: 1,
    backgroundColor: cores.vidroBrilho,
  },
});
