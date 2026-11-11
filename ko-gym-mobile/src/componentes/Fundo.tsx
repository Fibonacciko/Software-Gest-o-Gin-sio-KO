import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from '../theme';

const { width: LARGURA, height: ALTURA } = Dimensions.get('window');

/**
 * Quanto cada camada anda, em pixeis, de um extremo da inclinação ao outro.
 *
 * São números diferentes de propósito: é a diferença entre eles que o olho
 * lê como profundidade. A camada que anda mais parece estar à frente.
 */
const PROFUNDIDADE = [10, 22, 36];

/** Quanto a camada é maior do que o ecrã, para nunca se ver o bordo ao andar. */
const FOLGA = Math.max(...PROFUNDIDADE) * 2 + 40;

/**
 * O fundo da aplicação.
 *
 * Três camadas de cinzento que atravessam o ecrã em ângulos diferentes e
 * respiram devagar, umas sobre as outras. O movimento é lento de propósito:
 * um fundo que salta à vista rouba a atenção ao que interessa, que é o botão
 * de check-in.
 *
 * **A profundidade vem da inclinação.** As camadas andam a velocidades
 * diferentes conforme se inclina o telemóvel, e é isso que o olho lê como
 * 3D. Um motor 3D a sério daria o mesmo efeito gastando a bateria e
 * engasgando nos telemóveis mais fracos, numa aplicação cujo trabalho é um
 * check-in de dois segundos.
 *
 * São camadas de **ecrã inteiro**, e não manchas redondas: uma mancha redonda
 * com um gradiente linear deixa um bordo a atravessar o ecrã, que se via.
 *
 * Os tons vão do preto ao cinzento, e não ao laranja da marca: por decisão do
 * dono. O laranja fica para o que é para carregar — o check-in, os números —
 * e num fundo tingido deixava de se destacar.
 *
 * Anima só opacidade e deslocação, com `useNativeDriver`, por isso corre do
 * lado nativo e não trava nada.
 */
export default function Fundo({ children }: { children: React.ReactNode }) {
  // O espaço da barra de estado do telemóvel. Fica aqui, e não em cada ecrã,
  // porque todos passam por este componente: assim nenhum fica esquecido com
  // o título debaixo das horas.
  const margens = useSafeAreaInsets();

  const camada1 = useRef(new Animated.Value(0)).current;
  const camada2 = useRef(new Animated.Value(1)).current;
  const camada3 = useRef(new Animated.Value(0.4)).current;

  // A inclinação, de -1 a 1 em cada eixo
  const inclinacaoX = useRef(new Animated.Value(0)).current;
  const inclinacaoY = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    let vivo = true;
    let subscricao: { remove: () => void } | null = null;

    const seguir = ({ x, y }: { x: number; y: number }) => {
      // `spring` em vez de saltar para o valor lido: o sensor treme sempre um
      // pouco, e sem isto o fundo tiritava na mão de quem está parado.
      Animated.spring(inclinacaoX, {
        toValue: Math.max(-1, Math.min(1, x)),
        useNativeDriver: true,
        speed: 2,
        bounciness: 0,
      }).start();
      Animated.spring(inclinacaoY, {
        toValue: Math.max(-1, Math.min(1, y)),
        useNativeDriver: true,
        speed: 2,
        bounciness: 0,
      }).start();
    };

    // Nem todos os aparelhos têm acelerómetro — no navegador não há, e há
    // telemóveis sem ele. Sem esta pergunta a aplicação rebentava a arrancar;
    // com ela, o fundo fica simplesmente quieto e tudo o resto funciona.
    Accelerometer.isAvailableAsync()
      .then((existe) => {
        if (!existe || !vivo) return;
        // Oito leituras por segundo chegam: o movimento é suavizado a seguir,
        // e ler o sensor depressa só gastava bateria sem se notar diferença.
        Accelerometer.setUpdateInterval(125);
        subscricao = Accelerometer.addListener(seguir);
      })
      .catch(() => {});

    return () => {
      vivo = false;
      subscricao?.remove();
    };
  }, [inclinacaoX, inclinacaoY]);

  /** O estilo de uma camada: respira na opacidade e desliza com a inclinação. */
  const camadaMovel = (opacidade: Animated.Value, distancia: number) => ({
    opacity: opacidade,
    transform: [
      {
        translateX: inclinacaoX.interpolate({
          inputRange: [-1, 1],
          outputRange: [distancia, -distancia],
        }),
      },
      {
        translateY: inclinacaoY.interpolate({
          inputRange: [-1, 1],
          outputRange: [distancia, -distancia],
        }),
      },
    ],
  });

  return (
    <View style={estilos.raiz}>
      {/* Base escura, do canto superior direito para o inferior esquerdo.
          Esta não se mexe: é o chão sobre o qual as outras deslizam. */}
      <LinearGradient
        colors={['#2E2E2E', cores.fundo, '#0E0E0E']}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[estilos.camada, camadaMovel(camada1, PROFUNDIDADE[0])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(170,170,170,0.22)', 'rgba(170,170,170,0.05)', 'rgba(170,170,170,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[estilos.camada, camadaMovel(camada2, PROFUNDIDADE[1])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(140,140,140,0)', 'rgba(140,140,140,0.06)', 'rgba(140,140,140,0.16)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[estilos.camada, camadaMovel(camada3, PROFUNDIDADE[2])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(100,100,100,0.20)', 'rgba(100,100,100,0)']}
          start={{ x: 0.2, y: 1 }}
          end={{ x: 0.8, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[estilos.conteudo, { paddingTop: margens.top }]}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo, overflow: 'hidden' },
  // Maior do que o ecrã: ao deslizar nunca se chega a ver onde a camada acaba
  camada: {
    position: 'absolute',
    left: -FOLGA / 2,
    top: -FOLGA / 2,
    width: LARGURA + FOLGA,
    height: ALTURA + FOLGA,
  },
  conteudo: { flex: 1 },
});
