import { BlurView } from 'expo-blur';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco, raio, sombra } from '../theme';

export type Separador = 'inicio' | 'aulas' | 'multimedia' | 'loja' | 'ginasio' | 'parceiros';

type Props = {
  activo: Separador;
  aoEscolher: (s: Separador) => void;
};

/**
 * A barra de baixo.
 *
 * Feita à mão de propósito: são seis ecrãs sem navegação por dentro, e uma
 * biblioteca de navegação traria meia dúzia de dependências para a aplicação
 * que depois tem de ser instalada à mão em cada telemóvel.
 *
 * A barra é a **segunda** maneira de mudar de ecrã: a primeira é deslizar o
 * dedo para o lado (ver a tira no `App.tsx`). Ela acende o separador novo
 * assim que a página passa de meio, e não só quando ela assenta.
 */
const SEPARADORES: { id: Separador; icone: string; texto: string }[] = [
  { id: 'inicio', icone: '●', texto: 'Início' },
  { id: 'aulas', icone: '◷', texto: 'Aulas' },
  { id: 'multimedia', icone: '■', texto: 'Fotos' },
  { id: 'loja', icone: '▲', texto: 'Loja' },
  { id: 'parceiros', icone: '◆', texto: 'Parceiros' },
  { id: 'ginasio', icone: '◉', texto: 'Ginásio' },
];

/**
 * A ordem por que os separadores aparecem, da esquerda para a direita.
 *
 * É a mesma da barra e a mesma do deslizar: se fossem duas listas, um dia
 * deslizava-se para a direita e ia-se parar ao separador da esquerda.
 */
export const ORDEM_DOS_SEPARADORES: Separador[] = SEPARADORES.map((s) => s.id);

export default function BarraDeSeparadores({ activo, aoEscolher }: Props) {
  // A aplicação desenha-se de ponta a ponta do ecrã (`edgeToEdgeEnabled`), e
  // por isso a barra de gestos do Android ficava por cima destes botões. O
  // espaço que ela ocupa vem do próprio telemóvel e não se pode adivinhar:
  // uns têm três botões, outros uma risca, outros nada.
  const margens = useSafeAreaInsets();

  return (
    <View style={[estilos.moldura, { paddingBottom: Math.max(margens.bottom, espaco.s) }]}>
      <BlurView
        intensity={Platform.OS === 'android' ? 40 : 60}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={estilos.barra}
      >
        {/* O risco de luz no bordo de cima, que é o que dá o ar de vidro */}
        <View style={estilos.brilho} pointerEvents="none" />

        {SEPARADORES.map((s) => {
          const seleccionado = s.id === activo;
          return (
            <Pressable
              key={s.id}
              style={({ pressed }) => [estilos.item, pressed && { opacity: 0.6 }]}
              onPress={() => aoEscolher(s.id)}
            >
              {/* A marca por trás do separador escolhido. Antes só mudava a
                  cor do texto, e num fundo que se mexe isso lia-se mal. */}
              {seleccionado ? <View style={estilos.marca} pointerEvents="none" /> : null}
              <Text style={[estilos.icone, seleccionado && estilos.icaneActivo]}>{s.icone}</Text>
              <Text style={[estilos.texto, seleccionado && estilos.textoActivo]}>{s.texto}</Text>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const estilos = StyleSheet.create({
  // A barra deixou de ser uma faixa encostada ao fundo e passou a flutuar.
  // A moldura é o que a afasta dos bordos; a barra é a pastilha em si.
  moldura: { paddingHorizontal: espaco.m, paddingTop: espaco.xs },
  barra: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18,18,18,0.62)',
    borderRadius: raio.redondo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.vidroBordo,
    paddingVertical: espaco.s,
    paddingHorizontal: espaco.xs,
    overflow: 'hidden',
    ...sombra.flutuante,
  },
  brilho: {
    position: 'absolute',
    top: 0,
    left: raio.g,
    right: raio.g,
    height: StyleSheet.hairlineWidth,
    backgroundColor: cores.vidroBrilho,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: espaco.s,
    marginHorizontal: 0,
    paddingHorizontal: 1,
  },
  marca: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(232,132,42,0.16)',
    borderRadius: raio.redondo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,132,42,0.35)',
  },
  icone: { color: cores.textoSecundario, fontSize: 16 },
  icaneActivo: { color: cores.laranjaClaro },
  // Seis separadores: a etiqueta encolhe para caber sem cortar
  texto: { color: cores.textoSecundario, fontSize: 9.5 },
  textoActivo: { color: cores.laranjaClaro, fontWeight: '700' },
});
