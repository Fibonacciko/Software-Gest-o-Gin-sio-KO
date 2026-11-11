import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cores, espaco, raio } from '../theme';

type Props = {
  imagem?: string | ImageSourcePropType | null;
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
 */
export default function CartaoDeDestaque({
  imagem,
  titulo,
  subtitulo,
  selo,
  altura = 200,
  aoTocar,
}: Props) {
  const fonte =
    typeof imagem === 'string' ? { uri: imagem } : (imagem as ImageSourcePropType | null);

  return (
    <Pressable
      style={({ pressed }) => [estilos.cartao, { height: altura }, pressed && estilos.premido]}
      onPress={aoTocar}
      disabled={!aoTocar}
    >
      {fonte ? (
        <Image source={fonte} style={estilos.imagem} resizeMode="cover" />
      ) : (
        <View style={[estilos.imagem, estilos.semImagem]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0.82)']}
        locations={[0.35, 0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {selo ? (
        <View style={estilos.selo}>
          <Text style={estilos.seloTexto}>{selo}</Text>
        </View>
      ) : null}

      <View style={estilos.texto}>
        <Text style={estilos.titulo} numberOfLines={2}>
          {titulo}
        </Text>
        {subtitulo ? (
          <Text style={estilos.subtitulo} numberOfLines={2}>
            {subtitulo}
          </Text>
        ) : null}
      </View>
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
});
