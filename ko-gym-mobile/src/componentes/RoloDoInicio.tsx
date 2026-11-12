import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Artigo,
  carregarMontra,
  carregarMultimedia,
  carregarParceiros,
  enderecoDaImagem,
  ItemMultimedia,
  Parceiro,
} from '../api';
import { Separador } from './BarraDeSeparadores';
import CartaoDeDestaque from './CartaoDeDestaque';
import Vidro from './Vidro';
import { cores, espaco } from '../theme';

type Props = { aoIrPara: (separador: Separador) => void };

/**
 * O que há de novo no ginásio, por baixo do cartão do sócio.
 *
 * A página inicial era só o check-in: abria-se, carregava-se, fechava-se. São
 * três segundos, e depois não havia razão nenhuma para lá voltar. Daqui para
 * baixo há sempre qualquer coisa — fotografias do último treino, artigos novos
 * na loja, vantagens dos parceiros — e cada bloco leva a quem o tem todo.
 *
 * **Não fica por cima do check-in**, fica por baixo: quem abre a aplicação à
 * porta do ginásio tem de ter o botão à mão sem procurar nada.
 */
export default function RoloDoInicio({ aoIrPara }: Props) {
  const [media, setMedia] = useState<ItemMultimedia[]>([]);
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  useEffect(() => {
    // Falhar aqui não pode estragar o cartão do sócio, que é o que importa:
    // cada um cai para uma lista vazia e o bloco simplesmente não aparece.
    carregarMultimedia()
      .then((x) => setMedia(x.filter((m) => m.kind === 'photo').slice(0, 2)))
      .catch(() => {});
    carregarMontra()
      .then((x) => setArtigos(x.slice(0, 2)))
      .catch(() => {});
    carregarParceiros()
      .then((x) => setParceiros(x.slice(0, 1)))
      .catch(() => {});
  }, []);

  if (media.length === 0 && artigos.length === 0 && parceiros.length === 0) return null;

  const Titulo = ({ texto, separador }: { texto: string; separador: Separador }) => (
    <View style={estilos.cabecalho}>
      <Text style={estilos.titulo}>{texto}</Text>
      <Pressable onPress={() => aoIrPara(separador)} hitSlop={10}>
        <Text style={estilos.verTudo}>Ver tudo</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={estilos.raiz}>
      {media.length > 0 ? (
        <>
          <Titulo texto="No ginásio" separador="multimedia" />
          {media.map((m) => (
            <View key={m.id} style={estilos.item}>
              <CartaoDeDestaque
                imagem={enderecoDaImagem(m.url)}
                titulo={m.caption || 'Treino no Ginásio KO'}
                altura={220}
                aoTocar={() => aoIrPara('multimedia')}
              />
            </View>
          ))}
        </>
      ) : null}

      {artigos.length > 0 ? (
        <>
          <Titulo texto="Na loja" separador="loja" />
          {artigos.map((a) => (
            <View key={a.id} style={estilos.item}>
              <CartaoDeDestaque
                imagem={enderecoDaImagem(a.photo_url)}
                // As fotografias deslizam aqui como na Loja: quem está na
                // página inicial vê o artigo por mais do que um lado sem ter
                // de ir a lado nenhum.
                imagens={(a.media || [])
                  .filter((m) => m.kind === 'photo')
                  .map((m) => enderecoDaImagem(m.url))}
                titulo={a.name}
                subtitulo={a.color}
                selo={`${a.price.toFixed(2)} €`}
                altura={200}
                aoTocar={() => aoIrPara('loja')}
              />
            </View>
          ))}
        </>
      ) : null}

      {parceiros.length > 0 ? (
        <>
          <Titulo texto="Vantagens para sócios" separador="parceiros" />
          {parceiros.map((p) => (
            <Pressable key={p.id} onPress={() => aoIrPara('parceiros')} style={estilos.item}>
              <Vidro estilo={estilos.parceiro}>
                <Text style={estilos.parceiroNome} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={estilos.parceiroVantagem} numberOfLines={2}>
                  {p.benefit}
                </Text>
              </Vidro>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { marginTop: espaco.g },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: espaco.m,
    marginBottom: espaco.s,
  },
  titulo: { color: cores.texto, fontSize: 18, fontWeight: '800' },
  verTudo: { color: cores.laranjaClaro, fontSize: 13, fontWeight: '700' },
  item: { marginBottom: espaco.s },
  parceiro: { padding: espaco.m },
  parceiroNome: { color: cores.texto, fontSize: 16, fontWeight: '700' },
  parceiroVantagem: { color: cores.dourado, fontSize: 14, marginTop: 2 },
});
