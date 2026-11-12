import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComicNeue_400Regular, ComicNeue_700Bold, useFonts } from '@expo-google-fonts/comic-neue';
import { carregarCartao, sessaoGuardada, Socio } from './src/api';
import BarraDeSeparadores, {
  ORDEM_DOS_SEPARADORES,
  Separador,
} from './src/componentes/BarraDeSeparadores';
import Fundo from './src/componentes/Fundo';
import { ContextoDaTira } from './src/componentes/Tira';
import EcraAulas from './src/screens/EcraAulas';
import EcraCartao from './src/screens/EcraCartao';
import EcraGinasio from './src/screens/EcraGinasio';
import EcraLogin from './src/screens/EcraLogin';
import EcraLoja from './src/screens/EcraLoja';
import EcraMultimedia from './src/screens/EcraMultimedia';
import EcraParceiros from './src/screens/EcraParceiros';
import { cores } from './src/theme';

export default function App() {
  const [socio, setSocio] = useState<Socio | null>(null);
  const [aArrancar, setAArrancar] = useState(true);
  const [separador, setSeparador] = useState<Separador>('inicio');

  // ------------------------------------------------- deslizar entre ecrãs
  //
  // Os seis ecrãs vivem lado a lado numa tira que desliza, e a barra de baixo
  // passa a ser só a outra maneira de lá chegar. Continua a não haver
  // biblioteca de navegação: uma `ScrollView` com páginas chega, e não traz
  // dependências a uma aplicação que se instala à mão.
  const tira = useRef<ScrollView>(null);
  const [largura, setLargura] = useState(() => Dimensions.get('window').width);
  // **Só se monta o que já foi visto.** Montar os seis ao arrancar punha seis
  // ecrãs a pedir dados ao servidor ao mesmo tempo, para ver um. O lugar de
  // cada um está sempre lá, vazio, para as contas do deslize baterem certo.
  const [vistos, setVistos] = useState<Separador[]>(['inicio']);

  // Quando é o dedo a mandar, a tira já está onde tem de estar: mandá-la
  // para lá outra vez fazia-a saltar debaixo do dedo de quem a arrasta.
  const veioDoDedo = useRef(false);

  // A galeria de fotografias de um artigo desliga a tira enquanto tem o dedo
  // em cima. Em Android quem está por fora intercepta o arrasto horizontal
  // assim que o detecta, e a fotografia quase nunca chegava a mexer-se.
  const [tiraPresa, setTiraPresa] = useState(false);
  const tiraDeFora = useMemo(() => ({ bloquear: setTiraPresa }), []);

  useEffect(() => {
    setVistos((v) => (v.includes(separador) ? v : [...v, separador]));
    if (veioDoDedo.current) {
      veioDoDedo.current = false;
      return;
    }
    const i = ORDEM_DOS_SEPARADORES.indexOf(separador);
    if (i >= 0 && largura > 0) tira.current?.scrollTo({ x: i * largura, animated: true });
  }, [separador, largura]);

  // Segue o deslize enquanto ele acontece: a barra de baixo acende o
  // separador novo quando a página passa de meio, e não só quando ela
  // assenta. Esperar pelo fim dava uma barra sempre meio passo atrás.
  const aoDeslizar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (largura <= 0) return;
    const alvo = ORDEM_DOS_SEPARADORES[Math.round(e.nativeEvent.contentOffset.x / largura)];
    if (alvo && alvo !== separador) {
      veioDoDedo.current = true;
      setSeparador(alvo);
    }
  };

  const ecraDe = (id: Separador) => {
    if (!socio) return null;
    if (id === 'inicio') {
      return (
        <EcraCartao
          socio={socio}
          aoSair={() => {
            setSocio(null);
            setSeparador('inicio');
            setVistos(['inicio']);
          }}
        />
      );
    }
    if (id === 'aulas') return <EcraAulas socio={socio} />;
    if (id === 'parceiros') return <EcraParceiros />;
    if (id === 'multimedia') return <EcraMultimedia />;
    if (id === 'loja') return <EcraLoja socio={socio} />;
    return <EcraGinasio />;
  };
  // A fonte do nome no cartao, parecida com a Comic Sans MS. Se falhar o
  // carregamento seguimos em frente: o sistema escolhe a sua e ninguem fica
  // sem app por causa de uma letra.
  const [fontesProntas, erroDasFontes] = useFonts({ ComicNeue_400Regular, ComicNeue_700Bold });

  // O socio fica com sessao iniciada; a app abre logo no cartao
  useEffect(() => {
    (async () => {
      try {
        const memberId = await sessaoGuardada();
        if (memberId) setSocio(await carregarCartao(memberId));
      } catch {
        // sessao invalida ou sem rede: mostra o login
      } finally {
        setAArrancar(false);
      }
    })();
  }, []);

  if (aArrancar || (!fontesProntas && !erroDasFontes)) {
    return (
      <SafeAreaProvider>
        <View style={estilos.centro}>
          <StatusBar style="light" />
          <ActivityIndicator size="large" color={cores.laranjaClaro} />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!socio) {
    return (
      <SafeAreaProvider>
        <Fundo>
          <StatusBar style="light" />
          <EcraLogin aoEntrar={(s) => { setSocio(s); setSeparador('inicio'); }} />
        </Fundo>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Fundo>
        <StatusBar style="light" />

        <ScrollView
          ref={tira}
          horizontal
          pagingEnabled
          // Desligada enquanto o dedo está em cima de uma galeria de
          // fotografias: senão era ela a levar o gesto, e a fotografia não
          // mexia. Ver `ContextoDaTira`.
          scrollEnabled={!tiraPresa}
          showsHorizontalScrollIndicator={false}
          onScroll={aoDeslizar}
          onMomentumScrollEnd={aoDeslizar}
          scrollEventThrottle={32}
          // A largura é a que o ecrã mede, e não a do aparelho: num
          // telemóvel com a barra lateral de outra aplicação ao lado, as
          // páginas ficavam desencontradas do deslize.
          onLayout={(e) => setLargura(e.nativeEvent.layout.width)}
          keyboardShouldPersistTaps="handled"
          style={estilos.ecra}
        >
          {ORDEM_DOS_SEPARADORES.map((id) => (
            <View key={id} style={{ width: largura }}>
              <ContextoDaTira.Provider value={tiraDeFora}>
                {vistos.includes(id) ? ecraDe(id) : null}
              </ContextoDaTira.Provider>
            </View>
          ))}
        </ScrollView>

        <BarraDeSeparadores activo={separador} aoEscolher={setSeparador} />
      </Fundo>
    </SafeAreaProvider>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  ecra: { flex: 1 },
  centro: {
    flex: 1,
    backgroundColor: cores.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
