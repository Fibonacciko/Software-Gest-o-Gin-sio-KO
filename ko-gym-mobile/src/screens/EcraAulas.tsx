import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Aula, carregarAulas, desmarcarAula, marcarAula, Socio } from '../api';
import Vidro from '../componentes/Vidro';
import { cores, espaco, raio } from '../theme';

type Props = { socio: Socio };

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** O dia por extenso, sem passar por `new Date(texto)`, que recua um dia cá. */
const rotuloDoDia = (iso: string) => {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  const d = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  const igual = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (igual(d, hoje)) return 'Hoje';
  if (igual(d, amanha)) return 'Amanhã';
  return `${DIAS[d.getDay()]}, ${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
};

/**
 * As aulas dos próximos dias, e o que o sócio tem marcado.
 *
 * As aulas cheias não desaparecem: mostram-se com a lista de espera, porque
 * desistências há sempre e quem espera sobe sozinho.
 */
export default function EcraAulas({ socio }: Props) {
  const [aulas, setAulas] = useState<Aula[] | null>(null);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [aMexer, setAMexer] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    try {
      setErro(null);
      setAulas(await carregarAulas(socio.id, 14));
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui falar com o ginásio.'));
      setAulas([]);
    }
  }, [socio.id]);

  useEffect(() => {
    buscar();
  }, [buscar]);

  const atualizar = async () => {
    setAAtualizar(true);
    await buscar();
    setAAtualizar(false);
  };

  const chave = (a: Aula) => `${a.slot_id}-${a.class_date.slice(0, 10)}`;

  const marcar = async (a: Aula) => {
    setAMexer(chave(a));
    setErro(null);
    try {
      await marcarAula(socio.id, a.slot_id, a.class_date.slice(0, 10));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await buscar();
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui marcar.'));
    } finally {
      setAMexer(null);
    }
  };

  const desmarcar = async (a: Aula) => {
    if (!a.my_booking_id) return;
    setAMexer(chave(a));
    setErro(null);
    try {
      await desmarcarAula(a.my_booking_id);
      await buscar();
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não consegui desmarcar.'));
    } finally {
      setAMexer(null);
    }
  };

  if (aulas === null) {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={cores.laranjaClaro} />
      </View>
    );
  }

  // As aulas vêm por data e hora; agrupam-se por dia para dar os títulos
  const porDia: [string, Aula[]][] = [];
  aulas.forEach((a) => {
    const dia = a.class_date.slice(0, 10);
    const ultimo = porDia[porDia.length - 1];
    if (ultimo && ultimo[0] === dia) ultimo[1].push(a);
    else porDia.push([dia, [a]]);
  });

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      <Text style={estilos.titulo}>Aulas</Text>
      <Text style={estilos.subtitulo}>Marca o teu lugar nos próximos dias.</Text>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      {aulas.length === 0 ? (
        <Vidro estilo={estilos.vazio}>
          <Text style={estilos.vazioTexto}>
            O horário ainda não está publicado. Fala com o ginásio.
          </Text>
        </Vidro>
      ) : null}

      {porDia.map(([dia, doDia]) => (
        <View key={dia}>
          <Text style={estilos.dia}>{rotuloDoDia(dia)}</Text>

          {doDia.map((a) => {
            const lugares = Math.max(0, a.capacity - a.booked);
            const minha = a.my_status;
            const aMexerNesta = aMexer === chave(a);

            return (
              <Vidro key={chave(a)} estilo={[estilos.aula, a.cancelled && estilos.cancelada]}>
                <View style={estilos.linhaDeCima}>
                  <View style={estilos.horaCaixa}>
                    <Text style={estilos.hora}>{a.start_time}</Text>
                  </View>
                  <View style={estilos.info}>
                    <Text style={[estilos.nome, { color: a.activity_color || cores.texto }]}>
                      {a.activity_name}
                      {a.label ? ` · ${a.label}` : ''}
                    </Text>
                    <Text style={estilos.detalhe}>
                      {a.instructor ? `${a.instructor} · ` : ''}
                      {a.duration_min} min
                    </Text>
                  </View>
                </View>

                {a.cancelled ? (
                  <Text style={estilos.aviso}>
                    Cancelada{a.note ? ` — ${a.note}` : ''}
                  </Text>
                ) : (
                  <View style={estilos.linhaDeBaixo}>
                    <Text style={estilos.lugares}>
                      {minha === 'waiting'
                        ? `Estás em espera · ${a.waiting} na fila`
                        : lugares > 0
                          ? `${lugares} ${lugares === 1 ? 'lugar' : 'lugares'}`
                          : `Cheia · ${a.waiting} em espera`}
                    </Text>

                    {minha === 'attended' ? (
                      <Text style={estilos.veio}>Vieste ✓</Text>
                    ) : minha === 'missed' ? (
                      <Text style={estilos.faltou}>Faltaste</Text>
                    ) : minha === 'booked' || minha === 'waiting' ? (
                      <Pressable
                        style={({ pressed }) => [estilos.botaoSair, pressed && estilos.premido]}
                        onPress={() => desmarcar(a)}
                        disabled={aMexerNesta}
                      >
                        <Text style={estilos.botaoSairTexto}>
                          {aMexerNesta ? '…' : 'Desmarcar'}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={({ pressed }) => [estilos.botao, pressed && estilos.premido]}
                        onPress={() => marcar(a)}
                        disabled={aMexerNesta}
                      >
                        <Text style={estilos.botaoTexto}>
                          {aMexerNesta ? '…' : lugares > 0 ? 'Marcar' : 'Lista de espera'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </Vidro>
            );
          })}
        </View>
      ))}

      <Text style={estilos.nota}>
        Desmarca até 2 horas antes, para o lugar poder ir a quem está à espera.
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  titulo: { color: cores.texto, fontSize: 26, fontWeight: '800' },
  subtitulo: { color: cores.textoSecundario, fontSize: 13, marginTop: espaco.xs },
  erro: { color: cores.vermelho, marginTop: espaco.s },
  vazio: { padding: espaco.g, alignItems: 'center', marginTop: espaco.m },
  vazioTexto: { color: cores.textoSecundario, textAlign: 'center' },

  dia: {
    color: cores.texto,
    fontSize: 15,
    fontWeight: '800',
    marginTop: espaco.g,
    marginBottom: espaco.s,
  },
  aula: { padding: espaco.m, marginBottom: espaco.s },
  cancelada: { opacity: 0.55 },
  linhaDeCima: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  horaCaixa: {
    paddingHorizontal: espaco.s,
    paddingVertical: espaco.xs,
    borderRadius: raio.s,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  hora: { color: cores.texto, fontSize: 15, fontWeight: '800' },
  info: { flex: 1, minWidth: 0 },
  nome: { fontSize: 16, fontWeight: '700' },
  detalhe: { color: cores.textoSecundario, fontSize: 12, marginTop: 1 },

  linhaDeBaixo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: espaco.s,
    marginTop: espaco.m,
  },
  lugares: { color: cores.textoSecundario, fontSize: 13, flex: 1 },
  aviso: { color: cores.vermelho, fontSize: 13, marginTop: espaco.s },
  veio: { color: cores.verde, fontSize: 13, fontWeight: '700' },
  faltou: { color: cores.vermelho, fontSize: 13, fontWeight: '700' },

  botao: {
    paddingHorizontal: espaco.m,
    paddingVertical: espaco.s,
    borderRadius: raio.redondo,
    backgroundColor: cores.laranja,
  },
  botaoTexto: { color: cores.texto, fontSize: 13, fontWeight: '800' },
  botaoSair: {
    paddingHorizontal: espaco.m,
    paddingVertical: espaco.s,
    borderRadius: raio.redondo,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cores.borda,
  },
  botaoSairTexto: { color: cores.textoSecundario, fontSize: 13, fontWeight: '700' },
  premido: { opacity: 0.75 },

  nota: {
    color: cores.textoSecundario,
    fontSize: 12,
    textAlign: 'center',
    marginTop: espaco.g,
    lineHeight: 18,
  },
});
