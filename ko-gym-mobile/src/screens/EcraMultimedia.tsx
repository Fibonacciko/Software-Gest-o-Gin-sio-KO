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
import { cores, espaco } from '../theme';

const LARGURA = Dimensions.get('window').width;
const LADO = (LARGURA - espaco.m * 2 - espaco.s) / 2;

const dataPt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : null;

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

        <View style={estilos.grelha}>
          {itens.map((item) => {
            const foto = enderecoDaImagem(item.url);
            return (
              <Pressable
                key={item.id}
                style={({ pressed }) => [estilos.celula, pressed && estilos.premido]}
                onPress={() => tocar(item)}
              >
                {item.kind === 'photo' && foto ? (
                  <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" />
                ) : (
                  <View style={[estilos.foto, estilos.video]}>
                    <Text style={estilos.videoIcone}>▶</Text>
                    <Text style={estilos.videoTexto}>Ver o vídeo</Text>
                  </View>
                )}
                {item.caption ? (
                  <Text style={estilos.legenda} numberOfLines={2}>
                    {item.caption}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
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
  vazio: { backgroundColor: 'rgba(45,45,45,0.85)', borderRadius: 20, padding: espaco.g, alignItems: 'center' },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  celula: { width: LADO, marginBottom: espaco.s },
  premido: { opacity: 0.8 },
  foto: { width: LADO, height: LADO, borderRadius: 12, backgroundColor: cores.fundoCartao },
  video: { alignItems: 'center', justifyContent: 'center', gap: espaco.s },
  videoIcone: { color: cores.laranjaClaro, fontSize: 32 },
  videoTexto: { color: cores.textoSecundario, fontSize: 13 },
  legenda: { color: cores.textoSecundario, fontSize: 12, marginTop: espaco.xs },
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
