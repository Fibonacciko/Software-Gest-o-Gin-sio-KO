import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { carregarMultimedia, enderecoReduzido, ItemMultimedia } from '../api';
import { dataPt } from '../lib/datas';
import Vidro from './Vidro';
import { cores, espaco, raio, sombra } from '../theme';

const LARGURA = Dimensions.get('window').width;
/** O lado de cada quadrado da faixa. Dois e um bocadinho do terceiro à vista:
 *  é o que diz, sem legenda nenhuma, que a faixa anda para o lado. */
const LADO = Math.round((LARGURA - espaco.m * 2 - espaco.s * 2) / 2.4);

/**
 * As fotografias do ginásio, numa faixa no Início.
 *
 * **Eram um separador inteiro** e passaram a esta faixa, por decisão do dono:
 * as fotografias são poucas e chegam de longe a longe, e um dos seis lugares
 * da barra passou a ser o Corpo, que muda todos os meses e é do próprio
 * sócio. Aqui continuam à vista de quem abre a aplicação — que é o que elas
 * precisam — sem pedirem um ecrã só.
 *
 * **A faixa não aparece quando não há nada.** Uma caixa vazia a dizer "ainda
 * não há fotografias" é pior do que não haver caixa nenhuma.
 *
 * Os **vídeos são links** para as redes do ginásio (um minuto de vídeo de
 * telemóvel são 50 a 100 MB, e as redes já têm o conteúdo e já têm público),
 * por isso vão marcados com o triângulo e abrem fora da aplicação.
 */
export default function FotosDoGinasio() {
  const [itens, setItens] = useState<ItemMultimedia[] | null>(null);
  const [aberta, setAberta] = useState<ItemMultimedia | null>(null);
  const [tudo, setTudo] = useState(false);

  useEffect(() => {
    carregarMultimedia()
      .then(setItens)
      .catch(() => setItens([]));
  }, []);

  if (!itens || itens.length === 0) return null;

  const tocar = (item: ItemMultimedia) => {
    if (item.kind === 'video_link') {
      Linking.openURL(item.url).catch(() => {});
      return;
    }
    setAberta(item);
  };

  const quadrado = (item: ItemMultimedia, lado: number) => (
    <Pressable
      key={item.id}
      onPress={() => tocar(item)}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <View style={[estilos.quadrado, { width: lado, height: lado }]}>
        {item.kind === 'photo' ? (
          <Image
            source={{ uri: enderecoReduzido(item.url, lado * 2) ?? '' }}
            style={{ width: lado, height: lado }}
            resizeMode="cover"
          />
        ) : (
          <View style={[estilos.video, { width: lado, height: lado }]}>
            <Text style={estilos.videoIcone}>▶</Text>
            <Text style={estilos.videoTexto} numberOfLines={2}>
              {item.caption || 'Vídeo'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );

  return (
    <>
      <Vidro estilo={estilos.cartao}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.titulo}>Fotos do ginásio</Text>
          {itens.length > 4 ? (
            <Pressable onPress={() => setTudo(true)}>
              <Text style={estilos.verTudo}>Ver as {itens.length}</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.faixa}
        >
          {itens.slice(0, 8).map((i) => quadrado(i, LADO))}
        </ScrollView>
      </Vidro>

      {/* Uma fotografia em grande */}
      <Modal visible={!!aberta} transparent animationType="fade" onRequestClose={() => setAberta(null)}>
        <Pressable style={estilos.fundoPreto} onPress={() => setAberta(null)}>
          {aberta?.kind === 'photo' ? (
            <Image
              source={{ uri: enderecoReduzido(aberta.url, 1080) ?? '' }}
              style={estilos.grande}
              resizeMode="contain"
            />
          ) : null}
          {aberta?.caption ? <Text style={estilos.legenda}>{aberta.caption}</Text> : null}
          {aberta?.taken_on ? (
            <Text style={estilos.legendaData}>{dataPt(aberta.taken_on)}</Text>
          ) : null}
        </Pressable>
      </Modal>

      {/* Todas, em grelha */}
      <Modal visible={tudo} transparent animationType="slide" onRequestClose={() => setTudo(false)}>
        <View style={estilos.fundoJanela}>
          <View style={estilos.janela}>
            <Text style={estilos.janelaTitulo}>Fotos do ginásio</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={estilos.grelha}>
                {itens.map((i) => quadrado(i, (LARGURA - espaco.g * 2 - espaco.s) / 2))}
              </View>
            </ScrollView>
            <Pressable style={estilos.fechar} onPress={() => setTudo(false)}>
              <Text style={estilos.fecharTexto}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: espaco.m, marginTop: espaco.m },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: espaco.s,
  },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '800' },
  // Em ouro, como as letras de tudo o que é para carregar
  verTudo: { color: cores.ouro, fontSize: 13, fontWeight: '700' },
  faixa: { gap: espaco.s, paddingRight: espaco.m },
  quadrado: {
    borderRadius: raio.s,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  video: { alignItems: 'center', justifyContent: 'center', padding: espaco.s, gap: 4 },
  videoIcone: { color: cores.ouro, fontSize: 22 },
  videoTexto: { color: cores.textoSecundario, fontSize: 11, textAlign: 'center' },

  fundoPreto: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.m,
  },
  grande: { width: '100%', height: '78%' },
  legenda: { color: cores.texto, fontSize: 15, marginTop: espaco.m, textAlign: 'center' },
  legendaData: { color: cores.textoSecundario, fontSize: 12, marginTop: 4 },

  fundoJanela: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  janela: {
    backgroundColor: 'rgba(38,38,38,0.98)',
    borderTopLeftRadius: raio.xg,
    borderTopRightRadius: raio.xg,
    padding: espaco.g,
    maxHeight: '88%',
    ...sombra.flutuante,
  },
  janelaTitulo: {
    color: cores.texto,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: espaco.m,
  },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  fechar: { alignItems: 'center', paddingVertical: espaco.m },
  fecharTexto: { color: cores.ouro, fontSize: 15, fontWeight: '700' },
});
