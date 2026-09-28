import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { carregarCartao, sessaoGuardada, Socio } from './src/api';
import EcraCartao from './src/screens/EcraCartao';
import EcraLogin from './src/screens/EcraLogin';
import { cores } from './src/theme';

export default function App() {
  const [socio, setSocio] = useState<Socio | null>(null);
  const [aArrancar, setAArrancar] = useState(true);

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

  if (aArrancar) {
    return (
      <View style={estilos.centro}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={cores.laranjaClaro} />
      </View>
    );
  }

  return (
    <View style={estilos.raiz}>
      <StatusBar style="light" />
      {socio ? (
        <EcraCartao socio={socio} aoSair={() => setSocio(null)} />
      ) : (
        <EcraLogin aoEntrar={setSocio} />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  raiz: { flex: 1, backgroundColor: cores.fundo },
  centro: {
    flex: 1,
    backgroundColor: cores.fundo,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
