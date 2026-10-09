import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { carregarFichaDoGinasio, enderecoDaImagem, FichaDoGinasio } from '../api';
import { cores, espaco } from '../theme';

const abrir = (endereco?: string | null) => {
  if (!endereco) return;
  Linking.openURL(endereco).catch(() => {});
};

/**
 * O separador "O Ginásio": onde fica, como se fala com ele e onde se deixa
 * uma avaliação.
 *
 * Os botões só aparecem quando há o que abrir: um botão que não faz nada é
 * pior do que não ter botão nenhum.
 */
export default function EcraGinasio() {
  const [ficha, setFicha] = useState<FichaDoGinasio | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);

  const buscar = async () => {
    try {
      setFicha(await carregarFichaDoGinasio());
    } catch {
      setFicha({ name: 'Ginásio KO' });
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

  if (!ficha) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={cores.laranjaClaro} />
      </View>
    );
  }

  const foto = enderecoDaImagem(ficha.photo_url);
  const whatsapp = ficha.whatsapp
    ? `https://wa.me/${ficha.whatsapp.replace(/\D/g, '')}`
    : null;

  const Linha = ({ etiqueta, valor }: { etiqueta: string; valor?: string | null }) =>
    valor ? (
      <View style={estilos.linha}>
        <Text style={estilos.linhaEtiqueta}>{etiqueta}</Text>
        <Text style={estilos.linhaValor}>{valor}</Text>
      </View>
    ) : null;

  const Botao = ({
    texto,
    destaque,
    aoTocar,
  }: {
    texto: string;
    destaque?: boolean;
    aoTocar: () => void;
  }) => (
    <Pressable
      style={({ pressed }) => [
        estilos.botao,
        destaque && estilos.botaoDestaque,
        pressed && { opacity: 0.75 },
      ]}
      onPress={aoTocar}
    >
      <Text style={[estilos.botaoTexto, destaque && estilos.botaoTextoDestaque]}>{texto}</Text>
    </Pressable>
  );

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      {foto ? <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" /> : null}

      <Text style={estilos.titulo}>{ficha.name || 'Ginásio KO'}</Text>
      {ficha.about ? <Text style={estilos.sobre}>{ficha.about}</Text> : null}

      {/* Deixar uma avaliação: é o que mais ajuda o ginásio, por isso vem primeiro */}
      {ficha.review_url ? (
        <View style={estilos.destaque}>
          <Text style={estilos.destaqueTitulo}>Gostas de treinar aqui?</Text>
          <Text style={estilos.destaqueTexto}>
            Uma avaliação no Google demora um minuto e ajuda-nos mesmo.
          </Text>
          <Botao texto="★  DEIXAR UMA AVALIAÇÃO" destaque aoTocar={() => abrir(ficha.review_url)} />
        </View>
      ) : null}

      <View style={estilos.cartao}>
        <Linha etiqueta="Morada" valor={ficha.address} />
        <Linha etiqueta="Horário" valor={ficha.hours} />
        <Linha etiqueta="Telefone" valor={ficha.phone} />
        <Linha etiqueta="Email" valor={ficha.email} />

        {!ficha.address && !ficha.hours && !ficha.phone && !ficha.email ? (
          <Text style={estilos.vazio}>
            Os contactos do ginásio aparecem aqui assim que forem preenchidos.
          </Text>
        ) : null}
      </View>

      <View style={estilos.accoes}>
        {ficha.maps_url ? (
          <Botao texto="Abrir no Google Maps" aoTocar={() => abrir(ficha.maps_url)} />
        ) : null}
        {ficha.phone ? (
          <Botao texto="Ligar ao ginásio" aoTocar={() => abrir(`tel:${ficha.phone}`)} />
        ) : null}
        {whatsapp ? <Botao texto="WhatsApp" aoTocar={() => abrir(whatsapp)} /> : null}
        {ficha.email ? (
          <Botao texto="Enviar email" aoTocar={() => abrir(`mailto:${ficha.email}`)} />
        ) : null}
        {ficha.instagram ? (
          <Botao texto="Instagram" aoTocar={() => abrir(ficha.instagram)} />
        ) : null}
        {ficha.facebook ? <Botao texto="Facebook" aoTocar={() => abrir(ficha.facebook)} /> : null}
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  foto: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    backgroundColor: cores.fundoElevado,
    marginBottom: espaco.m,
  },
  titulo: { color: cores.texto, fontSize: 28, fontWeight: '800' },
  sobre: { color: cores.textoSecundario, fontSize: 14, marginTop: espaco.s, lineHeight: 21 },
  destaque: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: cores.dourado,
    borderRadius: 20,
    padding: espaco.m,
    marginTop: espaco.g,
  },
  destaqueTitulo: { color: cores.texto, fontSize: 17, fontWeight: '800' },
  destaqueTexto: { color: cores.textoSecundario, fontSize: 13, marginTop: 4, marginBottom: espaco.m },
  cartao: {
    backgroundColor: 'rgba(45,45,45,0.85)',
    borderRadius: 20,
    padding: espaco.m,
    marginTop: espaco.m,
  },
  linha: { paddingVertical: espaco.s },
  linhaEtiqueta: { color: cores.textoSecundario, fontSize: 12 },
  linhaValor: { color: cores.texto, fontSize: 16, marginTop: 2 },
  vazio: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: espaco.m },
  accoes: { gap: espaco.s, marginTop: espaco.m },
  botao: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 14,
    paddingVertical: espaco.m,
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,58,0.6)',
  },
  botaoDestaque: { backgroundColor: cores.dourado, borderColor: cores.dourado },
  botaoTexto: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  botaoTextoDestaque: { color: '#1A1A1A', fontWeight: '800', letterSpacing: 0.5 },
});
