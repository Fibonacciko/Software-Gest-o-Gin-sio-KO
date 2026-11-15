import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { carregarPagamentos, Pagamento } from '../api';
import { dataPt } from '../lib/datas';
import Vidro from './Vidro';
import { cores, espaco, raio } from '../theme';

/** O que cada tipo de pagamento é, por palavras do ginásio. */
const TIPOS: Record<string, string> = {
  quota: 'Quota mensal',
  seguro: 'Seguro anual',
  quota_seguro: 'Quota + Seguro',
};

/** Como foi pago. O servidor guarda em inglês, de origem. */
const METODOS: Record<string, string> = {
  cash: 'Numerário',
  card: 'Multibanco',
  transfer: 'Transferência',
  mbway: 'MB Way',
};

/** Quantos se veem sem abrir a janela. */
const NO_CARTAO = 3;

const euros = (v: number) => `${v.toFixed(2).replace('.', ',')} €`;

/**
 * O que o sócio pagou ao ginásio.
 *
 * É a pergunta que mais se ouve ao balcão — "já paguei este mês?" — e a
 * resposta estava só na gestão. Aqui ele vê-a sozinho.
 *
 * **Não é uma fatura.** É o historial do que ficou registado quando pagou,
 * e por isso não traz número de documento nem se parece com um documento
 * fiscal: em Portugal uma fatura tem de sair de software certificado pela
 * AT, e este não é. Quando o ginásio passar a emitir faturas por um programa
 * certificado, é aqui que o PDF de cada uma vai aparecer, ao lado da linha.
 *
 * O cartão **só aparece a quem tem pagamentos**: a um sócio que acabou de se
 * inscrever, uma caixa vazia não diz nada.
 */
export default function MeusPagamentos({ socioId }: { socioId: string }) {
  const [pagamentos, setPagamentos] = useState<Pagamento[] | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    carregarPagamentos(socioId)
      .then(setPagamentos)
      .catch(() => setPagamentos([]));
  }, [socioId]);

  if (!pagamentos || pagamentos.length === 0) return null;

  const linha = (p: Pagamento) => (
    <View key={p.id} style={estilos.linha}>
      <View style={estilos.esquerda}>
        <Text style={estilos.quando}>{dataPt(p.payment_date)}</Text>
        <Text style={estilos.oQue} numberOfLines={1}>
          {TIPOS[p.payment_type] ?? p.payment_type}
          {METODOS[p.payment_method] ? ` · ${METODOS[p.payment_method]}` : ''}
        </Text>
      </View>
      <Text style={estilos.valor}>{euros(p.amount)}</Text>
    </View>
  );

  const total = pagamentos.reduce((soma, p) => soma + p.amount, 0);

  return (
    <>
      <Vidro estilo={estilos.cartao}>
        <Text style={estilos.titulo}>Os teus pagamentos</Text>
        {pagamentos.slice(0, NO_CARTAO).map(linha)}
        {pagamentos.length > NO_CARTAO ? (
          <Pressable onPress={() => setAberto(true)}>
            <Text style={estilos.verTodos}>
              Ver os {pagamentos.length} pagamentos
            </Text>
          </Pressable>
        ) : null}
      </Vidro>

      <Modal visible={aberto} animationType="slide" transparent onRequestClose={() => setAberto(false)}>
        <View style={estilos.fundoJanela}>
          <View style={estilos.janela}>
            <Text style={estilos.janelaTitulo}>Os teus pagamentos</Text>
            <Text style={estilos.janelaSub}>
              {pagamentos.length} pagamentos · {euros(total)} no total
            </Text>
            <ScrollView>
              {pagamentos.map(linha)}
              <Text style={estilos.rodape}>
                Isto é o teu historial, não é uma fatura. Para faturas, fala na receção.
              </Text>
            </ScrollView>
            <Pressable style={estilos.fechar} onPress={() => setAberto(false)}>
              <Text style={estilos.fecharTexto}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  cartao: { padding: espaco.m, marginTop: espaco.m },
  titulo: { color: cores.texto, fontSize: 16, fontWeight: '800', marginBottom: espaco.xs },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    paddingVertical: espaco.s,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  esquerda: { flex: 1, minWidth: 0 },
  quando: { color: cores.texto, fontSize: 15, fontWeight: '700' },
  oQue: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },
  // Em ouro, como os preços da loja: é um valor, não uma acção
  valor: { color: cores.ouro, fontSize: 16, fontWeight: '800' },
  verTodos: {
    color: cores.ouro,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: espaco.m,
  },

  fundoJanela: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  janela: {
    backgroundColor: cores.fundoCartao,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: espaco.g,
    maxHeight: '80%',
  },
  janelaTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800' },
  janelaSub: { color: cores.textoSecundario, fontSize: 13, marginBottom: espaco.s },
  rodape: {
    color: cores.textoSecundario,
    fontSize: 12,
    lineHeight: 18,
    marginTop: espaco.m,
    textAlign: 'center',
  },
  fechar: { alignItems: 'center', paddingVertical: espaco.m, marginTop: espaco.s },
  fecharTexto: { color: cores.ouro, fontWeight: '700' },
});
