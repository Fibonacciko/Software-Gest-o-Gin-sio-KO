import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cores, espaco } from '../theme';

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
    <View style={[estilos.barra, { paddingBottom: Math.max(margens.bottom, espaco.m) }]}>
      {SEPARADORES.map((s) => {
        const seleccionado = s.id === activo;
        return (
          <Pressable
            key={s.id}
            style={({ pressed }) => [estilos.item, pressed && { opacity: 0.6 }]}
            onPress={() => aoEscolher(s.id)}
          >
            <Text style={[estilos.icone, seleccionado && estilos.icaneActivo]}>{s.icone}</Text>
            <Text style={[estilos.texto, seleccionado && estilos.textoActivo]}>{s.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26,26,26,0.92)',
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    paddingTop: espaco.s,
  },
  item: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: espaco.xs },
  icone: { color: cores.textoSecundario, fontSize: 16 },
  icaneActivo: { color: cores.laranjaClaro },
  texto: { color: cores.textoSecundario, fontSize: 11 },
  textoActivo: { color: cores.laranjaClaro, fontWeight: '700' },
});
