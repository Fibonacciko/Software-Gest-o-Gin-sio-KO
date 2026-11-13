import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { carregarMultimedia, enderecoDaImagem, ItemMultimedia } from '../api';
import CartaoDeDestaque from '../componentes/CartaoDeDestaque';
import { dataPt } from '../lib/datas';
import { cores, espaco, raio, superficie } from '../theme';

const LARGURA = Dimensions.get('window').width;
const LADO = (LARGURA - espaco.m * 2 - espaco.s) / 2;

/**
 * Fotografias dos treinos.
 *
 * As fotografias são do ginásio e estão alojadas no servidor. Os vídeos são
 * links para as redes sociais: um minuto de vídeo de telemóvel são 50 a 100 MB
 * e as redes já têm o conteúdo e já têm público.
 */
export default function EcraMultimedia() {
  const [itens, setItens] = useState<ItemMultimedia[] | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [aberta, setAberta] = useState<ItemMultimedia | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = async () => {
    try {
      setErro(null);
      setItens(await carregarMultimedia());
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui falar com o ginásio.'));
      setItens([]);
    }
  };

  useEffect(() => {
    buscar();
  }, []);

  const atualizar = async () => {
    setAAtualizar(true);
    await buscar();
    setAAtualizar(false);
  };

  const tocar = (item: ItemMultimedia) => {
    if (item.kind === 'video_link') {
      Linking.openURL(item.url).catch(() => {});
      return;
    }
    setAberta(item);
  };

  if (itens === null) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={cores.laranjaClaro} />
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={estilos.raiz}
        contentContainerStyle={estilos.conteudo}
        refreshControl={
          <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
        }
      >
        <Text style={estilos.titulo}>Multimédia</Text>
        <Text style={estilos.subtitulo}>Fotografias e vídeos dos treinos.</Text>

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        {itens.length === 0 && !erro ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTexto}>
              Ainda não há fotografias publicadas. Aparece por cá depois do próximo treino.
            </Text>
          </View>
        ) : null}

        {/* Largura inteira, uma por uma, com a legenda por cima: a grelha de
            dois em dois mostrava o dobro das fotografias e metade de cada. */}
        {itens.map((item) => (
          <View key={item.id} style={estilos.item}>
            <CartaoDeDestaque
              imagem={item.kind === 'photo' ? enderecoDaImagem(item.url) : null}
              titulo={item.caption || (item.kind === 'video_link' ? 'Ver o vídeo' : 'Ginásio KO')}
              subtitulo={dataPt(item.taken_on)}
              selo={item.kind === 'video_link' ? '▶' : null}
              altura={300}
              aoTocar={() => tocar(item)}
            />
          </View>
        ))}
      </ScrollView>

      {/* A fotografia em grande */}
      <Modal visible={!!aberta} transparent animationType="fade" onRequestClose={() => setAberta(null)}>
        <Pressable style={estilos.fundoModal} onPress={() => setAberta(null)}>
          {aberta ? (
            <>
              <Image
                source={{ uri: enderecoDaImagem(aberta.url) ?? '' }}
                style={estilos.fotoGrande}
                resizeMode="contain"
              />
              {aberta.caption ? <Text style={estilos.legendaGrande}>{aberta.caption}</Text> : null}
              {dataPt(aberta.taken_on) ? (
                <Text style={estilos.dataGrande}>{dataPt(aberta.taken_on)}</Text>
              ) : null}
              <Text style={estilos.fechar}>Toca para fechar</Text>
            </>
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: cores.texto, fontSize: 26, fontWeight: '800' },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: espaco.xs, marginBottom: espaco.m },
  erro: { color: cores.vermelho, marginBottom: espaco.m },
  vazio: { ...superficie, borderRadius: raio.g, padding: espaco.g, alignItems: 'center' },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },
  item: { marginBottom: espaco.m },
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.m,
  },
  fotoGrande: { width: '100%', height: '70%' },
  legendaGrande: { color: cores.texto, fontSize: 16, marginTop: espaco.m, textAlign: 'center' },
  dataGrande: { color: cores.textoSecundario, fontSize: 13, marginTop: espaco.xs },
  fechar: { color: cores.textoSecundario, fontSize: 12, marginTop: espaco.g },
});
