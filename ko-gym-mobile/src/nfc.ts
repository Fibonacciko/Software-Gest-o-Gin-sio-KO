// Leitura do autocolante NFC colado a entrada do ginasio.
//
// O modulo nativo so existe numa build propria da aplicacao: no Expo Go e no
// navegador nao esta disponivel. Por isso e carregado com cuidado e a app
// funciona na mesma sem ele, usando o QR code.
let NfcManager: any = null;
let NfcTech: any = null;
let iniciado = false;

try {
  const modulo = require('react-native-nfc-manager');
  NfcManager = modulo.default;
  NfcTech = modulo.NfcTech;
} catch {
  NfcManager = null;
}

export async function nfcDisponivel(): Promise<boolean> {
  if (!NfcManager) return false;
  try {
    const suportado = await NfcManager.isSupported();
    if (!suportado) return false;
    if (!iniciado) {
      await NfcManager.start();
      iniciado = true;
    }
    return true;
  } catch {
    return false;
  }
}

/** Espera que o socio encoste o telemovel ao autocolante. Devolve o que leu. */
export async function lerEtiqueta(): Promise<string | null> {
  if (!NfcManager) throw new Error('Este telemóvel não suporta NFC nesta versão da app.');

  try {
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const etiqueta = await NfcManager.getTag();
    return etiqueta?.id ?? 'etiqueta';
  } finally {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch {
      // ignorado: acontece quando o utilizador cancela
    }
  }
}

export async function pararLeitura() {
  if (!NfcManager) return;
  try {
    await NfcManager.cancelTechnologyRequest();
  } catch {
    // ignorado
  }
}
