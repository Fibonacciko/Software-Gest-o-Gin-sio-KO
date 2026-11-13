import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { entrar, Socio } from '../api';
import { cores, espaco, raio, superficie } from '../theme';

type Props = {
  aoEntrar: (socio: Socio) => void;
};

export default function EcraLogin({ aoEntrar }: Props) {
  const [numero, setNumero] = useState('');
  const [telefone, setTelefone] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  const tentarEntrar = async () => {
    if (!numero.trim() || !telefone.trim()) {
      setErro('Preenche o número de sócio e o telefone.');
      return;
    }
    setErro(null);
    setACarregar(true);
    try {
      const socio = await entrar(numero, telefone);
      aoEntrar(socio);
    } catch (e: any) {
      // O servidor responde em ingles neste ponto; traduzimos para o socio
      const bruto = String(e?.message ?? '');
      setErro(
        /invalid|inactive/i.test(bruto)
          ? 'Número de sócio ou telefone não conferem. Confirma na receção.'
          : bruto
      );
    } finally {
      setACarregar(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={estilos.raiz}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* A porta do ginásio, de pé, atrás de tudo. É o ecrã certo para ela:
          é o único de pé como a fotografia, e entrar na aplicação é mesmo
          entrar pela porta. */}
      <Image
        source={require('../../assets/porta.jpg')}
        style={estilos.porta}
        resizeMode="cover"
      />
      {/* Sem isto não se lia nada por cima dela. O escurecimento é mais forte
          em baixo, onde estão os campos e o botão, e deixa respirar em cima,
          onde está a luz do candeeiro. */}
      <LinearGradient
        colors={['rgba(8,20,22,0.30)', 'rgba(8,20,22,0.66)', 'rgba(8,20,22,0.93)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/logo-ko.png')}
          style={estilos.logo}
          resizeMode="contain"
        />
        <Text style={estilos.titulo}>Ginásio KO</Text>
        <Text style={estilos.subtitulo}>O teu cartão de sócio</Text>

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Número de sócio</Text>
          <TextInput
            style={estilos.entrada}
            value={numero}
            onChangeText={setNumero}
            placeholder="001"
            placeholderTextColor={cores.textoSecundario}
            keyboardType="number-pad"
            autoCapitalize="none"
          />
        </View>

        <View style={estilos.campo}>
          <Text style={estilos.etiqueta}>Telefone</Text>
          <TextInput
            style={estilos.entrada}
            value={telefone}
            onChangeText={setTelefone}
            placeholder="912345678"
            placeholderTextColor={cores.textoSecundario}
            keyboardType="phone-pad"
          />
        </View>

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <Pressable
          style={({ pressed }) => [estilos.botao, pressed && estilos.botaoPressionado]}
          onPress={tentarEntrar}
          disabled={aCarregar}
        >
          {aCarregar ? (
            <ActivityIndicator color={cores.texto} />
          ) : (
            <Text style={estilos.botaoTexto}>ENTRAR</Text>
          )}
        </Pressable>

        <Text style={estilos.ajuda}>
          Entras com o teu número de sócio e o telefone que deste na inscrição.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { width: LARGURA, height: ALTURA } = Dimensions.get('window');

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  // Medidas explícitas, e não `absoluteFill`: uma `Image` sem largura e altura
  // fica do tamanho natural do ficheiro e vê-se só o canto dele. Já tinha
  // acontecido com as imagens do `Fundo`.
  porta: { position: 'absolute', left: 0, top: 0, width: LARGURA, height: ALTURA },
  conteudo: { padding: espaco.g, paddingTop: 80, gap: espaco.m },
  // O logotipo ja traz o circulo e o fundo: nao leva caixa nenhuma por baixo
  logo: {
    width: 132,
    height: 132,
    alignSelf: 'center',
  },
  titulo: {
    color: cores.laranjaClaro,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitulo: {
    color: cores.textoSecundario,
    textAlign: 'center',
    marginBottom: espaco.m,
  },
  campo: { gap: espaco.xs },
  etiqueta: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600' },
  entrada: {
    ...superficie,
    // Mais opaco do que o vidro habitual: por cima de uma fotografia, o
    // translúcido de sempre deixava a parede a aparecer pelo meio do texto.
    backgroundColor: 'rgba(8,20,22,0.55)',
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.s,
    paddingHorizontal: espaco.m,
    paddingVertical: 14,
    color: cores.texto,
    fontSize: 17,
  },
  erro: { color: cores.vermelho, fontSize: 14 },
  botao: {
    backgroundColor: cores.laranja,
    borderRadius: raio.s,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: espaco.s,
  },
  botaoPressionado: { opacity: 0.8 },
  botaoTexto: { color: cores.texto, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  ajuda: {
    color: cores.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: espaco.s,
  },
});
