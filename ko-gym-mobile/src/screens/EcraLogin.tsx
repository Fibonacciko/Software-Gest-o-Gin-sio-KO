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
import { alturaDaPorta, desvioDoNome, topoDaPorta } from '../lib/porta';
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
