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
  enderecoDaImagem,
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

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0];

export default function EcraCartao({ socio: inicial, aoSair }: Props) {
  const [socio, setSocio] = useState(inicial);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [temNfc, setTemNfc] = useState<boolean | null>(null);
  const [aLerNfc, setALerNfc] = useState(false);
  const [escolhaAberta, setEscolhaAberta] = useState(false);
  const [qrAberto, setQrAberto] = useState(false);
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

  const registar = async (activityId: string | null) => {
    setErro(null);
    try {
      const r = await fazerCheckin(socio.id, activityId, 'mobile_nfc');
      setResultado(r);
      atualizar();
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não foi possível fazer o check-in.'));
    }
  };

  const comecarCheckin = async () => {
    // Sem NFC neste telemovel, o check-in faz-se na recepcao com o QR. Nunca
    // se regista so por carregar no botao: a presenca tem de ser mesmo no
    // ginasio, senao as contas de presencas deixam de valer alguma coisa.
    if (temNfc === false) {
      setQrAberto(true);
      return;
    }
    if (minhasModalidades.length > 1) {
      setEscolhaAberta(true);
      return;
    }
    await encostarTelemovel(minhasModalidades[0]?.id ?? null);
  };

  /** Espera pela etiqueta. Só depois de a ler é que a entrada é registada. */
  const encostarTelemovel = async (activityId: string | null) => {
    setEscolhaAberta(false);
    setALerNfc(true);
    setErro(null);
    try {
      await lerEtiqueta();
      await registar(activityId);
    } catch (e: any) {
      const bruto = String(e?.message ?? '');
      if (!/cancel/i.test(bruto)) {
        setErro('Não consegui ler. Encosta o telemóvel ao autocolante KO.');
      }
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

  const retrato = enderecoDaImagem(socio.photo_url);

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      {/* Quem é e como está */}
      <View style={estilos.cabecalho}>
        <View style={estilos.cabecalhoTexto}>
          <Text style={estilos.ola}>Olá,</Text>
          <Text style={estilos.nome} numberOfLines={1}>
            {primeiroNome(socio.name)}
          </Text>
          <View style={[estilos.selo, { borderColor: corEstado }]}>
            <Text style={[estilos.seloTexto, { color: corEstado }]}>{textoEstado}</Text>
          </View>
        </View>

        {/* No lugar onde estava o QR: o retrato do sócio, ou as iniciais */}
        {retrato ? (
          <Image source={{ uri: retrato }} style={estilos.retrato} resizeMode="cover" />
        ) : (
          <View style={[estilos.retrato, estilos.retratoVazio]}>
            <Text style={estilos.retratoLetra}>{socio.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* O que se faz todos os dias */}
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
            <Text style={estilos.botaoCheckinTexto}>ENCOSTA AO AUTOCOLANTE</Text>
          </>
        ) : (
          <Text style={estilos.botaoCheckinTexto}>
            {socio.checked_in_today ? 'JÁ TREINASTE HOJE ✓' : 'CHECK-IN'}
          </Text>
        )}
      </Pressable>

      <Text style={estilos.dica}>
        {temNfc === false
          ? 'Este telemóvel não lê etiquetas. Mostra o teu QR na receção.'
          : 'Carrega e encosta o telemóvel ao autocolante KO à entrada.'}
      </Text>

      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}

      {/* Números */}
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

      {socio.current_motivational_note ? (
        <View style={estilos.frase}>
          <Text style={estilos.fraseTexto}>{socio.current_motivational_note}</Text>
        </View>
      ) : null}

      {/* Validades e número de sócio */}
      <View style={estilos.cartao}>
        <View style={estilos.linhaValidades}>
          <View style={estilos.validade}>
            <Text style={estilos.validadeEtiqueta}>Quota até</Text>
            <Text style={estilos.validadeValor}>{dataPt(socio.membership_valid_until) ?? '—'}</Text>
          </View>
          <View style={estilos.validade}>
            <Text style={estilos.validadeEtiqueta}>Seguro até</Text>
            <Text style={estilos.validadeValor}>{dataPt(socio.insurance_valid_until) ?? '—'}</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [estilos.botaoQr, pressed && { opacity: 0.8 }]}
          onPress={() => setQrAberto(true)}
        >
          <Text style={estilos.botaoQrTexto}>Mostrar o meu QR</Text>
          <Text style={estilos.numeroSocio}>Sócio n.º {socio.member_number}</Text>
        </Pressable>
      </View>

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

      {/* O QR em grande, em fundo branco: é assim que se lê bem na receção */}
      <Modal visible={qrAberto} animationType="fade" onRequestClose={() => setQrAberto(false)}>
        <Pressable style={estilos.ecraQr} onPress={() => setQrAberto(false)}>
          <Text style={estilos.qrNome}>{socio.name}</Text>
          <Text style={estilos.qrNumero}>Sócio n.º {socio.member_number}</Text>
          {socio.qr_code ? (
            <Image source={{ uri: socio.qr_code }} style={estilos.qrGrande} resizeMode="contain" />
          ) : (
            <Text style={estilos.qrSem}>Este sócio ainda não tem código.</Text>
          )}
          <Text style={estilos.qrAjuda}>Mostra este código na receção</Text>
          <Text style={estilos.qrFechar}>Toca para fechar</Text>
        </Pressable>
      </Modal>

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

      {/* Celebração após o check-in */}
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
  raiz: { flex: 1 },
  conteudo: { padding: espaco.m, paddingBottom: espaco.xg },

  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  cabecalhoTexto: { flex: 1 },
  ola: { color: cores.textoSecundario, fontSize: 15 },
  nome: { color: cores.texto, fontSize: 30, fontWeight: '800' },
  selo: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: espaco.s,
    paddingVertical: 3,
    marginTop: espaco.s,
  },
  seloTexto: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  retrato: { width: 78, height: 78, borderRadius: 39, backgroundColor: cores.fundoElevado },
  retratoVazio: { alignItems: 'center', justifyContent: 'center' },
  retratoLetra: { color: cores.laranjaClaro, fontSize: 32, fontWeight: '800' },

  botaoCheckin: {
    backgroundColor: cores.laranja,
    borderRadius: 16,
    paddingVertical: espaco.g,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaco.s,
    marginTop: espaco.g,
  },
  botaoFeito: { backgroundColor: cores.verde },
  botaoCheckinTexto: { color: cores.texto, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  dica: { color: cores.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: espaco.s },
  erro: { color: cores.vermelho, textAlign: 'center', marginTop: espaco.s },

  numeros: { flexDirection: 'row', gap: espaco.m, marginTop: espaco.g },
  numeroCaixa: {
    flex: 1,
    backgroundColor: 'rgba(45,45,45,0.82)',
    borderRadius: 16,
    padding: espaco.m,
    alignItems: 'center',
  },
  numeroGrande: { color: cores.dourado, fontSize: 32, fontWeight: '800' },
  numeroEtiqueta: { color: cores.textoSecundario, fontSize: 12, marginTop: 2 },

  frase: {
    backgroundColor: 'rgba(45,45,45,0.82)',
    borderRadius: 16,
    padding: espaco.m,
    marginTop: espaco.m,
    borderLeftWidth: 3,
    borderLeftColor: cores.dourado,
  },
  fraseTexto: { color: cores.texto, fontSize: 15, fontStyle: 'italic', lineHeight: 22 },

  cartao: {
    backgroundColor: 'rgba(45,45,45,0.82)',
    borderRadius: 20,
    padding: espaco.m,
    marginTop: espaco.m,
  },
  linhaValidades: { flexDirection: 'row', gap: espaco.m },
  validade: { flex: 1 },
  validadeEtiqueta: { color: cores.textoSecundario, fontSize: 12 },
  validadeValor: { color: cores.texto, fontSize: 16, fontWeight: '700', marginTop: 2 },
  botaoQr: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    marginTop: espaco.m,
    paddingTop: espaco.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botaoQrTexto: { color: cores.laranjaClaro, fontSize: 15, fontWeight: '700' },
  numeroSocio: { color: cores.textoSecundario, fontSize: 13 },

  modalidades: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.s, marginTop: espaco.m },
  modalidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.xs,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: espaco.m,
    paddingVertical: espaco.s,
  },
  pontoCor: { width: 8, height: 8, borderRadius: 4 },
  modalidadeTexto: { color: cores.texto, fontSize: 13 },

  sair: { alignItems: 'center', paddingVertical: espaco.g },
  sairTexto: { color: cores.textoSecundario, fontSize: 14 },

  // O QR em ecra inteiro, fundo branco para o leitor o apanhar bem
  ecraQr: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.g,
  },
  qrNome: { color: '#1A1A1A', fontSize: 20, fontWeight: '800' },
  qrNumero: { color: '#555555', fontSize: 14, marginTop: 2, marginBottom: espaco.g },
  qrGrande: { width: 280, height: 280 },
  qrSem: { color: '#555555', marginVertical: espaco.g },
  qrAjuda: { color: '#1A1A1A', fontSize: 16, marginTop: espaco.g, fontWeight: '600' },
  qrFechar: { color: '#888888', fontSize: 12, marginTop: espaco.s },

  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: espaco.m,
  },
  caixaModal: {
    backgroundColor: cores.fundoCartao,
    borderRadius: 20,
    padding: espaco.g,
    width: '100%',
    alignItems: 'center',
  },
  tituloModal: { color: cores.texto, fontSize: 18, fontWeight: '700', marginBottom: espaco.m },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.s,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: espaco.m,
    paddingVertical: espaco.m,
    marginBottom: espaco.s,
    width: '100%',
  },
  opcaoTexto: { color: cores.texto, fontSize: 15 },
  cancelar: { paddingVertical: espaco.m },

  celebracaoNumero: { color: cores.dourado, fontSize: 56, fontWeight: '800' },
  celebracaoTitulo: { color: cores.texto, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  celebracaoSub: { color: cores.textoSecundario, fontSize: 14, marginTop: espaco.xs, textAlign: 'center' },
  celebracaoFrase: {
    color: cores.texto,
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: espaco.m,
    lineHeight: 22,
  },
  botaoFechar: {
    backgroundColor: cores.laranja,
    borderRadius: 14,
    paddingVertical: espaco.m,
    paddingHorizontal: espaco.xg,
    marginTop: espaco.g,
  },
});
