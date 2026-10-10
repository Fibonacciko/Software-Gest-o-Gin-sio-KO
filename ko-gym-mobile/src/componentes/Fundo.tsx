import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores } from '../theme';

/**
 * O fundo da aplicação.
 *
 * Três camadas de cinzento que atravessam o ecrã em ângulos diferentes e
 * respiram devagar, umas sobre as outras. O movimento é lento de propósito:
 * um fundo que salta à vista rouba a atenção ao que interessa, que é o botão
 * de check-in.
 *
 * Os tons vão do preto ao cinzento, e não ao laranja da marca: por decisão do
 * dono. O laranja fica para o que é para carregar — o check-in, os números —
 * e num fundo tingido deixava de se destacar.
 *
 * São camadas de **ecrã inteiro**, e não manchas redondas: uma mancha redonda
 * com um gradiente linear deixa um bordo a atravessar o ecrã, que se via.
 * Assim nunca há limite nenhum à vista.
 *
 * Anima só a opacidade, com `useNativeDriver`, por isso corre do lado nativo
 * e não trava nada, mesmo num telemóvel antigo.
 */
export default function Fundo({ children }: { children: React.ReactNode }) {
  const camada1 = useRef(new Animated.Value(0)).current;
  const camada2 = useRef(new Animated.Value(1)).current;
  const camada3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const respirar = (valor: Animated.Value, segundos: number, minimo: number, maximo: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(valor, {
            toValue: maximo,
            duration: segundos * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(valor, {
            toValue: minimo,
            duration: segundos * 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    const animacoes = [
      respirar(camada1, 11, 0.25, 1),
      respirar(camada2, 15, 0.3, 1),
      respirar(camada3, 19, 0.15, 0.8),
    ];
    animacoes.forEach((a) => a.start());
    return () => animacoes.forEach((a) => a.stop());
  }, [camada1, camada2, camada3]);

  return (
    <View style={estilos.raiz}>
      {/* Base escura, do canto superior direito para o inferior esquerdo */}
      <LinearGradient
        colors={['#2E2E2E', cores.fundo, '#0E0E0E']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: camada1 }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(170,170,170,0.22)', 'rgba(170,170,170,0.05)', 'rgba(170,170,170,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: camada2 }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(140,140,140,0)', 'rgba(140,140,140,0.06)', 'rgba(140,140,140,0.16)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: camada3 }]} pointerEvents="none">
        <LinearGradient
          colors={['rgba(100,100,100,0.20)', 'rgba(100,100,100,0)']}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.8, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={estilos.conteudo}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { flex: 1 },
});
