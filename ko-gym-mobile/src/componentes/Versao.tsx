import * as Application from 'expo-application';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { StyleSheet, Text } from 'react-native';
import { cores, espaco } from '../theme';

/**
 * A versão que está mesmo a correr, em letra miudinha.
 *
 * São duas coisas diferentes e por isso aparecem as duas:
 *
 * - a **versão da aplicação** (1.1.8), que só muda quando se instala um
 *   ficheiro novo;
 * - as **últimas letras da atualização** que veio pelo ar, que muda sempre
 *   que publicamos uma correção sem passar por instalação nenhuma.
 *
 * Sem isto não havia maneira de saber, ao telefone com um sócio, se ele já
 * tem a correção ou se ainda está na versão antiga.
 */
export default function Versao() {
  // A versão instalada. Fora do telemóvel (no navegador, em
  // desenvolvimento) não existe, e aí vale a que está no app.json.
  const aplicacao =
    Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '—';

  // Numa aplicação acabada de instalar ainda não veio nada pelo ar
  const atualizacao = Updates.updateId ? Updates.updateId.slice(0, 6) : null;

  return (
    <Text style={estilos.texto}>
      Versão {aplicacao}
      {atualizacao ? ` · ${atualizacao}` : ''}
    </Text>
  );
}

const estilos = StyleSheet.create({
  texto: {
    color: cores.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
    opacity: 0.6,
    paddingBottom: espaco.s,
  },
});
