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
  photo_url?: string | null;
};

export type Parceiro = {
  id: string;
  name: string;
  benefit: string;
  category?: string | null;
  description?: string | null;
  logo_url?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type ItemMultimedia = {
  id: string;
  kind: 'photo' | 'video_link';
  url: string;
  caption?: string | null;
  taken_on?: string | null;
};

export type Artigo = {
  id: string;
  name: string;
  size?: string | null;
  color?: string | null;
  price: number;
  quantity: number;
  description?: string | null;
  photo_url?: string | null;
};

export type FichaDoGinasio = {
  name: string;
  about?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  hours?: string | null;
  maps_url?: string | null;
  review_url?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  photo_url?: string | null;
};

export type Reserva = {
  id: string;
  item_name: string;
  item_details?: string | null;
  quantity: number;
  status: 'pending' | 'ready' | 'delivered' | 'cancelled';
  created_at: string;
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

export function carregarParceiros() {
  return pedir<Parceiro[]>('/mobile/partners');
}

export function carregarMultimedia() {
  return pedir<ItemMultimedia[]>('/mobile/media');
}

export function carregarFichaDoGinasio() {
  return pedir<FichaDoGinasio>('/mobile/gym-info');
}

export function carregarMontra() {
  return pedir<Artigo[]>('/mobile/shop');
}

export function carregarReservas(memberId: string) {
  return pedir<Reserva[]>(`/mobile/reservations/${encodeURIComponent(memberId)}`);
}

export function reservarArtigo(memberId: string, itemId: string, quantidade: number) {
  return pedir<Reserva>('/mobile/reservations', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, item_id: itemId, quantity: quantidade }),
  });
}

/**
 * O endereco completo de uma imagem do servidor.
 *
 * O servidor devolve caminhos como /api/uploads/abc.jpg, que sao relativos ao
 * site. A aplicacao precisa do endereco inteiro.
 */
export function enderecoDaImagem(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE.replace(/\/api$/, '')}${url}`;
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
