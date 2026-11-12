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
  TamanhoDoArtigo,
  carregarMontra,
  carregarReservas,
  enderecoDaImagem,
  enderecoReduzido,
  reservarArtigo,
  Reserva,
  Socio,
} from '../api';
import CartaoDeDestaque from '../componentes/CartaoDeDestaque';
import GaleriaDoArtigo from '../componentes/GaleriaDoArtigo';
import { cores, espaco, raio, superficie } from '../theme';

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
  const [tamanho, setTamanho] = useState<TamanhoDoArtigo | null>(null);
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
    // Com um tamanho so, nao se pergunta nada: escolhe-se sozinho
    setTamanho(artigo.sizes?.length === 1 ? artigo.sizes[0] : null);
    setQuantidade(1);
    setErro(null);
  };

  const confirmar = async () => {
    if (!escolhido) return;
    if (!tamanho) {
      setErro('Escolhe o tamanho.');
      return;
    }
    setAReservar(true);
    setErro(null);
    try {
      // Reserva-se o tamanho certo, e não o artigo em geral: é o que o
      // balcão tem de preparar e é onde o stock dá baixa.
      await reservarArtigo(socio.id, tamanho.item_id, quantidade);
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
          const foto = enderecoReduzido(a.photo_url);
          const detalhes = a.color || '';
          // Só as fotografias deslizam no cartão. Um vídeo num cartão de uma
          // lista obrigava a um leitor por artigo, e dez leitores a rolar ao
          // mesmo tempo engasgam os telemóveis fracos — fica para dentro do
          // artigo, que é onde se abre um de cada vez.
          const fotografias = (a.media || [])
            .filter((m) => m.kind === 'photo')
            .map((m) => enderecoReduzido(m.url));
          return (
            <View key={a.id} style={estilos.item}>
              {/* A fotografia ocupa o cartão todo e o nome assenta nela: é o
                  artigo que se escolhe com os olhos, não o texto. O número de
                  ficheiros vai no canto, senão ninguém sabe que há mais. */}
              <CartaoDeDestaque
                imagem={foto}
                imagens={fotografias}
                titulo={a.name}
                subtitulo={detalhes || null}
                selo={
                  a.media && a.media.length > 1
                    ? `${a.media.some((m) => m.kind === 'video') ? '▶ ' : ''}${a.media.length}`
                    : null
                }
                altura={300}
                aoTocar={() => abrir(a)}
              />
              <View style={estilos.rodape}>
                <Text style={estilos.preco}>{a.price.toFixed(2)} €</Text>
                <Text style={estilos.reservar}>Reservar</Text>
              </View>
            </View>
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
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={estilos.janelaConteudo}
              >
                {/* As fotografias e os vídeos do artigo, a deslizar para o
                    lado. Vêm antes do nome: é pela imagem que se escolhe. */}
                <GaleriaDoArtigo media={escolhido.media} />

                <Text style={estilos.janelaTitulo}>{escolhido.name}</Text>
                {escolhido.color ? (
                  <Text style={estilos.janelaDetalhes}>{escolhido.color}</Text>
                ) : null}
                {escolhido.description ? (
                  <Text style={estilos.janelaDescricao}>{escolhido.description}</Text>
                ) : null}

                {/* O tamanho pergunta-se aqui, e não na montra: lá mostra-se
                    o artigo e a cor, que é o que se escolhe com os olhos. */}
                {escolhido.sizes.length > 1 ? (
                  <View style={estilos.tamanhos}>
                    <Text style={estilos.quantidadeEtiqueta}>Tamanho</Text>
                    <View style={estilos.tamanhosLinha}>
                      {escolhido.sizes.map((t) => {
                        const activo = tamanho?.item_id === t.item_id;
                        return (
                          <Pressable
                            key={t.item_id}
                            style={[estilos.tamanho, activo && estilos.tamanhoEscolhido]}
                            onPress={() => {
                              setTamanho(t);
                              setQuantidade((q) => Math.min(q, t.quantity));
                              setErro(null);
                            }}
                          >
                            <Text style={[estilos.tamanhoTexto, activo && estilos.tamanhoTextoEscolhido]}>
                              {t.size || 'Único'}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
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
                      onPress={() => setQuantidade((q) => Math.min(tamanho?.quantity ?? 1, q + 1))}
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
              </ScrollView>
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
    borderRadius: raio.s,
    padding: espaco.m,
    marginBottom: espaco.m,
  },
  avisoTexto: { color: cores.texto, fontWeight: '600', textAlign: 'center' },
  minhasReservas: {
    backgroundColor: 'rgba(232,132,42,0.10)',
    borderRadius: raio.g,
    padding: espaco.m,
    marginBottom: espaco.m,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(232,132,42,0.45)',
  },
  minhasTitulo: { color: cores.laranjaClaro, fontWeight: '700', marginBottom: espaco.s },
  minhaLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: espaco.s, paddingVertical: 4 },
  minhaTexto: { color: cores.texto, flex: 1, fontSize: 14 },
  minhaEstado: { color: cores.textoSecundario, fontSize: 12 },
  vazio: { ...superficie, borderRadius: raio.g, padding: espaco.g, alignItems: 'center' },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },
  item: { marginBottom: espaco.m },
  premido: { opacity: 0.85 },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: espaco.s,
    paddingHorizontal: espaco.xs,
  },
  preco: { color: cores.dourado, fontSize: 18, fontWeight: '800' },
  reservar: { color: cores.laranjaClaro, fontWeight: '700' },
  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  janela: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Com a galeria lá dentro, a janela cresceu: limita-se a quatro quintos
    // do ecrã e o resto rola, em vez de empurrar os botões para fora.
    maxHeight: '88%',
  },
  janelaConteudo: { padding: espaco.g },
  janelaTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  janelaDetalhes: { color: cores.textoSecundario, fontSize: 14, marginTop: 2 },
  janelaDescricao: { color: cores.textoSecundario, fontSize: 14, marginTop: espaco.s, lineHeight: 20 },
  tamanhos: { marginTop: espaco.g },
  tamanhosLinha: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s, marginTop: espaco.s },
  tamanho: {
    minWidth: 54,
    paddingVertical: espaco.s,
    paddingHorizontal: espaco.m,
    borderRadius: raio.s,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.fundoElevado,
    alignItems: 'center',
  },
  tamanhoEscolhido: { borderColor: cores.laranjaClaro, backgroundColor: cores.laranja },
  tamanhoTexto: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  tamanhoTextoEscolhido: { color: cores.texto },
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
    borderRadius: raio.s,
    backgroundColor: cores.fundoElevado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: { color: cores.texto, fontSize: 22, fontWeight: '700' },
  contadorValor: { color: cores.texto, fontSize: 20, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  total: { color: cores.dourado, fontSize: 16, fontWeight: '700', marginTop: espaco.m },
  confirmar: {
    backgroundColor: cores.laranja,
    borderRadius: raio.m,
    paddingVertical: espaco.m,
    alignItems: 'center',
    marginTop: espaco.g,
  },
  confirmarTexto: { color: cores.texto, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  cancelar: { alignItems: 'center', paddingVertical: espaco.m },
  cancelarTexto: { color: cores.textoSecundario },
});
