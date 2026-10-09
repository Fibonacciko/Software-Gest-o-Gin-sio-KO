import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Artigo,
  carregarMontra,
  carregarReservas,
  enderecoDaImagem,
  reservarArtigo,
  Reserva,
  Socio,
} from '../api';
import { cores, espaco } from '../theme';

type Props = { socio: Socio };

const ESTADOS: Record<string, string> = {
  pending: 'A preparar',
  ready: 'Pronta para levantar',
  delivered: 'Levantada',
  cancelled: 'Cancelada',
};

/**
 * A montra do ginásio.
 *
 * Não se compra aqui: reserva-se, e paga-se ao balcão quando se levanta. O
 * ginásio recebe o pedido e deixa o artigo preparado.
 */
export default function EcraLoja({ socio }: Props) {
  const [artigos, setArtigos] = useState<Artigo[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [escolhido, setEscolhido] = useState<Artigo | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [aReservar, setAReservar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);

  const buscar = async () => {
    try {
      setErro(null);
      const [m, r] = await Promise.all([
        carregarMontra(),
        carregarReservas(socio.id).catch(() => [] as Reserva[]),
      ]);
      setArtigos(m);
      setReservas(r.filter((x) => x.status === 'pending' || x.status === 'ready'));
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui falar com o ginásio.'));
      setArtigos([]);
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

  const abrir = (artigo: Artigo) => {
    setEscolhido(artigo);
    setQuantidade(1);
    setErro(null);
  };

  const confirmar = async () => {
    if (!escolhido) return;
    setAReservar(true);
    setErro(null);
    try {
      await reservarArtigo(socio.id, escolhido.id, quantidade);
      setFeito(`${escolhido.name} reservado. Levanta no ginásio.`);
      setEscolhido(null);
      await buscar();
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui reservar.'));
    } finally {
      setAReservar(false);
    }
  };

  if (artigos === null) {
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
        <Text style={estilos.titulo}>Loja</Text>
        <Text style={estilos.subtitulo}>
          Reserva aqui e paga no ginásio quando levantares.
        </Text>

        {feito ? (
          <Pressable style={estilos.aviso} onPress={() => setFeito(null)}>
            <Text style={estilos.avisoTexto}>{feito}</Text>
          </Pressable>
        ) : null}

        {/* O que o sócio já tem reservado */}
        {reservas.length > 0 ? (
          <View style={estilos.minhasReservas}>
            <Text style={estilos.minhasTitulo}>As tuas reservas</Text>
            {reservas.map((r) => (
              <View key={r.id} style={estilos.minhaLinha}>
                <Text style={estilos.minhaTexto} numberOfLines={1}>
                  {r.quantity}x {r.item_name}
                  {r.item_details ? ` · ${r.item_details}` : ''}
                </Text>
                <Text
                  style={[
                    estilos.minhaEstado,
                    r.status === 'ready' && { color: cores.verde },
                  ]}
                >
                  {ESTADOS[r.status] ?? r.status}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {erro && !escolhido ? <Text style={estilos.erro}>{erro}</Text> : null}

        {artigos.length === 0 && !erro ? (
          <View style={estilos.vazio}>
            <Text style={estilos.vazioTexto}>
              A montra está a ser preparada. Volta em breve.
            </Text>
          </View>
        ) : null}

        {artigos.map((a) => {
          const foto = enderecoDaImagem(a.photo_url);
          const detalhes = [a.size, a.color].filter(Boolean).join(' · ');
          return (
            <Pressable
              key={a.id}
              style={({ pressed }) => [estilos.cartao, pressed && estilos.premido]}
              onPress={() => abrir(a)}
            >
              {foto ? <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" /> : null}
              <View style={estilos.info}>
                <Text style={estilos.nome} numberOfLines={2}>
                  {a.name}
                </Text>
                {detalhes ? <Text style={estilos.detalhes}>{detalhes}</Text> : null}
                <View style={estilos.rodape}>
                  <Text style={estilos.preco}>{a.price.toFixed(2)} €</Text>
                  <Text style={estilos.reservar}>Reservar</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Confirmar a reserva */}
      <Modal
        visible={!!escolhido}
        transparent
        animationType="slide"
        onRequestClose={() => setEscolhido(null)}
      >
        <View style={estilos.fundoModal}>
          <View style={estilos.janela}>
            {escolhido ? (
              <>
                <Text style={estilos.janelaTitulo}>{escolhido.name}</Text>
                {[escolhido.size, escolhido.color].filter(Boolean).length > 0 ? (
                  <Text style={estilos.janelaDetalhes}>
                    {[escolhido.size, escolhido.color].filter(Boolean).join(' · ')}
                  </Text>
                ) : null}
                {escolhido.description ? (
                  <Text style={estilos.janelaDescricao}>{escolhido.description}</Text>
                ) : null}

                <View style={estilos.quantidadeLinha}>
                  <Text style={estilos.quantidadeEtiqueta}>Quantidade</Text>
                  <View style={estilos.contador}>
                    <Pressable
                      style={estilos.contadorBotao}
                      onPress={() => setQuantidade((q) => Math.max(1, q - 1))}
                    >
                      <Text style={estilos.contadorTexto}>−</Text>
                    </Pressable>
                    <Text style={estilos.contadorValor}>{quantidade}</Text>
                    <Pressable
                      style={estilos.contadorBotao}
                      onPress={() => setQuantidade((q) => Math.min(escolhido.quantity, q + 1))}
                    >
                      <Text style={estilos.contadorTexto}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <Text style={estilos.total}>
                  Total a pagar no ginásio: {(escolhido.price * quantidade).toFixed(2)} €
                </Text>

                {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

                <Pressable
                  style={({ pressed }) => [estilos.confirmar, pressed && estilos.premido]}
                  onPress={confirmar}
                  disabled={aReservar}
                >
                  {aReservar ? (
                    <ActivityIndicator color={cores.texto} />
                  ) : (
                    <Text style={estilos.confirmarTexto}>RESERVAR</Text>
                  )}
                </Pressable>
                <Pressable style={estilos.cancelar} onPress={() => setEscolhido(null)}>
                  <Text style={estilos.cancelarTexto}>Cancelar</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
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
  erro: { color: cores.vermelho, marginTop: espaco.s },
  aviso: {
    backgroundColor: cores.verde,
    borderRadius: 12,
    padding: espaco.m,
    marginBottom: espaco.m,
  },
  avisoTexto: { color: cores.texto, fontWeight: '600', textAlign: 'center' },
  minhasReservas: {
    backgroundColor: 'rgba(45,45,45,0.9)',
    borderRadius: 16,
    padding: espaco.m,
    marginBottom: espaco.m,
    borderWidth: 1,
    borderColor: cores.laranja,
  },
  minhasTitulo: { color: cores.laranjaClaro, fontWeight: '700', marginBottom: espaco.s },
  minhaLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco.s, paddingVertical: 4 },
  minhaTexto: { color: cores.texto, flex: 1, fontSize: 14 },
  minhaEstado: { color: cores.textoSecundario, fontSize: 12 },
  vazio: { backgroundColor: 'rgba(45,45,45,0.85)', borderRadius: 20, padding: espaco.g, alignItems: 'center' },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },
  cartao: {
    backgroundColor: 'rgba(45,45,45,0.85)',
    borderRadius: 20,
    marginBottom: espaco.m,
    overflow: 'hidden',
  },
  premido: { opacity: 0.85 },
  foto: { width: '100%', height: 200, backgroundColor: cores.fundoElevado },
  info: { padding: espaco.m },
  nome: { color: cores.texto, fontSize: 17, fontWeight: '700' },
  detalhes: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.s,
  },
  preco: { color: cores.dourado, fontSize: 18, fontWeight: '800' },
  reservar: { color: cores.laranjaClaro, fontWeight: '700' },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  janela: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espaco.g,
  },
  janelaTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  janelaDetalhes: { color: cores.textoSecundario, fontSize: 14, marginTop: 2 },
  janelaDescricao: { color: cores.textoSecundario, fontSize: 14, marginTop: espaco.s, lineHeight: 20 },
  quantidadeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.g,
  },
  quantidadeEtiqueta: { color: cores.texto, fontSize: 16 },
  contador: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  contadorBotao: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: cores.fundoElevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: cores.texto, fontSize: 22, fontWeight: '700' },
  contadorValor: { color: cores.texto, fontSize: 20, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  total: { color: cores.dourado, fontSize: 16, fontWeight: '700', marginTop: espaco.m },
  confirmar: {
    backgroundColor: cores.laranja,
    borderRadius: 14,
    paddingVertical: espaco.m,
    alignItems: 'center',
    marginTop: espaco.g,
  },
  confirmarTexto: { color: cores.texto, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  cancelar: { alignItems: 'center', paddingVertical: espaco.m },
  cancelarTexto: { color: cores.textoSecundario },
});
