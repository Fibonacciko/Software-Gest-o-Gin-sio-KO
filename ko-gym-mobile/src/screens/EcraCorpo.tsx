import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avaliacao, carregarAvaliacoes } from '../api';
import GraficoDeEvolucao from '../componentes/GraficoDeEvolucao';
import Vidro from '../componentes/Vidro';
import { comVirgula } from '../lib/numeros';
import { cores, espaco, raio } from '../theme';

/**
 * As medidas, por ordem de importância, e para que lado é boa notícia.
 *
 * A primeira é o **peso**: é a única obrigatória na gestão, é a que toda a
 * gente percebe, e por isso é a que vai em grande no alto do ecrã.
 */
const MEDIDAS: {
  campo: keyof Avaliacao;
  etiqueta: string;
  unidade: string;
  melhorADescer: boolean;
}[] = [
  { campo: 'weight_kg', etiqueta: 'Peso', unidade: ' kg', melhorADescer: true },
  { campo: 'bmi', etiqueta: 'IMC', unidade: '', melhorADescer: true },
  { campo: 'body_fat_pct', etiqueta: 'Massa gorda', unidade: '%', melhorADescer: true },
  { campo: 'muscle_mass_kg', etiqueta: 'Massa muscular', unidade: ' kg', melhorADescer: false },
  { campo: 'water_pct', etiqueta: 'Água', unidade: '%', melhorADescer: false },
  { campo: 'visceral_fat', etiqueta: 'Gordura visceral', unidade: '', melhorADescer: true },
  { campo: 'metabolic_age', etiqueta: 'Idade metabólica', unidade: ' anos', melhorADescer: true },
];

const diaEMes = (iso?: string | null) => {
  if (!iso) return '';
  const [, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}`;
};

const temValor = (a: Avaliacao | null, campo: keyof Avaliacao) =>
  !!a && a[campo] !== null && a[campo] !== undefined && a[campo] !== '';

/**
 * O Corpo: o que a balança mediu, e como isso mudou.
 *
 * **Era um cartão apertado no meio do Início** e passou a ecrã seu, no lugar
 * que era das Fotos. A troca foi decisão do dono, e a razão foi esta: as
 * fotografias do ginásio são poucas e chegam de longe a longe, enquanto o
 * peso e a massa gorda mudam todos os meses e são do próprio sócio. Num
 * telemóvel há seis lugares na barra, e eles valem pelo que mostram quando
 * se lá chega.
 *
 * As medidas são lançadas na gestão, pelo colaborador, com a balança à
 * frente. **Aqui não há nada para o sócio escrever** — e por isso não há
 * nada que ele possa enganar.
 *
 * As fotografias não desapareceram: passaram a uma faixa no Início
 * (`FotosDoGinasio`), que é onde cabem bem — poucas, e sem ocuparem um
 * separador inteiro.
 */
export default function EcraCorpo({ socioId }: { socioId: string }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);

  const buscar = useCallback(async () => {
    try {
      setAvaliacoes(await carregarAvaliacoes(socioId));
    } catch {
      setAvaliacoes([]);
    }
  }, [socioId]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const atualizar = async () => {
    setAAtualizar(true);
    await buscar();
    setAAtualizar(false);
  };

  if (avaliacoes === null) {
    return (
      <View style={estilos.meio}>
        <ActivityIndicator color={cores.ouro} />
      </View>
    );
  }

  // A lista vem da mais antiga para a frente: a última é a mais recente
  const ultima = avaliacoes.length > 0 ? avaliacoes[avaliacoes.length - 1] : null;
  const anterior = avaliacoes.length > 1 ? avaliacoes[avaliacoes.length - 2] : null;

  /**
   * A diferença para a medição anterior, com a cor do lado certo: descer no
   * peso é boa notícia, descer na massa muscular não é.
   */
  const Diferenca = ({
    campo,
    melhorADescer,
    grande,
  }: {
    campo: keyof Avaliacao;
    melhorADescer: boolean;
    grande?: boolean;
  }) => {
    if (!anterior || !temValor(anterior, campo) || !temValor(ultima, campo)) return null;
    const delta = Number(ultima![campo]) - Number(anterior[campo]);
    if (Math.abs(delta) < 0.05) {
      return <Text style={[estilos.igual, grande && estilos.igualGrande]}>sem mudança</Text>;
    }
    const bom = melhorADescer ? delta < 0 : delta > 0;
    return (
      <Text
        style={[
          estilos.delta,
          grande && estilos.deltaGrande,
          { color: bom ? cores.verde : cores.vermelho },
        ]}
      >
        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1).replace('.', ',')}
        {grande ? ' desde a última' : ''}
      </Text>
    );
  };

  const rolo = (dentro: React.ReactNode) => (
    <ScrollView
      style={estilos.ecra}
      contentContainerStyle={estilos.conteudo}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.ouro} />
      }
    >
      <Text style={estilos.tituloDaPagina}>O teu corpo</Text>
      {dentro}
    </ScrollView>
  );

  // Ainda ninguém o mediu. É o que quase toda a gente vê no princípio, e por
  // isso diz o que é e o que fazer — e não "sem dados".
  if (!ultima) {
    return rolo(
      <Vidro estilo={estilos.vazio}>
        <Text style={estilos.vazioTitulo}>Ainda não há medições tuas</Text>
        <Text style={estilos.vazioTexto}>
          O ginásio tem uma balança que mede o peso, a massa gorda, a massa muscular e a
          água do corpo. Fala com o teu professor para fazeres a primeira medição — é
          rápida, e a partir daí vês aqui como vais mudando.
        </Text>
      </Vidro>
    );
  }

  const peso = MEDIDAS[0];
  const outras = MEDIDAS.slice(1).filter((m) => temValor(ultima, m.campo));
  const comHistorial = MEDIDAS.filter(
    (m) => avaliacoes.filter((a) => temValor(a, m.campo)).length > 1
  );

  return rolo(
    <>
      {/* O peso, em grande. É a medida que toda a gente percebe. */}
      <Vidro estilo={estilos.mostrador}>
        <Text style={estilos.mostradorEtiqueta}>{peso.etiqueta}</Text>
        <View style={estilos.mostradorLinha}>
          <Text style={estilos.mostradorValor}>{comVirgula(ultima.weight_kg)}</Text>
          <Text style={estilos.mostradorUnidade}>kg</Text>
        </View>
        <Diferenca campo="weight_kg" melhorADescer grande />
        <Text style={estilos.mostradorData}>
          medido a {diaEMes(ultima.assessment_date)} · {avaliacoes.length}{' '}
          {avaliacoes.length === 1 ? 'medição' : 'medições'}
        </Text>
      </Vidro>

      {outras.length > 0 ? (
        <View style={estilos.grelha}>
          {outras.map((m) => (
            <View key={String(m.campo)} style={estilos.celula}>
              <Vidro estilo={estilos.medida}>
                <Text style={estilos.medidaEtiqueta}>{m.etiqueta}</Text>
                <Text style={estilos.medidaValor}>
                  {comVirgula(ultima[m.campo] as number)}
                  {m.unidade}
                </Text>
                <Diferenca campo={m.campo} melhorADescer={m.melhorADescer} />
              </Vidro>
            </View>
          ))}
        </View>
      ) : null}

      {comHistorial.length > 0 ? (
        <>
          <Text style={estilos.seccao}>Como tem mudado</Text>
          {comHistorial.map((m) => {
            const pontos = avaliacoes
              .filter((a) => temValor(a, m.campo))
              .slice(-6) // seis chegam: mais não cabe na largura de um telemóvel
              .map((a) => ({
                valor: Number(a[m.campo]),
                rotulo: diaEMes(a.assessment_date),
              }));
            return (
              <Vidro key={String(m.campo)} estilo={estilos.bloco}>
                <Text style={estilos.blocoTitulo}>
                  {m.etiqueta}
                  {m.unidade ? ` (${m.unidade.trim()})` : ''}
                </Text>
                <GraficoDeEvolucao
                  pontos={pontos}
                  unidade={m.unidade}
                  melhorADescer={m.melhorADescer}
                />
              </Vidro>
            );
          })}
        </>
      ) : (
        <Text style={estilos.nota}>
          Com uma segunda medição começas a ver aqui a linha da tua evolução.
        </Text>
      )}

      <Text style={estilos.nota}>
        As medições são feitas no ginásio, com a balança. Fala com o teu professor para
        marcar a próxima.
      </Text>
    </>
  );
}

const estilos = StyleSheet.create({
  ecra: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },
  meio: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tituloDaPagina: {
    color: cores.texto,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: espaco.m,
  },

  mostrador: { padding: espaco.g, alignItems: 'center' },
  mostradorEtiqueta: {
    color: cores.textoSecundario,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  mostradorLinha: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: espaco.xs },
  mostradorValor: { color: cores.texto, fontSize: 56, fontWeight: '800', lineHeight: 60 },
  mostradorUnidade: { color: cores.textoSecundario, fontSize: 20, fontWeight: '700' },
  mostradorData: { color: cores.textoSecundario, fontSize: 12, marginTop: espaco.s },

  grelha: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espaco.m, marginHorizontal: -4 },
  celula: { width: '50%', paddingHorizontal: 4, paddingBottom: espaco.s },
  medida: { padding: espaco.m, minHeight: 92 },
  medidaEtiqueta: { color: cores.textoSecundario, fontSize: 12 },
  medidaValor: { color: cores.texto, fontSize: 24, fontWeight: '800', marginTop: 2 },

  delta: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  deltaGrande: { fontSize: 14, marginTop: espaco.xs },
  igual: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  igualGrande: { fontSize: 14, marginTop: espaco.xs },

  seccao: {
    color: cores.texto,
    fontSize: 18,
    fontWeight: '800',
    marginTop: espaco.g,
    marginBottom: espaco.s,
  },
  bloco: { padding: espaco.m, marginBottom: espaco.s },
  blocoTitulo: { color: cores.texto, fontSize: 15, fontWeight: '700', marginBottom: espaco.s },

  vazio: { padding: espaco.g, borderRadius: raio.g },
  vazioTitulo: { color: cores.texto, fontSize: 18, fontWeight: '800', marginBottom: espaco.s },
  vazioTexto: { color: cores.textoSecundario, fontSize: 14, lineHeight: 21 },

  nota: {
    color: cores.textoSecundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: espaco.g,
    textAlign: 'center',
  },
});
