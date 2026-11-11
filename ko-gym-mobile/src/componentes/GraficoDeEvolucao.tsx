import { StyleSheet, Text, View } from 'react-native';
import { cores, espaco, raio } from '../theme';

type Ponto = { valor: number; rotulo: string };

type Props = {
  pontos: Ponto[];
  unidade?: string;
  /** Para que lado é que descer é boa notícia. */
  melhorADescer?: boolean;
  altura?: number;
};

/**
 * Uma linha de evolução, feita de barras.
 *
 * **Barras e não uma linha** de propósito: desenhar uma linha a sério pedia
 * uma biblioteca de gráficos — mais uns megabytes e uma peça do motor, que
 * depois obrigava a instalar a aplicação de novo a cada afinação. Barras
 * fazem-se com `View`, chegam pelo ar como tudo o resto, e dizem a mesma
 * coisa: para onde é que aquilo está a ir.
 *
 * A escala não começa no zero. Num sócio que anda entre os 80 e os 84 quilos,
 * um gráfico desde o zero dava quatro barras do mesmo tamanho e não se via
 * nada. Começa um pouco abaixo do mínimo e acaba um pouco acima do máximo.
 */
export default function GraficoDeEvolucao({
  pontos,
  unidade = '',
  melhorADescer = true,
  altura = 120,
}: Props) {
  if (pontos.length === 0) return null;

  const valores = pontos.map((p) => p.valor);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const margem = Math.max((maximo - minimo) * 0.25, 0.5);
  const chao = minimo - margem;
  const tecto = maximo + margem;

  const primeiro = valores[0];
  const ultimo = valores[valores.length - 1];
  const delta = ultimo - primeiro;
  const melhorou = melhorADescer ? delta < 0 : delta > 0;

  return (
    <View>
      <View style={[estilos.grafico, { height: altura }]}>
        {pontos.map((p, i) => {
          const fracao = (p.valor - chao) / (tecto - chao);
          const ultimaBarra = i === pontos.length - 1;
          return (
            <View key={`${p.rotulo}-${i}`} style={estilos.coluna}>
              <Text style={[estilos.valor, ultimaBarra && estilos.valorActual]}>
                {p.valor}
              </Text>
              <View
                style={[
                  estilos.barra,
                  {
                    height: Math.max(6, fracao * (altura - 34)),
                    backgroundColor: ultimaBarra ? cores.laranjaClaro : 'rgba(232,132,42,0.35)',
                  },
                ]}
              />
              <Text style={estilos.rotulo} numberOfLines={1}>
                {p.rotulo}
              </Text>
            </View>
          );
        })}
      </View>

      {pontos.length > 1 ? (
        <Text style={[estilos.resumo, { color: melhorou ? cores.verde : cores.textoSecundario }]}>
          {delta === 0
            ? 'Na mesma desde a primeira medição'
            : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}${unidade} desde a primeira medição`}
        </Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  grafico: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: espaco.xs,
  },
  coluna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barra: { width: '70%', borderRadius: raio.s, minWidth: 10 },
  valor: { color: cores.textoSecundario, fontSize: 10, marginBottom: 3 },
  valorActual: { color: cores.texto, fontWeight: '800' },
  rotulo: { color: cores.textoSecundario, fontSize: 9, marginTop: 4 },
  resumo: { fontSize: 12, textAlign: 'center', marginTop: espaco.s, fontWeight: '600' },
});
