import { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { carregarPlanos, enderecoDaImagem, pedirPlano, Plano, TipoDePlano } from '../api';
import { dataPt } from '../lib/datas';
import Vidro from './Vidro';
import { cores, espaco, raio, sombra } from '../theme';

const TIPOS: { tipo: TipoDePlano; etiqueta: string; icone: string }[] = [
  { tipo: 'training', etiqueta: 'Plano de treino', icone: '🏋️' },
  { tipo: 'nutrition', etiqueta: 'Plano alimentar', icone: '🥗' },
];

/**
 * Os planos do sócio: o de treino e o alimentar.
 *
 * São documentos — um PDF do professor ou um texto escrito na gestão. Não há
 * nada aqui para o sócio preencher: ele lê, e se quiser um novo pede-o pelo
 * botão, que faz chegar o pedido ao Painel do ginásio.
 *
 * O cartão aparece **sempre**, mesmo sem planos nenhuns: é por ele que o
 * sócio descobre que pode pedir um.
 */
export default function MeusPlanos({ socioId }: { socioId: string }) {
  const [planos, setPlanos] = useState<Plano[] | null>(null);
  const [aberto, setAberto] = useState<Plano | null>(null);
  const [pedidos, setPedidos] = useState<TipoDePlano[]>([]);
  const [aPedir, setAPedir] = useState<TipoDePlano | null>(null);

  useEffect(() => {
    carregarPlanos(socioId)
      .then(setPlanos)
      .catch(() => setPlanos([]));
  }, [socioId]);

  if (planos === null) return null;

  /** O mais recente de cada tipo. A lista vem do mais recente para trás. */
  const maisRecente = (tipo: TipoDePlano) => planos.find((p) => p.kind === tipo) || null;

  const pedir = async (tipo: TipoDePlano) => {
    setAPedir(tipo);
    try {
      await pedirPlano(socioId, tipo);
      setPedidos((p) => [...p, tipo]);
    } catch {
      // Sem rede, o pedido não saiu: não se diz que saiu
    } finally {
      setAPedir(null);
    }
  };

  const abrirFicheiro = (plano: Plano) => {
    const endereco = enderecoDaImagem(plano.file_url);
    if (endereco) Linking.openURL(endereco).catch(() => {});
  };

  return (
    <>
      <Vidro estilo={estilos.cartao}>
        <Text style={estilos.titulo}>Os teus planos</Text>

        {TIPOS.map(({ tipo, etiqueta, icone }) => {
          const plano = maisRecente(tipo);
          const pedido = pedidos.includes(tipo);
          return (
            <View key={tipo} style={estilos.linha}>
              <View style={estilos.linhaTexto}>
                <Text style={estilos.linhaTitulo}>
                  {icone}  {etiqueta}
                </Text>
                <Text style={estilos.linhaSub}>
                  {plano ? [plano.title, dataPt(plano.plan_date)].filter(Boolean).join(' · ') : 'Ainda não tens'}
                </Text>
              </View>

              {plano ? (
                <Pressable
                  style={({ pressed }) => [estilos.botao, pressed && estilos.premido]}
                  onPress={() => (plano.file_url ? abrirFicheiro(plano) : setAberto(plano))}
                >
                  <Text style={estilos.botaoTexto}>Ver</Text>
                </Pressable>
              ) : pedido ? (
                <Text style={estilos.pedido}>Pedido ✓</Text>
              ) : (
                <Pressable
                  style={({ pressed }) => [estilos.botao, pressed && estilos.premido]}
                  onPress={() => pedir(tipo)}
                  disabled={aPedir === tipo}
                >
                  <Text style={estilos.botaoTexto}>
                    {aPedir === tipo ? '…' : 'Pedir'}
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Quem já tem plano também pode querer outro */}
        {planos.length > 0 ? (
          <Pressable onPress={() => pedir('training')} disabled={pedidos.includes('training')}>
            <Text style={estilos.pedirNovo}>
              {pedidos.includes('training')
                ? 'O ginásio já sabe que queres um plano novo.'
                : 'Pedir um plano novo ao professor'}
            </Text>
          </Pressable>
        ) : null}
      </Vidro>

      {/* O plano escrito, quando não é um PDF */}
      <Modal visible={!!aberto} transparent animationType="slide" onRequestClose={() => setAberto(null)}>
        <View style={estilos.fundoModal}>
          <View style={estilos.janela}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.janelaConteudo}>
              {aberto ? (
                <>
                  <Text style={estilos.janelaTitulo}>{aberto.title}</Text>
                  <Text style={estilos.janelaSub}>{dataPt(aberto.plan_date)}</Text>
                  <Text style={estilos.janelaTexto}>{aberto.content}</Text>
                  {aberto.notes ? <Text style={estilos.janelaNotas}>{aberto.notes}</Text> : null}
                  <Pressable style={estilos.fechar} onPress={() => setAberto(null)}>
                    <Text style={estilos.fecharTexto}>Fechar</Text>
                  </Pressable>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: espaco.m, marginTop: espaco.m },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '800', marginBottom: espaco.s },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.s,
    paddingVertical: espaco.s,
  },
  linhaTexto: { flex: 1, minWidth: 0 },
  linhaTitulo: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  linhaSub: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  botao: {
    paddingHorizontal: espaco.m,
    paddingVertical: espaco.s,
    borderRadius: raio.redondo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.laranjaClaro,
    backgroundColor: 'rgba(232,132,42,0.14)',
  },
  premido: { opacity: 0.7 },
  botaoTexto: { color: cores.laranjaClaro, fontSize: 13, fontWeight: '700' },
  pedido: { color: cores.verde, fontSize: 13, fontWeight: '700' },
  pedirNovo: {
    color: cores.laranjaClaro,
    fontSize: 13,
    fontWeight: '700',
    marginTop: espaco.s,
  },

  fundoModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  janela: {
    backgroundColor: 'rgba(38,38,38,0.98)',
    borderTopLeftRadius: raio.xg,
    borderTopRightRadius: raio.xg,
    maxHeight: '88%',
    ...sombra.flutuante,
  },
  janelaConteudo: { padding: espaco.g },
  janelaTitulo: { color: cores.texto, fontSize: 22, fontWeight: '800' },
  janelaSub: { color: cores.textoSecundario, fontSize: 13, marginTop: 2, marginBottom: espaco.m },
  janelaTexto: { color: cores.texto, fontSize: 15, lineHeight: 24 },
  janelaNotas: {
    color: cores.textoSecundario,
    fontSize: 13,
    marginTop: espaco.m,
    fontStyle: 'italic',
  },
  fechar: { alignItems: 'center', paddingVertical: espaco.m, marginTop: espaco.m },
  fecharTexto: { color: cores.textoSecundario, fontSize: 15 },
});
