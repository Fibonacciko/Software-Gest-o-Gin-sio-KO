import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { carregarCartao, sessaoGuardada, Socio } from './src/api';
import BarraDeSeparadores, { Separador } from './src/componentes/BarraDeSeparadores';
import Fundo from './src/componentes/Fundo';
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

  if (!socio) {
    return (
      <Fundo>
        <StatusBar style="light" />
        <EcraLogin aoEntrar={(s) => { setSocio(s); setSeparador('inicio'); }} />
      </Fundo>
    );
  }

  return (
    <Fundo>
      <StatusBar style="light" />

      <View style={estilos.ecra}>
        {separador === 'inicio' && (
          <EcraCartao socio={socio} aoSair={() => { setSocio(null); setSeparador('inicio'); }} />
        )}
        {separador === 'parceiros' && <EcraParceiros />}
        {separador === 'multimedia' && <EcraMultimedia />}
        {separador === 'loja' && <EcraLoja socio={socio} />}
        {separador === 'ginasio' && <EcraGinasio />}
      </View>

      <BarraDeSeparadores activo={separador} aoEscolher={setSeparador} />
    </Fundo>
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
