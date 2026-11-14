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
import { estadoDeHoje, lerHorario, NOME_DO_DIA } from '../lib/horario';
import Vidro from '../componentes/Vidro';
import { cores, espaco, raio } from '../theme';

const GOOGLE = require('../../assets/google.png');

const abrir = (endereco?: string | null) => {
  if (!endereco) return;
  Linking.openURL(endereco).catch(() => {});
};

/**
 * O endereco do mapa, venha ele como link ou como morada escrita.
 *
 * No campo "Google Maps" da ficha esta hoje uma morada — `R. Almada
 * Negreiros, 1800-070 Lisboa` — e nao um link. O botao chamava o
 * `Linking.openURL` com aquilo, falhava em silencio, e ficava um botao que
 * nao fazia nada. Agora o que nao for link vai como procura no Maps.
 */
const enderecoDoMapa = (valor?: string | null) => {
  if (!valor || !valor.trim()) return null;
  const limpo = valor.trim();
  if (/^(https?:|geo:|maps:)/i.test(limpo)) return limpo;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(limpo)}`;
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
  // Largura a dividir pela altura da imagem da ficha. Decide se o que la esta
  // e uma fotografia larga do ginasio ou um logotipo quadrado.
  const [proporcao, setProporcao] = useState<number | null>(null);

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

  // Mede a imagem da ficha. Enquanto nao se sabe o tamanho, nao se mostra
  // nada: mostrar um logotipo esticado e pior do que esperar meio segundo.
  useEffect(() => {
    const url = enderecoDaImagem(ficha?.photo_url);
    if (!url) {
      setProporcao(null);
      return;
    }
    Image.getSize(
      url,
      (largura, altura) => setProporcao(altura ? largura / altura : 1),
      () => setProporcao(2) // nao deu para medir: trata-se como fotografia
    );
  }, [ficha?.photo_url]);

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
  const horario = lerHorario(ficha.hours);
  const estado = estadoDeHoje(horario);
  const diaDeHoje = new Date().getDay();
  const mapa = enderecoDoMapa(ficha.maps_url) || enderecoDoMapa(ficha.address);
  // Um quadrado e um logotipo; algo bem mais largo e uma fotografia do ginasio
  const eLogotipo = proporcao !== null && proporcao < 1.3;
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
    cheio,
    aoTocar,
  }: {
    texto: string;
    destaque?: boolean;
    /** Largura inteira. Os botões de acção são dois por linha; este não. */
    cheio?: boolean;
    aoTocar: () => void;
  }) => (
    <Pressable
      style={({ pressed }) => [
        estilos.botao,
        cheio && estilos.botaoCheio,
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
      {foto && proporcao !== null ? (
        eLogotipo ? (
          <View style={estilos.molduraLogotipo}>
            <Image source={{ uri: foto }} style={estilos.logotipo} resizeMode="contain" />
          </View>
        ) : (
          <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" />
        )
      ) : null}

      {/* O nome ao centro, debaixo do logótipo: é a capa da página. */}
      <Text style={estilos.titulo}>{ficha.name || 'Ginásio KO'}</Text>

      {/* A única coisa viva numa página de informação parada: está aberto? */}
      {estado ? (
        <View style={[estilos.selo, estado.aberto ? estilos.seloAberto : estilos.seloFechado]}>
          <View style={[estilos.pinta, estado.aberto ? estilos.pintaAberta : estilos.pintaFechada]} />
          <Text style={[estilos.seloTexto, estado.aberto && estilos.seloTextoAberto]}>
            {estado.texto}
          </Text>
        </View>
      ) : null}

      {ficha.about ? <Text style={estilos.sobre}>{ficha.about}</Text> : null}

      {/* Deixar uma avaliação: é o que mais ajuda o ginásio, por isso vem primeiro */}
      {ficha.review_url ? (
        <View style={estilos.destaque}>
          <View style={estilos.destaqueTopo}>
            {/* O "G" oficial da Google. Está aqui para se perceber de relance
                onde é que a avaliação vai parar — é o que a própria Google
                pede a quem lhe aponta para as avaliações. */}
            <Image source={GOOGLE} style={estilos.google} resizeMode="contain" />
            <View style={estilos.destaqueTextos}>
              <Text style={estilos.destaqueTitulo}>Gostas de treinar aqui?</Text>
              <Text style={estilos.destaqueTexto}>
                Uma avaliação no Google demora um minuto e ajuda-nos bastante.
              </Text>
            </View>
          </View>
          <Botao texto="★  DEIXAR UMA AVALIAÇÃO" destaque cheio aoTocar={() => abrir(ficha.review_url)} />
        </View>
      ) : null}

      {/* O horário, uma linha por conjunto de dias, com o de hoje aceso. Era
          um parágrafo corrido onde não se encontrava nada. */}
      {horario.length > 0 ? (
        <Vidro estilo={estilos.cartao}>
          <Text style={estilos.cartaoTitulo}>Horário</Text>
          {horario.map((linha, i) => {
            const eHoje = linha.numeros.includes(diaDeHoje);
            return (
              <View key={i} style={[estilos.diaLinha, eHoje && estilos.diaHoje]}>
                <View style={estilos.diaNomes}>
                  <Text style={[estilos.diaTexto, eHoje && estilos.diaTextoHoje]}>{linha.dias}</Text>
                  {eHoje ? <Text style={estilos.hojeEtiqueta}>HOJE</Text> : null}
                </View>
                <View>
                  {linha.periodos.length > 0 ? (
                    linha.periodos.map((p) => (
                      <Text
                        key={p.texto}
                        style={[estilos.diaHoras, eHoje && estilos.diaTextoHoje]}
                      >
                        {p.texto}
                      </Text>
                    ))
                  ) : (
                    <Text style={estilos.diaHoras}>—</Text>
                  )}
                </View>
              </View>
            );
          })}
        </Vidro>
      ) : null}

      <Vidro estilo={estilos.cartao}>
        <Linha etiqueta="Morada" valor={ficha.address} />
        <Linha etiqueta="Telefone" valor={ficha.phone} />
        <Linha etiqueta="Email" valor={ficha.email} />

        {!ficha.address && !ficha.phone && !ficha.email ? (
          <Text style={estilos.vazio}>
            Os contactos do ginásio aparecem aqui assim que forem preenchidos.
          </Text>
        ) : null}
      </Vidro>

      {/* Duas por linha: seis botões de largura inteira davam uma escada que
          não acabava, e nenhum deles se destacava. */}
      <View style={estilos.accoes}>
        {mapa ? <Botao texto="Como chegar" aoTocar={() => abrir(mapa)} /> : null}
        {ficha.phone ? (
          <Botao texto="Ligar" aoTocar={() => abrir(`tel:${ficha.phone}`)} />
        ) : null}
        {whatsapp ? <Botao texto="WhatsApp" aoTocar={() => abrir(whatsapp)} /> : null}
        {ficha.email ? (
          <Botao texto="Email" aoTocar={() => abrir(`mailto:${ficha.email}`)} />
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
    borderRadius: raio.g,
    backgroundColor: cores.fundoElevado,
    marginBottom: espaco.m,
  },
  // O logotipo nao enche a largura: fica ao centro, do tamanho que lhe assenta
  molduraLogotipo: { alignItems: 'center', marginBottom: espaco.m },
  logotipo: { width: 150, height: 150 },
  titulo: { color: cores.texto, fontSize: 28, fontWeight: '800', textAlign: 'center' },
  sobre: {
    color: cores.textoSecundario,
    fontSize: 14,
    marginTop: espaco.m,
    lineHeight: 21,
    textAlign: 'center',
  },

  // O selo de aberto/fechado, ao centro por baixo do nome
  selo: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    marginTop: espaco.s,
    paddingVertical: 6,
    paddingHorizontal: espaco.m,
    borderRadius: raio.redondo,
    borderWidth: 1,
  },
  seloAberto: { backgroundColor: 'rgba(34,197,94,0.14)', borderColor: 'rgba(34,197,94,0.5)' },
  seloFechado: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: cores.vidroBordo },
  pinta: { width: 8, height: 8, borderRadius: 4 },
  pintaAberta: { backgroundColor: '#22c55e' },
  pintaFechada: { backgroundColor: cores.textoSecundario },
  seloTexto: { color: cores.textoSecundario, fontSize: 13, fontWeight: '700' },
  seloTextoAberto: { color: '#4ade80' },

  // O horário, dia a dia
  cartaoTitulo: {
    color: cores.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: espaco.s,
  },
  diaLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espaco.m,
    paddingVertical: espaco.s,
    paddingHorizontal: espaco.s,
    borderRadius: raio.m,
  },
  diaHoje: { backgroundColor: 'rgba(245,166,35,0.10)' },
  diaNomes: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaco.s, flexWrap: 'wrap' },
  diaTexto: { color: cores.texto, fontSize: 15 },
  diaTextoHoje: { color: cores.dourado, fontWeight: '700' },
  hojeEtiqueta: {
    color: '#1A1A1A',
    backgroundColor: cores.dourado,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: raio.redondo,
    overflow: 'hidden',
  },
  diaHoras: { color: cores.textoSecundario, fontSize: 15, textAlign: 'right' },
  destaque: {
    backgroundColor: 'rgba(245,166,35,0.12)',
    borderWidth: 1,
    borderColor: cores.dourado,
    borderRadius: raio.g,
    padding: espaco.m,
    marginTop: espaco.g,
  },
  destaqueTopo: { flexDirection: 'row', alignItems: 'center', gap: espaco.m, marginBottom: espaco.m },
  destaqueTextos: { flex: 1 },
  google: { width: 28, height: 28 },
  destaqueTitulo: { color: cores.texto, fontSize: 17, fontWeight: '800' },
  destaqueTexto: { color: cores.textoSecundario, fontSize: 13, marginTop: 4 },
  cartao: { padding: espaco.m, marginTop: espaco.m },
  linha: { paddingVertical: espaco.s },
  linhaEtiqueta: { color: cores.textoSecundario, fontSize: 12 },
  linhaValor: { color: cores.texto, fontSize: 16, marginTop: 2 },
  vazio: { color: cores.textoSecundario, fontSize: 14, textAlign: 'center', paddingVertical: espaco.m },
  accoes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espaco.s,
    marginTop: espaco.m,
  },
  botao: {
    // Dois por linha: metade da largura, menos a metade do espaço entre eles
    flexGrow: 1,
    flexBasis: '47%',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.m,
    paddingVertical: espaco.m,
    alignItems: 'center',
    backgroundColor: 'rgba(58,58,58,0.6)',
  },
  botaoCheio: { flexGrow: 0, flexBasis: 'auto', alignSelf: 'stretch' },
  botaoDestaque: { backgroundColor: cores.dourado, borderColor: cores.dourado },
  botaoTexto: { color: cores.texto, fontSize: 15, fontWeight: '600' },
  botaoTextoDestaque: { color: '#1A1A1A', fontWeight: '800', letterSpacing: 0.5 },
});
