import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, degradeDourado } from '../theme';

/**
 * O botão da aplicação: o degradê dourado-laranja do logotipo, de cima para
 * baixo.
 *
 * Nasceu no check-in e, por decisão do dono, passou a ser **a cor de tudo o
 * que é para carregar** — o QR, os pedidos de plano, a marcação de aulas, a
 * reserva na loja e a avaliação no Google. Estava cada um com o seu laranja:
 * uns chapados, outros em vidro com o texto cor de laranja, e três tons
 * diferentes da mesma cor pelo meio.
 *
 * O feitio de cada botão continua a ser dele — redondo, comprido, pequeno —,
 * e por isso o estilo vem de fora. O que este componente garante é que a cor
 * e o sentido do degradê são os mesmos em todo o lado.
 */
type Props = {
  aoTocar: () => void;
  estilo?: StyleProp<ViewStyle>;
  desativado?: boolean;
  children: ReactNode;
};

export default function BotaoDourado({ aoTocar, estilo, desativado, children }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [estilos.botao, estilo, pressed && estilos.premido]}
      onPress={aoTocar}
      disabled={desativado}
    >
      {/* Sem o `overflow: hidden` do estilo, o degradê sai pelos cantos
          arredondados fora. A cor por baixo é o que se vê se ele não chegar
          a pintar. */}
      <LinearGradient
        colors={degradeDourado}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    backgroundColor: cores.laranja,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premido: { opacity: 0.85 },
});
