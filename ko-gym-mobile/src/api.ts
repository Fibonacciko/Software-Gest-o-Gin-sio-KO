import AsyncStorage from '@react-native-async-storage/async-storage';

// Endereco do servidor. Em desenvolvimento aponta para o computador local;
// na aplicacao publicada aponta para o site do ginasio.
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL || 'https://ginasioko.site/api';

const CHAVE_SESSAO = 'ko-gym-sessao';

export type Socio = {
  id: string;
  member_number: string;
  name: string;
  phone: string;
  qr_code: string;
  workout_count: number;
  streak_weeks: number;
  checked_in_today: boolean;
  current_motivational_note?: string | null;
  membership_status?: string | null;
  membership_valid_until?: string | null;
  insurance_valid_until?: string | null;
  activity_ids: string[];
};

export type Modalidade = {
  id: string;
  name: string;
  color: string;
};

export type ResultadoCheckin = {
  message: string;
  already_checked_in: boolean;
  activity_name: string;
  workout_count: number;
  streak_weeks: number;
  milestone?: number | null;
  motivational_note?: string | null;
};

async function pedir<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API_BASE}${caminho}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      ...(opcoes.headers || {}),
    },
  });

  if (!resposta.ok) {
    let detalhe = 'Não foi possível falar com o ginásio.';
    try {
      const corpo = await resposta.json();
      if (corpo?.detail) detalhe = String(corpo.detail);
    } catch {
      // resposta sem corpo util
    }
    throw new Error(detalhe);
  }

  return resposta.json() as Promise<T>;
}

export async function entrar(numeroSocio: string, telefone: string) {
  const dados = await pedir<{ access_token: string; member: Socio }>(
    '/mobile/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({
        member_number: numeroSocio.trim(),
        phone: telefone.trim(),
      }),
    }
  );
  await AsyncStorage.setItem(
    CHAVE_SESSAO,
    JSON.stringify({ token: dados.access_token, memberId: dados.member.id })
  );
  return dados.member;
}

export async function sessaoGuardada(): Promise<string | null> {
  try {
    const bruto = await AsyncStorage.getItem(CHAVE_SESSAO);
    if (!bruto) return null;
    return JSON.parse(bruto).memberId ?? null;
  } catch {
    return null;
  }
}

export async function sair() {
  await AsyncStorage.removeItem(CHAVE_SESSAO);
}

export function carregarCartao(memberId: string) {
  return pedir<Socio>(`/mobile/profile?member_id=${encodeURIComponent(memberId)}`);
}

export function carregarModalidades() {
  return pedir<Modalidade[]>('/mobile/activities');
}

export function fazerCheckin(
  memberId: string,
  activityId: string | null,
  metodo: 'mobile_qr' | 'mobile_nfc'
) {
  return pedir<ResultadoCheckin>('/mobile/checkin/app', {
    method: 'POST',
    body: JSON.stringify({
      member_id: memberId,
      activity_id: activityId,
      method: metodo,
    }),
  });
}
