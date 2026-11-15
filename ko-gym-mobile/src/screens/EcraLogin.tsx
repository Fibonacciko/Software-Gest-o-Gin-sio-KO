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
import { entrarComPin, entrarPelaPrimeiraVez, escolherPin, Socio } from '../api';
import { alturaDaPorta, desvioDoNome, topoDaPorta } from '../lib/porta';
import { cores, espaco, raio, superficie } from '../theme';

type Props = {
  aoEntrar: (socio: Socio) => void;
};

/**
 * Em que passo da entrada estamos.
 *
 * - `pin` — o normal: número de sócio e PIN.
 * - `primeira` — quem ainda não tem PIN: número e telemóvel.
 * - `escolher` — escolher o PIN, logo a seguir.
 */
type Passo = 'pin' | 'primeira' | 'escolher';

export default function EcraLogin({ aoEntrar }: Props) {
  const [passo, setPasso] = useState<Passo>('pin');
  const [numero, setNumero] = useState('');
  const [telefone, setTelefone] = useState('');
  const [pin, setPin] = useState('');
  const [pinOutraVez, setPinOutraVez] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aCarregar, setACarregar] = useState(false);

  const irPara = (p: Passo) => {
    setErro(null);
    setPin('');
    setPinOutraVez('');
    setPasso(p);
  };

  /** A queixa do servidor, que já vem em português. */
  const dizer = (e: any, emFalta: string) => {
    const bruto = String(e?.message ?? '').trim();
    setErro(bruto && !/^\d+$/.test(bruto) ? bruto : emFalta);
  };

  const comPin = async () => {
    if (!numero.trim() || !pin.trim()) {
      setErro('Preenche o número de sócio e o PIN.');
      return;
    }
    setErro(null);
    setACarregar(true);
    try {
      const { socio } = await entrarComPin(numero, pin);
      aoEntrar(socio);
    } catch (e: any) {
      dizer(e, 'Número de sócio ou PIN não conferem.');
    } finally {
      setACarregar(false);
    }
  };

  const comTelemovel = async () => {
    if (!numero.trim() || !telefone.trim()) {
      setErro('Preenche o número de sócio e o telemóvel.');
      return;
    }
    setErro(null);
    setACarregar(true);
    try {
      const { socio, precisaDePin } = await entrarPelaPrimeiraVez(numero, telefone);
      // Quem já tem PIN nunca chega aqui: o servidor recusa o telemóvel.
      if (precisaDePin) irPara('escolher');
      else aoEntrar(socio);
    } catch (e: any) {
      dizer(e, 'Número de sócio ou telemóvel não conferem.');
    } finally {
      setACarregar(false);
    }
  };

  const guardarPin = async () => {
    if (pin.trim().length !== 6) {
      setErro('O PIN tem de ser 6 dígitos.');
      return;
    }
    if (pin.trim() !== pinOutraVez.trim()) {
      setErro('Os dois PIN não são iguais.');
      return;
    }
    setErro(null);
    setACarregar(true);
    try {
      const { socio } = await escolherPin(numero, telefone, pin);
      aoEntrar(socio);
    } catch (e: any) {
      dizer(e, 'Não consegui guardar o PIN.');
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
          onde está a luz do candeeiro.

          É leve: a fotografia já é escura de si, e carregá-la mais apagava o
          verde da sala e as cordas do ringue, que é o que ela tem para dar.
          O que torna o texto legível são as caixas de vidro, não isto. */}
      <LinearGradient
        colors={['rgba(8,20,22,0.15)', 'rgba(8,20,22,0.46)', 'rgba(8,20,22,0.90)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <Image
          source={require('../../assets/logo-ko.png')}
          style={estilos.logo}
          resizeMode="contain"
        />
        <Text style={estilos.titulo}>Ginásio KO</Text>

        {/* O número de sócio está em todos os passos: é ele que diz quem é. */}
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
            editable={passo !== 'escolher'}
          />
        </View>

        {passo === 'pin' ? (
          <View style={estilos.campo}>
            <Text style={estilos.etiqueta}>PIN</Text>
            <TextInput
              style={estilos.entrada}
              value={pin}
              onChangeText={setPin}
              placeholder="••••••"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
            />
          </View>
        ) : null}

        {passo === 'primeira' ? (
          <View style={estilos.campo}>
            <Text style={estilos.etiqueta}>Telemóvel</Text>
            <TextInput
              style={estilos.entrada}
              value={telefone}
              onChangeText={setTelefone}
              placeholder="912345678"
              placeholderTextColor={cores.textoSecundario}
              keyboardType="phone-pad"
            />
          </View>
        ) : null}

        {passo === 'escolher' ? (
          <>
            <View style={estilos.campo}>
              <Text style={estilos.etiqueta}>Escolhe um PIN de 6 dígitos</Text>
              <TextInput
                style={estilos.entrada}
                value={pin}
                onChangeText={setPin}
                placeholder="••••••"
                placeholderTextColor={cores.textoSecundario}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>
            <View style={estilos.campo}>
              <Text style={estilos.etiqueta}>Outra vez, para confirmar</Text>
              <TextInput
                style={estilos.entrada}
                value={pinOutraVez}
                onChangeText={setPinOutraVez}
                placeholder="••••••"
                placeholderTextColor={cores.textoSecundario}
                keyboardType="number-pad"
                secureTextEntry
                maxLength={6}
              />
            </View>
          </>
        ) : null}

        {erro && <Text style={estilos.erro}>{erro}</Text>}

        <Pressable
          style={({ pressed }) => [estilos.botao, pressed && estilos.botaoPressionado]}
          onPress={passo === 'pin' ? comPin : passo === 'primeira' ? comTelemovel : guardarPin}
          disabled={aCarregar}
        >
          {aCarregar ? (
            <ActivityIndicator color={cores.texto} />
          ) : (
            <Text style={estilos.botaoTexto}>
              {passo === 'escolher' ? 'GUARDAR O PIN' : 'ENTRAR'}
            </Text>
          )}
        </Pressable>

        {/* O caminho da primeira vez, e o de volta. Não há "esqueci-me do
            PIN" que o resolva sozinho de propósito: se a aplicação deixasse
            voltar ao telemóvel para recuperar, bastava dizer que se esqueceu
            para entrar na conta de qualquer pessoa sabendo-lhe o número —
            que é o buraco que o PIN tapa. */}
        {passo === 'pin' ? (
          <>
            <Pressable onPress={() => irPara('primeira')}>
              <Text style={estilos.ligacao}>É a minha primeira vez aqui</Text>
            </Pressable>
            <Text style={estilos.ajuda}>
              Esqueceste-te do PIN? Passa pela receção — apagam-no ali e escolhes
              outro.
            </Text>
          </>
        ) : passo === 'primeira' ? (
          <>
            <Pressable onPress={() => irPara('pin')}>
              <Text style={estilos.ligacao}>Já tenho PIN</Text>
            </Pressable>
            <Text style={estilos.ajuda}>
              Da primeira vez entras com o telemóvel que deste na inscrição, e
              escolhes a seguir um PIN só teu.
            </Text>
          </>
        ) : (
          <Text style={estilos.ajuda}>
            Guarda-o bem: é com ele que passas a entrar. Se o esqueceres,
            apagam-no na receção e escolhes outro.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const { width: LARGURA, height: ALTURA } = Dimensions.get('window');

// Mais opaco do que o vidro habitual: por cima de uma fotografia, o
// translúcido de sempre deixava a parede a aparecer pelo meio do texto.
// É o mesmo nos campos e no botão — são a mesma coluna de caixas.
const VIDRO_DA_PORTA = 'rgba(8,20,22,0.32)';

const estilos = StyleSheet.create({
  raiz: { flex: 1 },
  // Medidas explícitas, e não `absoluteFill`: uma `Image` sem largura e altura
  // fica do tamanho natural do ficheiro e vê-se só o canto dele. Já tinha
  // acontecido com as imagens do `Fundo`.
  //
  // A altura e o topo não são os do ecrã: são os que põem a luz do candeeiro
  // a acabar onde o nome do ginásio começa, em qualquer telemóvel. As contas
  // e os porquês estão em `src/lib/porta.ts`, com testes.
  porta: {
    position: 'absolute',
    left: 0,
    top: topoDaPorta(LARGURA, ALTURA),
    width: LARGURA,
    height: alturaDaPorta(LARGURA, ALTURA),
  },
  conteudo: { padding: espaco.g, paddingTop: 80, gap: espaco.m },
  // O logotipo ja traz o circulo e o fundo: nao leva caixa nenhuma por baixo
  logo: {
    width: 132,
    height: 132,
    alignSelf: 'center',
  },
  titulo: {
    // Em ouro, como as letras de tudo o resto. O nome fica debaixo da luz do
    // candeeiro, e o ouro casa com ela melhor do que o laranja casava.
    color: cores.ouro,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    // Fica mesmo por baixo do candeeiro da fotografia, a apanhar a luz que
    // ele deita. Quem se encosta a quem é a fotografia ao nome, por isso
    // isto é zero quase sempre; num ecrã pequeno, onde ela já não pode
    // crescer, é o nome que sobe ao encontro da luz. É um desvio do que se
    // desenha, não do que se mede: o subtítulo e os campos ficam onde
    // estão. (`src/lib/porta.ts`)
    top: desvioDoNome(LARGURA, ALTURA),
    // A folga que o subtítulo deixava quando aqui estava: sem ela o primeiro
    // campo encostava-se ao nome.
    marginBottom: espaco.m,
  },
  campo: { gap: espaco.xs },
  etiqueta: { color: cores.textoSecundario, fontSize: 13, fontWeight: '600' },
  entrada: {
    ...superficie,
    backgroundColor: VIDRO_DA_PORTA,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.s,
    paddingHorizontal: espaco.m,
    paddingVertical: 14,
    color: cores.texto,
    fontSize: 17,
  },
  erro: { color: cores.vermelho, fontSize: 14 },
  // Em ouro, como as letras de tudo o que e para carregar
  ligacao: {
    color: cores.ouro,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: espaco.s,
  },
  botao: {
    // Sem o laranja, por decisão do dono: o ecrã fica mais calmo e a
    // fotografia ganha. A palavra em laranja é o que sobra a dizer que é
    // aqui que se carrega.
    backgroundColor: VIDRO_DA_PORTA,
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: raio.s,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: espaco.s,
  },
  botaoPressionado: { opacity: 0.8 },
  botaoTexto: { color: cores.ouro, fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  ajuda: {
    color: cores.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: espaco.s,
  },
});
