import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ComicNeue_400Regular, ComicNeue_700Bold, useFonts } from '@expo-google-fonts/comic-neue';
import { carregarCartao, sessaoGuardada, Socio } from './src/api';
import BarraDeSeparadores, { Separador } from './src/componentes/BarraDeSeparadores';
import Fundo from './src/componentes/Fundo';
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

        <View style={estilos.ecra}>
          {separador === 'inicio' && (
            <EcraCartao
              socio={socio}
              aoSair={() => { setSocio(null); setSeparador('inicio'); }}
              aoIrPara={setSeparador}
            />
          )}
          {separador === 'aulas' && <EcraAulas socio={socio} />}
          {separador === 'parceiros' && <EcraParceiros />}
          {separador === 'multimedia' && <EcraMultimedia />}
          {separador === 'loja' && <EcraLoja socio={socio} />}
          {separador === 'ginasio' && <EcraGinasio />}
        </View>

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
