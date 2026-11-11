import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, raio } from '../theme';

export type Separador = 'inicio' | 'parceiros' | 'multimedia' | 'loja' | 'ginasio';

type Props = {
  activo: Separador;
  aoEscolher: (s: Separador) => void;
};

/**
 * A barra de baixo.
 *
 * Feita à mão de propósito: são quatro ecrãs sem navegação por dentro, e uma
 * biblioteca de navegação traria meia dúzia de dependências para a aplicação
 * que depois tem de ser instalada à mão em cada telemóvel.
 */
const SEPARADORES: { id: Separador; icone: string; texto: string }[] = [
  { id: 'inicio', icone: '●', texto: 'Início' },
  { id: 'parceiros', icone: '◆', texto: 'Parceiros' },
  { id: 'multimedia', icone: '■', texto: 'Multimédia' },
  { id: 'loja', icone: '▲', texto: 'Loja' },
  { id: 'ginasio', icone: '◉', texto: 'Ginásio' },
];

export default function BarraDeSeparadores({ activo, aoEscolher }: Props) {
  // A aplicação desenha-se de ponta a ponta do ecrã (`edgeToEdgeEnabled`), e
  // por isso a barra de gestos do Android ficava por cima destes botões. O
  // espaço que ela ocupa vem do próprio telemóvel e não se pode adivinhar:
  // uns têm três botões, outros uma risca, outros nada.
  const margens = useSafeAreaInsets();

  return (
    <BlurView
      intensity={Platform.OS === 'android' ? 32 : 50}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={[estilos.barra, { paddingBottom: Math.max(margens.bottom, espaco.m) }]}
    >
      {/* O risco de luz no topo: é o que separa a barra do que passa por
          baixo dela, agora que deixou de ser uma faixa opaca. */}
      <View style={estilos.brilho} pointerEvents="none" />

      {SEPARADORES.map((s) => {
        const seleccionado = s.id === activo;
        return (
          <Pressable
            key={s.id}
            style={({ pressed }) => [estilos.item, pressed && { opacity: 0.6 }]}
            onPress={() => aoEscolher(s.id)}
          >
            {/* A pastilha por trás do separador escolhido. Antes só mudava a
                cor do texto, e num fundo que se mexe isso lia-se mal. */}
            {seleccionado ? <View style={estilos.pastilha} pointerEvents="none" /> : null}
            <Text style={[estilos.icone, seleccionado && estilos.icaneActivo]}>{s.icone}</Text>
            <Text style={[estilos.texto, seleccionado && estilos.textoActivo]}>{s.texto}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,18,18,0.55)',
    paddingTop: espaco.s,
    overflow: 'hidden',
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: cores.vidroBordo,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: espaco.s,
    marginHorizontal: 2,
  },
  pastilha: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232,132,42,0.14)',
    borderRadius: raio.m,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,132,42,0.3)',
  },
  icone: { color: cores.textoSecundario, fontSize: 16 },
  icaneActivo: { color: cores.laranjaClaro },
  texto: { color: cores.textoSecundario, fontSize: 11 },
  textoActivo: { color: cores.laranjaClaro, fontWeight: '700' },
});
