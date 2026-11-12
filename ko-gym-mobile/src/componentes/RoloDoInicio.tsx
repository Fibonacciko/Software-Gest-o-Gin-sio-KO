import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { carregarMultimedia, enderecoDaImagem, ItemMultimedia } from '../api';
import { Separador } from './BarraDeSeparadores';
import CartaoDeDestaque from './CartaoDeDestaque';
import { cores, espaco } from '../theme';

type Props = { aoIrPara: (separador: Separador) => void };

/**
 * O que há de novo no ginásio, por baixo do cartão do sócio.
 *
 * A página inicial era só o check-in: abria-se, carregava-se, fechava-se. São
 * três segundos, e depois não havia razão nenhuma para lá voltar. Daqui para
 * baixo há as fotografias do último treino, e o bloco leva a quem as tem
 * todas.
 *
 * **Não fica por cima do check-in**, fica por baixo: quem abre a aplicação à
 * porta do ginásio tem de ter o botão à mão sem procurar nada.
 *
 * **A loja e os parceiros saíram daqui** — por decisão do dono, depois de se
 * passar a mudar de ecrã deslizando o dedo. Com os seis ecrãs à distância de
 * um gesto, repetir a montra e os protocolos no fim do Início era dizer a
 * mesma coisa duas vezes e dar à página inicial um fim que não acabava. O
 * Início acaba no que é do sócio: os treinos, a evolução e os planos.
 */
export default function RoloDoInicio({ aoIrPara }: Props) {
  const [media, setMedia] = useState<ItemMultimedia[]>([]);

  useEffect(() => {
    // Falhar aqui não pode estragar o cartão do sócio, que é o que importa:
    // cai para uma lista vazia e o bloco simplesmente não aparece.
    carregarMultimedia()
      .then((x) => setMedia(x.filter((m) => m.kind === 'photo').slice(0, 2)))
      .catch(() => {});
  }, []);

  if (media.length === 0) return null;

  return (
    <View style={estilos.raiz}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>No ginásio</Text>
        <Pressable onPress={() => aoIrPara('multimedia')} hitSlop={10}>
          <Text style={estilos.verTudo}>Ver tudo</Text>
        </Pressable>
      </View>

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
});
