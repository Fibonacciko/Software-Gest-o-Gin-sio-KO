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
import { carregarParceiros, enderecoDaImagem, Parceiro } from '../api';
import { cores, espaco } from '../theme';

/**
 * Os protocolos de parceria do ginásio.
 *
 * O que interessa ao sócio é a **vantagem**: é a primeira coisa que se lê em
 * cada cartão, e é por isso que aparece em laranja e não o nome da entidade.
 */
export default function EcraParceiros() {
  const [parceiros, setParceiros] = useState<Parceiro[] | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = async () => {
    try {
      setErro(null);
      setParceiros(await carregarParceiros());
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui falar com o ginásio.'));
      setParceiros([]);
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

  const abrir = (endereco: string) => {
    Linking.openURL(endereco).catch(() => {});
  };

  if (parceiros === null) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={cores.laranjaClaro} />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      <Text style={estilos.titulo}>Parceiros</Text>
      <Text style={estilos.subtitulo}>
        Vantagens para quem é sócio do KO. Mostra o teu cartão para as usares.
      </Text>

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      {parceiros.length === 0 && !erro ? (
        <View style={estilos.vazio}>
          <Text style={estilos.vazioTexto}>
            Ainda não há parceiros para mostrar. Vai haver em breve.
          </Text>
        </View>
      ) : null}

      {parceiros.map((p) => {
        const logo = enderecoDaImagem(p.logo_url);
        return (
          <View key={p.id} style={estilos.cartao}>
            <View style={estilos.topo}>
              {/* "contain": um logotipo nunca se corta. Com "cover", um logotipo
                  largo perdia as pontas e um alto perdia o topo. */}
              {logo ? (
                <Image source={{ uri: logo }} style={estilos.logo} resizeMode="contain" />
              ) : (
                <View style={[estilos.logo, estilos.logoVazio]}>
                  <Text style={estilos.logoLetra}>{p.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={estilos.cabecalho}>
                <Text style={estilos.nome} numberOfLines={2}>
                  {p.name}
                </Text>
                {p.category ? <Text style={estilos.categoria}>{p.category}</Text> : null}
              </View>
            </View>

            <Text style={estilos.vantagem}>{p.benefit}</Text>

            {p.description ? <Text style={estilos.descricao}>{p.description}</Text> : null}

            {p.address ? <Text style={estilos.linha}>{p.address}</Text> : null}

            <View style={estilos.accoes}>
              {p.phone ? (
                <Pressable
                  style={({ pressed }) => [estilos.botao, pressed && estilos.premido]}
                  onPress={() => abrir(`tel:${p.phone}`)}
                >
                  <Text style={estilos.botaoTexto}>Ligar</Text>
                </Pressable>
              ) : null}
              {p.website ? (
                <Pressable
                  style={({ pressed }) => [estilos.botao, pressed && estilos.premido]}
                  onPress={() => abrir(p.website!)}
                >
                  <Text style={estilos.botaoTexto}>Visitar o site</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: cores.texto, fontSize: 26, fontWeight: '800' },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: espaco.xs, marginBottom: espaco.m },
  erro: { color: cores.vermelho, marginBottom: espaco.m },
  vazio: {
    backgroundColor: 'rgba(45,45,45,0.85)',
    borderRadius: 16,
    padding: espaco.g,
    alignItems: 'center',
  },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },
  cartao: {
    backgroundColor: 'rgba(45,45,45,0.85)',
    borderRadius: 20,
    padding: espaco.m,
    marginBottom: espaco.m,
  },
  topo: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: cores.fundoElevado },
  logoVazio: { alignItems: 'center', justifyContent: 'center' },
  logoLetra: { color: cores.laranjaClaro, fontSize: 24, fontWeight: '800' },
  cabecalho: { flex: 1 },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  categoria: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  vantagem: {
    color: cores.dourado,
    fontSize: 16,
    fontWeight: '700',
    marginTop: espaco.m,
  },
  descricao: { color: cores.textoSecundario, fontSize: 14, marginTop: espaco.s, lineHeight: 20 },
  linha: { color: cores.textoSecundario, fontSize: 13, marginTop: espaco.s },
  accoes: { flexDirection: 'row', gap: espaco.s, marginTop: espaco.m },
  botao: {
    borderWidth: 1,
    borderColor: cores.laranja,
    borderRadius: 10,
    paddingVertical: espaco.s,
    paddingHorizontal: espaco.m,
  },
  premido: { opacity: 0.7 },
  botaoTexto: { color: cores.laranjaClaro, fontWeight: '600' },
});
