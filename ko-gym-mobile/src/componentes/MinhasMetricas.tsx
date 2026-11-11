import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avaliacao, carregarAvaliacoes } from '../api';
import GraficoDeEvolucao from './GraficoDeEvolucao';
import Vidro from './Vidro';
import { cores, espaco, raio, sombra } from '../theme';

/** As medidas que se mostram, por ordem de importância. */
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

/**
 * A evolução do sócio: o que a balança mediu, ao longo do tempo.
 *
 * As medidas são lançadas na gestão, pelo colaborador, depois de usar a
 * balança. A aplicação só as mostra — não há nada aqui para o sócio escrever,
 * e por isso nada que ele possa enganar.
 *
 * O cartão mostra a última medição; tocar abre o historial com os gráficos.
 */
export default function MinhasMetricas({ socioId }: { socioId: string }) {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    carregarAvaliacoes(socioId)
      .then(setAvaliacoes)
      .catch(() => setAvaliacoes([]));
  }, [socioId]);

  // Sem medições não há nada a dizer, e um cartão vazio só confunde
  if (avaliacoes.length === 0) return null;

  // A lista vem da mais antiga para a frente: a última é a mais recente
  const ultima = avaliacoes[avaliacoes.length - 1];
  const anterior = avaliacoes.length > 1 ? avaliacoes[avaliacoes.length - 2] : null;

  const temValor = (a: Avaliacao, campo: keyof Avaliacao) =>
    a[campo] !== null && a[campo] !== undefined;

  const destaques = MEDIDAS.filter((m) => temValor(ultima, m.campo)).slice(0, 4);

  const Diferenca = ({ campo, melhorADescer }: { campo: keyof Avaliacao; melhorADescer: boolean }) => {
    if (!anterior || !temValor(anterior, campo)) return null;
    const delta = Number(ultima[campo]) - Number(anterior[campo]);
    if (Math.abs(delta) < 0.05) return <Text style={estilos.igual}>=</Text>;
    const bom = melhorADescer ? delta < 0 : delta > 0;
    return (
      <Text style={[estilos.delta, { color: bom ? cores.verde : cores.vermelho }]}>
        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
      </Text>
    );
  };

  return (
    <>
      <Pressable onPress={() => setAberto(true)} style={estilos.espaco}>
        <Vidro estilo={estilos.cartao}>
          <View style={estilos.cabecalho}>
            <Text style={estilos.titulo}>A tua evolução</Text>
            <Text style={estilos.data}>{diaEMes(ultima.assessment_date)}</Text>
          </View>

          <View style={estilos.grelha}>
            {destaques.map((m) => (
              <View key={String(m.campo)} style={estilos.medida}>
                <Text style={estilos.medidaEtiqueta}>{m.etiqueta}</Text>
                <View style={estilos.medidaLinha}>
                  <Text style={estilos.medidaValor}>
                    {ultima[m.campo]}
                    {m.unidade}
                  </Text>
                  <Diferenca campo={m.campo} melhorADescer={m.melhorADescer} />
                </View>
              </View>
            ))}
          </View>

          <Text style={estilos.abrir}>
            {avaliacoes.length > 1 ? 'Ver o historial e os gráficos' : 'Ver a medição'}
          </Text>
        </Vidro>
      </Pressable>

      <Modal visible={aberto} transparent animationType="slide" onRequestClose={() => setAberto(false)}>
        <View style={estilos.fundoModal}>
          <View style={estilos.janela}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={estilos.janelaConteudo}>
              <Text style={estilos.janelaTitulo}>A tua evolução</Text>
              <Text style={estilos.janelaSub}>
                {avaliacoes.length} {avaliacoes.length === 1 ? 'medição' : 'medições'} · a última a{' '}
                {diaEMes(ultima.assessment_date)}
              </Text>

              {MEDIDAS.filter((m) => avaliacoes.some((a) => temValor(a, m.campo))).map((m) => {
                const pontos = avaliacoes
                  .filter((a) => temValor(a, m.campo))
                  .slice(-6) // seis medições chegam: mais não cabe no ecrã
                  .map((a) => ({
                    valor: Number(a[m.campo]),
                    rotulo: diaEMes(a.assessment_date),
                  }));
                return (
                  <View key={String(m.campo)} style={estilos.bloco}>
                    <Text style={estilos.blocoTitulo}>
                      {m.etiqueta}
                      {m.unidade ? ` (${m.unidade.trim()})` : ''}
                    </Text>
                    <GraficoDeEvolucao
                      pontos={pontos}
                      unidade={m.unidade}
                      melhorADescer={m.melhorADescer}
                    />
                  </View>
                );
              })}

              <Text style={estilos.nota}>
                As medições são feitas no ginásio. Fala com o teu professor para marcar a
                próxima.
              </Text>

              <Pressable style={estilos.fechar} onPress={() => setAberto(false)}>
                <Text style={estilos.fecharTexto}>Fechar</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  espaco: { marginTop: espaco.m },
  cartao: { padding: espaco.m },
  cabecalho: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '800' },
  data: { color: cores.textoSecundario, fontSize: 12 },
  grelha: { flexDirection: 'row', flexWrap: 'wrap', marginTop: espaco.s },
  medida: { width: '50%', paddingVertical: espaco.xs, paddingRight: espaco.s },
  medidaEtiqueta: { color: cores.textoSecundario, fontSize: 11 },
  medidaLinha: { flexDirection: 'row', alignItems: 'baseline', gap: espaco.xs },
  medidaValor: { color: cores.texto, fontSize: 18, fontWeight: '800' },
  delta: { fontSize: 11, fontWeight: '700' },
  igual: { color: cores.textoSecundario, fontSize: 11 },
  abrir: { color: cores.laranjaClaro, fontSize: 13, fontWeight: '700', marginTop: espaco.s },

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
  janelaSub: { color: cores.textoSecundario, fontSize: 13, marginTop: 2 },
  bloco: { marginTop: espaco.g },
  blocoTitulo: { color: cores.texto, fontSize: 15, fontWeight: '700', marginBottom: espaco.s },
  nota: {
    color: cores.textoSecundario,
    fontSize: 12,
    marginTop: espaco.g,
    textAlign: 'center',
    lineHeight: 18,
  },
  fechar: { alignItems: 'center', paddingVertical: espaco.m, marginTop: espaco.s },
  fecharTexto: { color: cores.textoSecundario, fontSize: 15 },
});
