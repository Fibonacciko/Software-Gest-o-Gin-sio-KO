import { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, espaco, raio } from '../theme';

type Props = {
  imagem?: string | ImageSourcePropType | null;
  /**
   * As fotografias do artigo, para se deslizarem no próprio cartão.
   *
   * Com duas ou mais, o cartão passa a deslizar para o lado e ganha os
   * pontinhos em baixo. Com uma só, ou nenhuma, fica a `imagem` de sempre.
   */
  imagens?: (string | null | undefined)[] | null;
  titulo: string;
  subtitulo?: string | null;
  /** Um canto superior direito, para o preço ou a contagem de fotografias. */
  selo?: string | null;
  altura?: number;
  aoTocar?: () => void;
};

/**
 * Uma fotografia de largura inteira com o texto por cima.
 *
 * É o formato que as aplicações de hoje usam para catálogos — a imagem ocupa
 * o cartão todo e o texto assenta num escurecimento no fundo. Repara-se mais
 * do que numa fotografia pequena ao lado de um parágrafo, e lê-se à mesma.
 *
 * O escurecimento não é um preto chapado: é um degradê do transparente ao
 * escuro, só no terço de baixo. Por cima de uma fotografia clara o texto
 * continua legível, e por cima de uma escura não se nota que lá está.
 *
 * **As fotografias deslizam no próprio cartão** (`imagens`), sem ser preciso
 * abrir o artigo: um par de luvas vê-se pela frente e pelas costas sem sair
 * da lista. Os **pontinhos** em baixo não são enfeite — sem eles ninguém
 * descobre que há mais do que uma fotografia ali.
 *
 * A largura das páginas é a que o cartão **mede** (`onLayout`), e não a do
 * ecrã: o mesmo cartão é usado em sítios com margens diferentes, e com a
 * largura do ecrã as fotografias ficavam desencontradas do deslize.
 */
export default function CartaoDeDestaque({
  imagem,
  imagens,
  titulo,
  subtitulo,
  selo,
  altura = 200,
  aoTocar,
}: Props) {
  const fonte =
    typeof imagem === 'string' ? { uri: imagem } : (imagem as ImageSourcePropType | null);

  const paginas = (imagens ?? []).filter((x): x is string => !!x);
  const desliza = paginas.length > 1;

  // Sem galeria, vale a `imagem` de sempre; se só vier a galeria com uma
  // fotografia, é essa que se mostra.
  const unica: ImageSourcePropType | null =
    fonte ?? (paginas.length === 1 ? { uri: paginas[0] } : null);

  const [largura, setLargura] = useState(0);
  const [pagina, setPagina] = useState(0);

  // Os pontinhos seguem o deslize enquanto o dedo anda (`onScroll`) e também
  // quando ele para (`onMomentumScrollEnd`): sozinho, o fim do movimento não
  // chega em todos os casos, e o pontinho ficava a dizer a página errada.
  // Só se grava quando muda mesmo, para não redesenhar a cada imagem.
  const aoDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (largura <= 0) return;
    const qual = Math.round(e.nativeEvent.contentOffset.x / largura);
    setPagina((anterior) => (anterior === qual ? anterior : qual));
  };

  const moldura = (
    <>
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
        locations={[0.35, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {selo ? (
        <View style={estilos.selo} pointerEvents="none">
          <Text style={estilos.seloTexto}>{selo}</Text>
        </View>
      ) : null}

      {desliza ? (
        <View style={estilos.pontos} pointerEvents="none">
          {paginas.map((_, i) => (
            <View key={i} style={[estilos.ponto, i === pagina && estilos.pontoAceso]} />
          ))}
        </View>
      ) : null}

      <View style={[estilos.texto, desliza && estilos.textoComPontos]} pointerEvents="none">
        <Text style={estilos.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={estilos.subtitulo} numberOfLines={2}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
    </>
  );

  // Com várias fotografias o cartão é uma lista que desliza, e o toque fica
  // em cada página: assim arrastar o dedo muda a imagem e tocar abre o
  // artigo, sem um gesto roubar o outro.
  if (desliza) {
    return (
      <View
        style={[estilos.cartao, { height: altura }]}
        onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
      >
        {largura > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={aoDeslizar}
            onMomentumScrollEnd={aoDeslizar}
            scrollEventThrottle={32}
            style={StyleSheet.absoluteFill}
          >
            {paginas.map((url, i) => (
              <Pressable
                key={`${url}-${i}`}
                onPress={aoTocar}
                disabled={!aoTocar}
                style={({ pressed }) => [{ width: largura, height: altura }, pressed && estilos.premido]}
              >
                <Image
                  source={{ uri: url }}
                  style={{ width: largura, height: altura }}
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {moldura}
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [estilos.cartao, { height: altura }, pressed && estilos.premido]}
      onPress={aoTocar}
      disabled={!aoTocar}
    >
      {unica ? (
        <Image source={unica} style={estilos.imagem} resizeMode="cover" />
      ) : (
        <View style={[estilos.imagem, estilos.semImagem]} />
      )}
      {moldura}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    width: '100%',
    borderRadius: raio.g,
    overflow: 'hidden',
    backgroundColor: cores.vidro,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.vidroBordo,
  },
  premido: { opacity: 0.88 },
  imagem: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  semImagem: { backgroundColor: cores.fundoElevado },
  texto: { position: 'absolute', left: espaco.m, right: espaco.m, bottom: espaco.m },
  // Com pontinhos o texto sobe, para não ficarem um em cima do outro
  textoComPontos: { bottom: espaco.m + 16 },
  titulo: { color: cores.texto, fontSize: 19, fontWeight: '800' },
  subtitulo: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 2 },
  selo: {
    position: 'absolute',
    top: espaco.s,
    right: espaco.s,
    paddingHorizontal: espaco.s,
    paddingVertical: 3,
    borderRadius: raio.redondo,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  seloTexto: { color: cores.texto, fontSize: 12, fontWeight: '700' },
  pontos: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: espaco.s,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  ponto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  pontoAceso: { backgroundColor: cores.texto },
});
