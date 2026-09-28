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
  carregarCartao,
  carregarModalidades,
  fazerCheckin,
  Modalidade,
  ResultadoCheckin,
  sair,
  Socio,
} from '../api';
import { lerEtiqueta, nfcDisponivel, pararLeitura } from '../nfc';
import { cores, espaco } from '../theme';

type Props = {
  socio: Socio;
  aoSair: () => void;
};

const dataPt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : null;

export default function EcraCartao({ socio: inicial, aoSair }: Props) {
  const [socio, setSocio] = useState(inicial);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [temNfc, setTemNfc] = useState(false);
  const [aLerNfc, setALerNfc] = useState(false);
  const [escolhaAberta, setEscolhaAberta] = useState(false);
  const [resultado, setResultado] = useState<ResultadoCheckin | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarModalidades().then(setModalidades).catch(() => setModalidades([]));
    nfcDisponivel().then(setTemNfc);
    return () => {
      pararLeitura();
    };
  }, []);

  const atualizar = async () => {
    setAAtualizar(true);
    try {
      setSocio(await carregarCartao(socio.id));
    } catch {
      // mantem o que ja esta no ecra
    } finally {
      setAAtualizar(false);
    }
  };

  const minhasModalidades = modalidades.filter((m) => socio.activity_ids?.includes(m.id));

  const registar = async (activityId: string | null, metodo: 'mobile_qr' | 'mobile_nfc') => {
    setErro(null);
    try {
      const r = await fazerCheckin(socio.id, activityId, metodo);
      setResultado(r);
      atualizar();
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não foi possível fazer o check-in.'));
    }
  };

  const comecarCheckin = async () => {
    // Com mais do que uma modalidade, o socio escolhe qual esta a treinar
    if (minhasModalidades.length > 1) {
      setEscolhaAberta(true);
      return;
    }
    await encostarTelemovel(minhasModalidades[0]?.id ?? null);
  };

  const encostarTelemovel = async (activityId: string | null) => {
    setEscolhaAberta(false);
    if (!temNfc) {
      // Sem NFC neste telemovel, regista na mesma
      await registar(activityId, 'mobile_qr');
      return;
    }
    setALerNfc(true);
    setErro(null);
    try {
      await lerEtiqueta();
      await registar(activityId, 'mobile_nfc');
    } catch (e: any) {
      const bruto = String(e?.message ?? '');
      if (!/cancel/i.test(bruto)) setErro('Não consegui ler. Encosta o telemóvel ao autocolante.');
    } finally {
      setALerNfc(false);
    }
  };

  // Sem quota registada no sistema, o estado fica por determinar: nao se
  // acusa de atraso quem talvez esteja em dia e so nao tem historico
  const estado = socio.membership_status;
  const corEstado =
    estado === 'suspended' || estado === 'inactive'
      ? cores.vermelho
      : estado === 'active'
        ? cores.verde
        : cores.textoSecundario;
  const textoEstado =
    estado === 'suspended'
      ? 'SUSPENSO'
      : estado === 'inactive'
        ? 'QUOTA POR REGULARIZAR'
        : estado === 'active'
          ? 'EM DIA'
          : 'SÓCIO';

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      {/* Cartao do socio */}
      <View style={estilos.cartao}>
        <View style={estilos.cartaoTopo}>
          <Text style={estilos.nome}>{socio.name}</Text>
          <Text style={estilos.numero}>Sócio n.º {socio.member_number}</Text>
          {/* Por baixo do numero: o texto e longo e nao cabe ao lado do nome */}
          <View style={[estilos.selo, { borderColor: corEstado }]}>
            <Text style={[estilos.seloTexto, { color: corEstado }]}>{textoEstado}</Text>
          </View>
        </View>

        {socio.qr_code ? (
          <View style={estilos.qrCaixa}>
            <Image source={{ uri: socio.qr_code }} style={estilos.qr} resizeMode="contain" />
          </View>
        ) : null}

        <View style={estilos.linhaValidades}>
          <View style={estilos.validade}>
            <Text style={estilos.validadeEtiqueta}>Quota até</Text>
            <Text style={estilos.validadeValor}>
              {dataPt(socio.membership_valid_until) ?? '—'}
            </Text>
          </View>
          <View style={estilos.validade}>
            <Text style={estilos.validadeEtiqueta}>Seguro até</Text>
            <Text style={estilos.validadeValor}>
              {dataPt(socio.insurance_valid_until) ?? '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botao de check-in */}
      <Pressable
        style={({ pressed }) => [
          estilos.botaoCheckin,
          socio.checked_in_today && estilos.botaoFeito,
          pressed && { opacity: 0.85 },
        ]}
        onPress={comecarCheckin}
        disabled={aLerNfc}
      >
        {aLerNfc ? (
          <>
            <ActivityIndicator color={cores.texto} />
            <Text style={estilos.botaoCheckinTexto}>ENCOSTA O TELEMÓVEL</Text>
          </>
        ) : (
          <Text style={estilos.botaoCheckinTexto}>
            {socio.checked_in_today ? 'JÁ TREINASTE HOJE ✓' : 'CHECK-IN'}
          </Text>
        )}
      </Pressable>

      {temNfc ? (
        <Text style={estilos.dica}>Encosta o telemóvel ao autocolante KO à entrada.</Text>
      ) : (
        <Text style={estilos.dica}>Mostra o teu QR code na receção.</Text>
      )}

      {erro && <Text style={estilos.erro}>{erro}</Text>}

      {/* Numeros */}
      <View style={estilos.numeros}>
        <View style={estilos.numeroCaixa}>
          <Text style={estilos.numeroGrande}>{socio.workout_count}</Text>
          <Text style={estilos.numeroEtiqueta}>treinos</Text>
        </View>
        <View style={estilos.numeroCaixa}>
          <Text style={estilos.numeroGrande}>{socio.streak_weeks}</Text>
          <Text style={estilos.numeroEtiqueta}>
            {socio.streak_weeks === 1 ? 'semana seguida' : 'semanas seguidas'}
          </Text>
        </View>
      </View>

      {/* Frase satirica */}
      {socio.current_motivational_note ? (
        <View style={estilos.frase}>
          <Text style={estilos.fraseTexto}>{socio.current_motivational_note}</Text>
        </View>
      ) : null}

      {/* Modalidades */}
      {minhasModalidades.length > 0 && (
        <View style={estilos.modalidades}>
          {minhasModalidades.map((m) => (
            <View key={m.id} style={[estilos.modalidade, { borderColor: m.color }]}>
              <View style={[estilos.pontoCor, { backgroundColor: m.color }]} />
              <Text style={estilos.modalidadeTexto}>{m.name}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable onPress={() => sair().then(aoSair)} style={estilos.sair}>
        <Text style={estilos.sairTexto}>Terminar sessão</Text>
      </Pressable>

      {/* Escolha de modalidade */}
      <Modal visible={escolhaAberta} transparent animationType="fade">
        <View style={estilos.fundoModal}>
          <View style={estilos.caixaModal}>
            <Text style={estilos.tituloModal}>O que vais treinar?</Text>
            {minhasModalidades.map((m) => (
              <Pressable
                key={m.id}
                style={[estilos.opcao, { borderColor: m.color }]}
                onPress={() => encostarTelemovel(m.id)}
              >
                <View style={[estilos.pontoCor, { backgroundColor: m.color }]} />
                <Text style={estilos.opcaoTexto}>{m.name}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setEscolhaAberta(false)} style={estilos.cancelar}>
              <Text style={estilos.sairTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Celebracao apos o check-in */}
      <Modal visible={!!resultado} transparent animationType="slide">
        <View style={estilos.fundoModal}>
          <View style={estilos.caixaModal}>
            {resultado?.already_checked_in ? (
              <>
                <Text style={estilos.celebracaoTitulo}>Já cá estiveste hoje</Text>
                <Text style={estilos.celebracaoSub}>{resultado.activity_name}</Text>
              </>
            ) : (
              <>
                <Text style={estilos.celebracaoNumero}>{resultado?.workout_count}</Text>
                <Text style={estilos.celebracaoTitulo}>
                  {resultado?.milestone ? `Treino ${resultado.milestone}. Marco batido!` : 'Check-in feito'}
                </Text>
                <Text style={estilos.celebracaoSub}>
                  {resultado?.activity_name}
                  {resultado?.streak_weeks
                    ? ` · ${resultado.streak_weeks} ${
                        resultado.streak_weeks === 1 ? 'semana seguida' : 'semanas seguidas'
                      }`
                    : ''}
                </Text>
              </>
            )}

            {resultado?.motivational_note ? (
              <Text style={estilos.celebracaoFrase}>{resultado.motivational_note}</Text>
            ) : null}

            <Pressable style={estilos.botaoFechar} onPress={() => setResultado(null)}>
              <Text style={estilos.botaoCheckinTexto}>FECHAR</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, paddingTop: 60, paddingBottom: 40, gap: espaco.m },

  cartao: {
    backgroundColor: cores.fundoCartao,
    borderRadius: 20,
    padding: espaco.g,
    borderWidth: 1,
    borderColor: cores.borda,
    gap: espaco.m,
  },
  cartaoTopo: { gap: 6 },
  nome: { color: cores.texto, fontSize: 22, fontWeight: '800' },
  numero: { color: cores.textoSecundario, fontSize: 14, marginTop: 2 },
  selo: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',   // acompanha o texto, em vez de ocupar a largura toda
    marginTop: 2,
  },
  seloTexto: { fontSize: 12, fontWeight: '800' },

  qrCaixa: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: espaco.m,
    alignItems: 'center',
  },
  qr: { width: 200, height: 200 },

  linhaValidades: { flexDirection: 'row', gap: espaco.m },
  validade: { flex: 1 },
  validadeEtiqueta: { color: cores.textoSecundario, fontSize: 12 },
  validadeValor: { color: cores.texto, fontSize: 15, fontWeight: '700', marginTop: 2 },

  botaoCheckin: {
    backgroundColor: cores.laranja,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: 'center',
    gap: espaco.s,
  },
  botaoFeito: { backgroundColor: cores.verde },
  botaoCheckinTexto: { color: cores.texto, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  dica: { color: cores.textoSecundario, fontSize: 13, textAlign: 'center' },
  erro: { color: cores.vermelho, fontSize: 14, textAlign: 'center' },

  numeros: { flexDirection: 'row', gap: espaco.m },
  numeroCaixa: {
    flex: 1,
    backgroundColor: cores.fundoCartao,
    borderRadius: 16,
    padding: espaco.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
  },
  numeroGrande: { color: cores.laranjaClaro, fontSize: 32, fontWeight: '900' },
  numeroEtiqueta: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },

  frase: {
    backgroundColor: cores.fundoElevado,
    borderRadius: 16,
    padding: espaco.m,
    borderLeftWidth: 4,
    borderLeftColor: cores.dourado,
  },
  fraseTexto: { color: cores.texto, fontSize: 15, fontStyle: 'italic', lineHeight: 22 },

  modalidades: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s },
  modalidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pontoCor: { width: 8, height: 8, borderRadius: 4 },
  modalidadeTexto: { color: cores.texto, fontSize: 13 },

  sair: { alignItems: 'center', paddingVertical: espaco.m },
  sairTexto: { color: cores.textoSecundario, fontSize: 14 },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: espaco.g,
  },
  caixaModal: {
    backgroundColor: cores.fundoCartao,
    borderRadius: 20,
    padding: espaco.g,
    gap: espaco.m,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  tituloModal: { color: cores.texto, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: espaco.m,
  },
  opcaoTexto: { color: cores.texto, fontSize: 16, fontWeight: '600' },
  cancelar: { alignItems: 'center', paddingTop: espaco.s },

  celebracaoNumero: {
    color: cores.laranjaClaro,
    fontSize: 64,
    fontWeight: '900',
    textAlign: 'center',
  },
  celebracaoTitulo: { color: cores.texto, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  celebracaoSub: { color: cores.textoSecundario, fontSize: 15, textAlign: 'center' },
  celebracaoFrase: {
    color: cores.texto,
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    paddingVertical: espaco.s,
  },
  botaoFechar: {
    backgroundColor: cores.laranja,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
