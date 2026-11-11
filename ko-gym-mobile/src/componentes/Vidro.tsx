import { BlurView } from 'expo-blur';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
};

/**
 * Uma superfície de vidro.
 *
 * O que lhe dá o aspecto não é a transparência: é o **risco de luz no bordo
 * de cima**. É assim que o vidro se comporta com uma luz vinda de cima, e sem
 * ele um cartão translúcido parece só um cartão desbotado.
 */
export default function Vidro({ children, estilo, desfocado, forte }: Props) {
  const fundo = forte ? cores.vidroForte : cores.vidro;

  const conteudo = (
    <>
      <View style={estilos.brilho} pointerEvents="none" />
      {children}
    </>
  );

  if (desfocado) {
    return (
      <BlurView
        intensity={Platform.OS === 'android' ? 28 : 40}
        tint="dark"
        // Sem isto o Android desenha só um véu cinzento, sem desfocar nada
        experimentalBlurMethod="dimezisBlurView"
        style={[estilos.base, { backgroundColor: fundo }, estilo]}
      >
        {conteudo}
      </BlurView>
    );
  }

  return <View style={[estilos.base, { backgroundColor: fundo }, estilo]}>{conteudo}</View>;
}

const estilos = StyleSheet.create({
  base: {
    borderRadius: raio.g,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.vidroBordo,
    overflow: 'hidden',
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
