import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';
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
 *
 * Começaram em 10/22/36 e não se notava.
 */
const PROFUNDIDADE = [20, 48, 85];

/** Quanto a camada é maior do que o ecrã, para nunca se ver o bordo ao andar. */
const FOLGA = Math.max(...PROFUNDIDADE) * 2 + 120;

/**
 * O fundo da aplicação.
 *
 * Camadas de ecrã inteiro que respiram devagar e deslizam com a inclinação do
 * telemóvel. O movimento é lento de propósito: um fundo que salta à vista
 * rouba a atenção ao que interessa, que é o botão de check-in.
 *
 * **A profundidade vem da inclinação.** As camadas andam a velocidades
 * diferentes conforme se inclina o telemóvel, e é a *diferença* entre as
 * velocidades que o olho lê como 3D. Um motor 3D a sério daria o mesmo efeito
 * gastando bateria e engasgando nos telemóveis fracos, numa aplicação cujo
 * trabalho é um check-in de dois segundos.
 *
 * **As manchas redondas de luz, a vinheta e o grão são imagens** — `luz.png`,
 * `vinheta.png` e `grao.png`, em `assets/`. Um gradiente linear dentro de um
 * círculo deixa um bordo a atravessar o ecrã, e por isso nunca houve manchas
 * redondas aqui. Uma imagem com transparência faz o que o gradiente não faz,
 * e o `<Image>` é nativo e já estava provado dentro da aplicação.
 *
 * **Não se desenha com o Skia.** Tentou-se (`@shopify/react-native-skia`) e a
 * aplicação instalava e fechava ao abrir — com quatro telas sobrepostas e
 * também com uma só, parada: em Android, com a arquitetura antiga do React
 * Native, que está desligada por causa do NFC, a parte nativa do Skia não
 * arranca. O estouro é nativo, não deixa erro de JavaScript nenhum para ver, e
 * o mesmo código corre bem no navegador. Não voltar a tentar sem a arquitetura
 * nova ligada.
 *
 * Anima-se **só opacidade e deslocação** (`translate`), com `useNativeDriver`:
 * corre do lado nativo, não passa por JavaScript a cada imagem e não gasta
 * bateria.
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

  const camada1 = useRef(new Animated.Value(0)).current;
  const camada2 = useRef(new Animated.Value(1)).current;
  const luzCima = useRef(new Animated.Value(0.5)).current;
  const luzBaixo = useRef(new Animated.Value(0.2)).current;
  const luzFundo = useRef(new Animated.Value(0.8)).current;

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
      // As luzes respiram mais devagar do que as camadas: são o que mais se vê,
      // e a respirar depressa pareciam piscar.
      respirar(luzCima, 17, 0.45, 1),
      respirar(luzBaixo, 23, 0.3, 1),
      respirar(luzFundo, 29, 0.5, 1),
    ];
    animacoes.forEach((a) => a.start());
    return () => animacoes.forEach((a) => a.stop());
  }, [camada1, camada2, luzCima, luzBaixo, luzFundo]);

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

      {/* A luz mais funda, grande e quase imperceptível: dá volume ao meio do
          ecrã sem se dar por ela. É a que anda menos, por isso parece atrás. */}
      <Animated.View
        style={[estilos.camada, camadaMovel(luzFundo, PROFUNDIDADE[0])]}
        pointerEvents="none"
      >
        <Image
          source={require('../../assets/luz.png')}
          style={{
            position: 'absolute',
            width: LARGURA * 2.1,
            height: LARGURA * 2.1,
            left: -LARGURA * 0.55,
            top: ALTURA * 0.22,
            opacity: 0.1,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

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

      {/* A luz de baixo, à esquerda, a meio caminho. */}
      <Animated.View
        style={[estilos.camada, camadaMovel(luzBaixo, PROFUNDIDADE[1])]}
        pointerEvents="none"
      >
        <Image
          source={require('../../assets/luz.png')}
          style={{
            position: 'absolute',
            width: LARGURA * 1.4,
            height: LARGURA * 1.4,
            left: -LARGURA * 0.45,
            top: ALTURA * 0.55,
            opacity: 0.16,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

      {/* A luz de cima é a que anda mais, e por isso é a que parece estar à
          frente de tudo. Entra pelo canto onde a base já é mais clara, para
          não haver duas fontes de luz a contradizerem-se. */}
      <Animated.View
        style={[estilos.camada, camadaMovel(luzCima, PROFUNDIDADE[2])]}
        pointerEvents="none"
      >
        <Image
          source={require('../../assets/luz.png')}
          style={{
            position: 'absolute',
            width: LARGURA * 1.25,
            height: LARGURA * 1.25,
            left: LARGURA * 0.3,
            top: -LARGURA * 0.5,
            opacity: 0.2,
          }}
          resizeMode="stretch"
        />
      </Animated.View>

      {/* A vinheta escurece os cantos e fecha a imagem. Não se mexe: é o
          enquadramento do ecrã, não uma camada do fundo. */}
      <Image source={require('../../assets/vinheta.png')} style={estilos.ecra} resizeMode="stretch" />

      {/* O grão, por cima de tudo. Sem ele um gradiente escuro parte-se em
          bandas visíveis, e o olho lê bandas como tinta chapada. */}
      <Image
        source={require('../../assets/grao.png')}
        style={[estilos.ecra, estilos.grao]}
        resizeMode="stretch"
      />

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
  // Medidas explícitas, e não `absoluteFill`: uma `Image` sem largura e altura
  // fica do tamanho natural do ficheiro — 512 pixeis — e via-se a emenda onde
  // a imagem acabava, a meio do ecrã.
  ecra: { position: 'absolute', left: 0, top: 0, width: LARGURA, height: ALTURA },
  grao: { opacity: 0.045 },
  conteudo: { flex: 1 },
});
