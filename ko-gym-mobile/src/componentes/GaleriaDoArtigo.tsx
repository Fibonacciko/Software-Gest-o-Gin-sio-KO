import { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { enderecoDaImagem, enderecoReduzido, MediaDoArtigo } from '../api';
import { cores, espaco } from '../theme';

const LARGURA = Dimensions.get('window').width - espaco.g * 2;
const ALTURA = 230;

/**
 * Um vídeo da galeria.
 *
 * Fica em componente próprio porque o `useVideoPlayer` é um hook: dentro de
 * um `map` não podia estar. Arranca parado — um vídeo a tocar sozinho no meio
 * da loja rouba a atenção e gasta dados a quem só queria ver o preço.
 */
function Video({ url, activo }: { url: string; activo: boolean }) {
  const player = useVideoPlayer(enderecoDaImagem(url) ?? '', (p) => {
    p.loop = true;
    p.muted = true;
  });

  // Ao sair deste vídeo, pára: senão continuava a tocar fora de vista
  if (!activo && player.playing) player.pause();

  return <VideoView player={player} style={estilos.item} contentFit="cover" nativeControls />;
}

/**
 * As fotografias e os vídeos de um artigo, um a um, deslizando para o lado.
 *
 * A primeira fotografia é a que a montra mostra na lista; aqui vê-se o resto.
 */
export default function GaleriaDoArtigo({ media }: { media: MediaDoArtigo[] }) {
  const [actual, setActual] = useState(0);
  const scroll = useRef<ScrollView>(null);

  if (!media || media.length === 0) return null;

  // Segue o deslize em contínuo, e não só no fim: os pontos ficavam para trás
  // quando o movimento parava sem embalo.
  const aoDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / LARGURA);
    if (i !== actual && i >= 0 && i < media.length) setActual(i);
  };

  return (
    <View>
      <ScrollView
        ref={scroll}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={aoDeslizar}
        onMomentumScrollEnd={aoDeslizar}
        scrollEventThrottle={64}
        style={{ width: LARGURA, height: ALTURA }}
      >
        {media.map((m, i) =>
          m.kind === 'video' ? (
            <Video key={m.url} url={m.url} activo={i === actual} />
          ) : (
            <Image
              key={m.url}
              source={{ uri: enderecoReduzido(m.url) ?? '' }}
              style={estilos.item}
              resizeMode="cover"
              resizeMethod="resize"
            />
          )
        )}
      </ScrollView>

      {/* Só se mostram os pontos quando há mais do que um: com um só, um
          ponto solitário parece um erro. */}
      {media.length > 1 ? (
        <View style={estilos.pontos}>
          {media.map((m, i) => (
            <Pressable
              key={m.url}
              onPress={() => {
                scroll.current?.scrollTo({ x: i * LARGURA, animated: true });
                setActual(i);
              }}
              style={[estilos.ponto, i === actual && estilos.pontoActivo]}
            />
          ))}
        </View>
      ) : null}

      {media[actual]?.kind === 'video' ? (
        <Text style={estilos.dica}>Toca no vídeo para o ver com som</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  item: {
    width: LARGURA,
    height: ALTURA,
    borderRadius: 16,
    backgroundColor: cores.fundoElevado,
  },
  pontos: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: espaco.s },
  ponto: { width: 7, height: 7, borderRadius: 4, backgroundColor: cores.borda },
  pontoActivo: { backgroundColor: cores.laranjaClaro, width: 18 },
  dica: { color: cores.textoSecundario, fontSize: 12, textAlign: 'center', marginTop: espaco.xs },
});
