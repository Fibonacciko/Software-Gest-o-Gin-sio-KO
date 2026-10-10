import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  carregarCartao,
  carregarModalidades,
  enderecoDaImagem,
  fazerCheckin,
  guardarFotoDoSocio,
  Modalidade,
  removerFotoDoSocio,
  ResultadoCheckin,
  sair,
  Socio,
} from '../api';
import { lerEtiqueta, nfcDisponivel, pararLeitura } from '../nfc';
import { cores, espaco } from '../theme';

const LOGOTIPO = require('../../assets/logo-ko.png');
const FOTO_DO_GINASIO = require('../../assets/ginasio.jpg');

type Props = {
  socio: Socio;
  aoSair: () => void;
};

const dataPt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : null;

/**
 * Nome próprio e apelido.
 *
 * O dono quis só estes dois: "José Manuel dos Santos Oliveira" num telemóvel
 * dá uma linha cortada a meio, e o sócio já sabe como se chama.
 */
const nomeCurto = (nome: string) => {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 1) return partes[0] ?? '';
  return `${partes[0]} ${partes[partes.length - 1]}`;
};

export default function EcraCartao({ socio: inicial, aoSair }: Props) {
  const [socio, setSocio] = useState(inicial);
  const [modalidades, setModalidades] = useState<Modalidade[]>([]);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [temNfc, setTemNfc] = useState<boolean | null>(null);
  const [aLerNfc, setALerNfc] = useState(false);
  const [escolhaAberta, setEscolhaAberta] = useState(false);
  const [qrAberto, setQrAberto] = useState(false);
  const [fotoAberta, setFotoAberta] = useState(false);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
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

  // ------------------------------------------------ a fotografia do atleta

  const retrato = enderecoDaImagem(socio.photo_url);

  const escolherFotografia = async () => {
    setFotoAberta(false);
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert(
        'Sem acesso às fotografias',
        'Autoriza o acesso nas definições do telemóvel para escolheres a tua foto.'
      );
      return;
    }

    const escolha = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (escolha.canceled || !escolha.assets?.[0]) return;

    const ficheiro = escolha.assets[0];
    setAEnviarFoto(true);
    try {
      const url = await guardarFotoDoSocio(
        socio.id,
        ficheiro.uri,
        ficheiro.fileName ?? 'foto.jpg'
      );
      setSocio((s) => ({ ...s, photo_url: url }));
    } catch (e: any) {
      Alert.alert('Não consegui guardar', String(e?.message ?? 'Tenta outra vez.'));
    } finally {
      setAEnviarFoto(false);
    }
  };

  const tirarFotografia = async () => {
    setFotoAberta(false);
    setAEnviarFoto(true);
    try {
      await removerFotoDoSocio(socio.id);
      setSocio((s) => ({ ...s, photo_url: null }));
    } catch (e: any) {
      Alert.alert('Não consegui remover', String(e?.message ?? 'Tenta outra vez.'));
    } finally {
      setAEnviarFoto(false);
    }
  };

  // --------------------------------------------------- estado da inscrição

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
        ? 'INACTIVO'
        : estado === 'active'
          ? 'ACTIVO'
          : 'SÓCIO';

  return (
    <ScrollView
      style={estilos.raiz}
      contentContainerStyle={estilos.conteudo}
      refreshControl={
        <RefreshControl refreshing={aAtualizar} onRefresh={atualizar} tintColor={cores.laranjaClaro} />
      }
    >
      {/* Quem é, e o retrato que também é botão */}
      <View style={estilos.cabecalho}>
        <View style={estilos.cabecalhoTexto}>
          <Text style={estilos.nome} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {nomeCurto(socio.name)}
          </Text>
          <Text style={estilos.numeroSocio}>Sócio n.º {socio.member_number}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [estilos.retratoBotao, pressed && { opacity: 0.8 }]}
          onPress={() => (retrato ? setFotoAberta(true) : escolherFotografia())}
          disabled={aEnviarFoto}
        >
          {aEnviarFoto ? (
            <View style={[estilos.retrato, estilos.retratoVazio]}>
              <ActivityIndicator color={cores.laranjaClaro} />
            </View>
          ) : retrato ? (
            <Image source={{ uri: retrato }} style={estilos.retrato} resizeMode="cover" />
          ) : (
            <Image source={LOGOTIPO} style={estilos.retrato} resizeMode="contain" />
          )}
          {!retrato && !aEnviarFoto ? (
            <View style={estilos.maisFoto}>
              <Text style={estilos.maisFotoTexto}>+</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* O ginásio, onde antes havia espaço vazio */}
      <View style={estilos.molduraGinasio}>
        <Image source={FOTO_DO_GINASIO} style={estilos.fotoGinasio} resizeMode="cover" />
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

      {/* Estado, quota e seguro — tudo numa linha, logo abaixo do check-in */}
      <View style={estilos.cartaoEstado}>
        <View style={estilos.colunaEstado}>
          <Text style={estilos.validadeEtiqueta}>Inscrição</Text>
          <Text style={[estilos.estadoValor, { color: corEstado }]}>{textoEstado}</Text>
        </View>
        <View style={estilos.separadorVertical} />
        <View style={estilos.colunaEstado}>
          <Text style={estilos.validadeEtiqueta}>Quota até</Text>
          <Text style={estilos.validadeValor}>{dataPt(socio.membership_valid_until) ?? '—'}</Text>
        </View>
        <View style={estilos.separadorVertical} />
        <View style={estilos.colunaEstado}>
          <Text style={estilos.validadeEtiqueta}>Seguro até</Text>
          <Text style={estilos.validadeValor}>{dataPt(socio.insurance_valid_until) ?? '—'}</Text>
        </View>
      </View>

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

      <Pressable
        style={({ pressed }) => [estilos.botaoQr, pressed && { opacity: 0.8 }]}
        onPress={() => setQrAberto(true)}
      >
        <Text style={estilos.botaoQrTexto}>Mostrar o meu QR</Text>
      </Pressable>

      {/* Empurra o terminar sessao para o fim, mesmo quando ha pouco conteudo */}
      <View style={estilos.empurrao} />

      <Pressable onPress={() => sair().then(aoSair)} style={estilos.sair}>
        <Text style={estilos.sairTexto}>Terminar sessão</Text>
      </Pressable>

      {/* Trocar ou remover a fotografia */}
      <Modal visible={fotoAberta} transparent animationType="fade" onRequestClose={() => setFotoAberta(false)}>
        <Pressable style={estilos.fundoModal} onPress={() => setFotoAberta(false)}>
          <View style={estilos.caixaModal}>
            <Text style={estilos.tituloModal}>A tua fotografia</Text>
            <Pressable style={estilos.opcaoFoto} onPress={escolherFotografia}>
              <Text style={estilos.opcaoFotoTexto}>Escolher outra fotografia</Text>
            </Pressable>
            <Pressable style={estilos.opcaoFoto} onPress={tirarFotografia}>
              <Text style={[estilos.opcaoFotoTexto, { color: cores.vermelho }]}>
                Remover e voltar ao logotipo
              </Text>
            </Pressable>
            <Pressable style={estilos.cancelar} onPress={() => setFotoAberta(false)}>
              <Text style={estilos.sairTexto}>Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
  // flexGrow para o "Terminar sessao" poder ser empurrado para o fundo
  conteudo: { padding: espaco.m, paddingBottom: espaco.s, flexGrow: 1 },

  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: espaco.m },
  cabecalhoTexto: { flex: 1 },
  nome: {
    color: cores.texto,
    fontSize: 27,
    // A fonte que o dono pediu, parecida com a Comic Sans MS. Carregada no
    // App.tsx; se ainda nao estiver pronta, o sistema escolhe a sua.
    fontFamily: 'ComicNeue_700Bold',
  },
  numeroSocio: { color: cores.textoSecundario, fontSize: 14, marginTop: 2 },

  retratoBotao: { width: 72, height: 72 },
  retrato: { width: 72, height: 72, borderRadius: 36, backgroundColor: cores.fundoElevado },
  retratoVazio: { alignItems: 'center', justifyContent: 'center' },
  maisFoto: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: cores.laranja,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: cores.fundo,
  },
  maisFotoTexto: { color: cores.texto, fontSize: 16, fontWeight: '800', lineHeight: 18 },

  molduraGinasio: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: espaco.m,
    backgroundColor: cores.fundoCartao,
  },
  fotoGinasio: { width: '100%', height: 100 },

  botaoCheckin: {
    backgroundColor: cores.laranja,
    borderRadius: 16,
    paddingVertical: espaco.g,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: espaco.s,
    marginTop: espaco.m,
  },
  botaoFeito: { backgroundColor: cores.verde },
  botaoCheckinTexto: { color: cores.texto, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  dica: { color: cores.textoSecundario, fontSize: 13, textAlign: 'center', marginTop: espaco.s },
  erro: { color: cores.vermelho, textAlign: 'center', marginTop: espaco.s },

  cartaoEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45,45,45,0.82)',
    borderRadius: 16,
    paddingVertical: espaco.m,
    paddingHorizontal: espaco.s,
    marginTop: espaco.m,
  },
  colunaEstado: { flex: 1, alignItems: 'center' },
  separadorVertical: { width: 1, alignSelf: 'stretch', backgroundColor: cores.borda },
  validadeEtiqueta: { color: cores.textoSecundario, fontSize: 11 },
  validadeValor: { color: cores.texto, fontSize: 15, fontWeight: '700', marginTop: 3 },
  estadoValor: { fontSize: 15, fontWeight: '800', marginTop: 3, letterSpacing: 0.5 },

  numeros: { flexDirection: 'row', gap: espaco.m, marginTop: espaco.m },
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

  botaoQr: {
    backgroundColor: 'rgba(45,45,45,0.82)',
    borderRadius: 16,
    paddingVertical: espaco.m,
    alignItems: 'center',
    marginTop: espaco.m,
  },
  botaoQrTexto: { color: cores.laranjaClaro, fontSize: 15, fontWeight: '700' },

  empurrao: { flexGrow: 1, minHeight: espaco.s },
  sair: { alignItems: 'center', paddingVertical: espaco.s },
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
  opcaoFoto: {
    width: '100%',
    paddingVertical: espaco.m,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: cores.fundoElevado,
    marginBottom: espaco.s,
  },
  opcaoFotoTexto: { color: cores.texto, fontSize: 15, fontWeight: '600' },
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
