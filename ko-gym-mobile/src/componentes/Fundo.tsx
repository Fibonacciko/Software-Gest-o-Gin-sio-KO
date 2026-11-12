import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Canvas,
  Fill,
  Group,
  LinearGradient as SkiaLinearGradient,
  RadialGradient,
  Rect,
  Turbulence,
  vec,
} from '@shopify/react-native-skia';
import { Accelerometer } from 'expo-sensors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores } from '../theme';

const { width: LARGURA, height: ALTURA } = Dimensions.get('window');

/**
 * Quanto cada camada anda, em pixeis, de um extremo da inclinação ao outro.
 *
 * São números muito diferentes de propósito: é a **diferença** entre eles que
 * o olho lê como profundidade. Começaram em 10/22/36 e não se notava — 26
 * pixeis de diferença entre a camada da frente e a do fundo, num ecrã de 400,
 * é movimento a menos para o cérebro ler distância.
 */
const PROFUNDIDADE = [20, 48, 85];

/** Quanto cada camada roda, em graus, de um extremo ao outro. */
const ROTACAO = [3, 5, 8];

/** Quanto a camada é maior do que o ecrã, para nunca se ver o bordo ao andar. */
const FOLGA = Math.max(...PROFUNDIDADE) * 2 + 120;

const LARGURA_CAMADA = LARGURA + FOLGA;
const ALTURA_CAMADA = ALTURA + FOLGA;

/**
 * O fundo da aplicação.
 *
 * **Uma tela do Skia, parada, e por cima camadas leves que se mexem.**
 * A divisão não é por gosto: no Android cada tela do Skia é uma superfície
 * de hardware à parte. Empilhar várias e ainda por cima rodá-las em 3D
 * rebenta com a aplicação no arranque — foi exactamente o que aconteceu na
 * versão 1.2.0, que instalava e fechava-se ao abrir. **Nunca pôr um `Canvas`
 * do Skia dentro de uma `Animated.View` com `rotateX`/`rotateY`.**
 *
 * Cada um faz então o que sabe:
 *
 * - **o Skia pinta o que não se mexe** — e pinta o que os gradientes lineares
 *   não conseguem: manchas redondas de luz **sem bordo** (um gradiente linear
 *   dentro de um círculo deixa um bordo a atravessar o ecrã), uma **vinheta**
 *   a escurecer os cantos e **grão** por cima de tudo. Sem grão, um gradiente
 *   escuro parte-se em bandas, e o olho lê bandas como tinta chapada;
 * - **as camadas que se mexem são `View`s normais** com gradiente linear, que
 *   é barato, e movem-se em `Animated` com `useNativeDriver`: corre do lado
 *   nativo, não passa por JavaScript a cada imagem e não gasta bateria. Por
 *   isso **não** foi preciso o Reanimated, que obrigaria a ligar a
 *   arquitetura nova do React Native — e essa está desligada por causa do
 *   NFC, que é o essencial desta aplicação.
 *
 * **A profundidade vem de três coisas ao mesmo tempo:** as camadas andam a
 * velocidades diferentes (paralaxe), **inclinam-se com perspetiva** (deixam
 * de ser autocolantes a escorregar e passam a planos no espaço), e a de cima
 * anda mais do que todas — é a que parece estar à frente.
 *
 * Os tons vão do preto ao cinzento, e não ao laranja da marca: por decisão do
 * dono. O laranja fica para o que é para carregar — o check-in, os números —
 * e num fundo tingido deixava de se destacar.
 */
export default function Fundo({ children }: { children: React.ReactNode }) {
  // O espaço da barra de estado do telemóvel. Fica aqui, e não em cada ecrã,
  // porque todos passam por este componente: assim nenhum fica esquecido com
  // o título debaixo das horas.
  const margens = useSafeAreaInsets();

  const camada1 = useRef(new Animated.Value(0.55)).current;
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
      respirar(camada1, 11, 0.4, 0.9),
      respirar(camada2, 15, 0.35, 1),
      respirar(camada3, 19, 0.2, 0.8),
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

  /**
   * O estilo de uma camada: respira na opacidade, desliza e inclina-se.
   *
   * A ordem conta: `perspective` tem de vir primeiro, senão as rotações
   * ficam planas e volta tudo a parecer autocolantes.
   */
  const camadaMovel = (opacidade: Animated.Value, distancia: number, graus: number) => ({
    opacity: opacidade,
    transform: [
      { perspective: 900 },
      {
        rotateX: inclinacaoY.interpolate({
          inputRange: [-1, 1],
          outputRange: [`${graus}deg`, `${-graus}deg`],
        }),
      },
      {
        rotateY: inclinacaoX.interpolate({
          inputRange: [-1, 1],
          outputRange: [`${-graus}deg`, `${graus}deg`],
        }),
      },
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
      {/* A ÚNICA tela do Skia, e está quieta: base, luzes redondas, vinheta
          e grão. Tudo o que não se mexe cabe aqui dentro. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <Rect x={0} y={0} width={LARGURA} height={ALTURA}>
            <SkiaLinearGradient
              start={vec(LARGURA, 0)}
              end={vec(0, ALTURA)}
              colors={['#2B2B2B', cores.fundo, '#0B0B0B']}
            />
          </Rect>

          {/* Três manchas de luz, redondas a sério — é isto que não havia. */}
          <Rect x={0} y={0} width={LARGURA} height={ALTURA}>
            <RadialGradient
              c={vec(LARGURA * 0.82, ALTURA * 0.1)}
              r={LARGURA * 1.15}
              colors={['rgba(205,205,205,0.18)', 'rgba(205,205,205,0.04)', 'rgba(205,205,205,0)']}
              positions={[0, 0.45, 1]}
            />
          </Rect>
          <Rect x={0} y={0} width={LARGURA} height={ALTURA}>
            <RadialGradient
              c={vec(LARGURA * 0.06, ALTURA * 0.72)}
              r={LARGURA * 1.05}
              colors={['rgba(130,130,130,0.16)', 'rgba(130,130,130,0)']}
            />
          </Rect>
          <Rect x={0} y={0} width={LARGURA} height={ALTURA}>
            <RadialGradient
              c={vec(LARGURA * 0.55, ALTURA * 0.4)}
              r={LARGURA * 0.75}
              colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0)']}
            />
          </Rect>

          {/* A vinheta. Escurecer os cantos traz o meio para a frente — é a
              pista de profundidade mais barata que há. */}
          <Rect x={0} y={0} width={LARGURA} height={ALTURA}>
            <RadialGradient
              c={vec(LARGURA / 2, ALTURA * 0.42)}
              r={Math.max(LARGURA, ALTURA) * 0.8}
              colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.62)']}
              positions={[0.35, 0.72, 1]}
            />
          </Rect>

          {/* O grão, por cima de tudo. Sem ele os gradientes escuros partem-se
              em bandas visíveis, e o olho lê bandas como tinta chapada. */}
          <Group blendMode="softLight" opacity={0.3}>
            <Fill>
              <Turbulence freqX={0.75} freqY={0.75} octaves={2} seed={11} />
            </Fill>
          </Group>
        </Canvas>
      </View>

      {/* As camadas que se mexem. São `View`s normais com gradiente linear:
          baratas, e o motor nativo move-as sem tocar em JavaScript. */}
      <Animated.View
        style={[estilos.camada, camadaMovel(camada1, PROFUNDIDADE[0], ROTACAO[0])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(170,170,170,0.16)', 'rgba(170,170,170,0.04)', 'rgba(170,170,170,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.1, y: 0.8 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[estilos.camada, camadaMovel(camada2, PROFUNDIDADE[1], ROTACAO[1])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(140,140,140,0)', 'rgba(140,140,140,0.06)', 'rgba(140,140,140,0.18)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* A luz de cima: anda mais do que todas e é a que parece estar à
          frente. É ela que faz o telemóvel parecer ter luz por cima. */}
      <Animated.View
        style={[estilos.camada, camadaMovel(camada3, PROFUNDIDADE[2], ROTACAO[2])]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']}
          locations={[0, 0.4, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.3, y: 0.85 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View style={[estilos.conteudo, { paddingTop: margens.top }]}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo, overflow: 'hidden' },
  // Maior do que o ecrã: ao deslizar e ao inclinar nunca se chega a ver onde
  // a camada acaba. A folga cresceu com a inclinação — um plano que roda
  // mostra o canto de trás se for do tamanho do ecrã.
  camada: {
    position: 'absolute',
    left: -FOLGA / 2,
    top: -FOLGA / 2,
    width: LARGURA_CAMADA,
    height: ALTURA_CAMADA,
  },
  conteudo: { flex: 1 },
});
