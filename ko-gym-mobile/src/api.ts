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

/** Um tamanho de um artigo da montra. O `item_id` e o artigo mesmo, no Stock. */
export type TamanhoDoArtigo = {
  item_id: string;
  size?: string | null;
  quantity: number;
};

/**
 * Um artigo da montra: **um por nome e cor**.
 *
 * Os tamanhos sao coisa do Stock. Aqui vao dentro do artigo, para se
 * perguntarem na altura de reservar — nove linhas de capacete davam nove
 * cartoes iguais, so com a letra diferente.
 */
/** Uma fotografia ou um video curto do artigo. */
export type MediaDoArtigo = {
  kind: 'photo' | 'video';
  url: string;
};

export type Artigo = {
  id: string;
  name: string;
  color?: string | null;
  price: number;
  description?: string | null;
  photo_url?: string | null;   // A principal: e a que aparece na lista
  media: MediaDoArtigo[];      // Todas as fotografias e os videos
  sizes: TamanhoDoArtigo[];
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

/**
 * Uma medicao da balanca.
 *
 * Tudo opcional menos o peso e a data: nem todas as balancas dao tudo, e o
 * `bmi` vem calculado do servidor — nunca se grava, para sobreviver a uma
 * correcao do peso.
 */
export type Avaliacao = {
  id: string;
  assessment_date: string;
  weight_kg: number;
  height_cm?: number | null;
  bmi?: number | null;
  body_fat_pct?: number | null;
  muscle_mass_kg?: number | null;
  water_pct?: number | null;
  visceral_fat?: number | null;
  metabolic_age?: number | null;
  notes?: string | null;
};

export type TipoDePlano = 'training' | 'nutrition';

/**
 * Um plano de treino ou alimentar, como documento.
 *
 * Ou tem `file_url` (um PDF) ou `content` (texto escrito na gestao) — nunca
 * nenhum dos dois, que o servidor nao aceita.
 */
export type Plano = {
  id: string;
  kind: TipoDePlano;
  title: string;
  file_url?: string | null;
  content?: string | null;
  notes?: string | null;
  plan_date: string;
};

/** Uma aula num dia certo, com o que o socio tem marcado nela. */
export type Aula = {
  slot_id: string;
  class_date: string;
  activity_id: string;
  activity_name?: string | null;
  activity_color?: string | null;
  /** O nivel ou a turma: "Kids", "Nivel I/II". Vazio quando nao ha. */
  label?: string | null;
  start_time: string;
  duration_min: number;
  instructor?: string | null;
  capacity: number;
  booked: number;
  waiting: number;
  cancelled: boolean;
  note?: string | null;
  my_booking_id?: string | null;
  /** booked | waiting | attended | missed | cancelled, ou nada se nao marcou. */
  my_status?: string | null;
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

/** A evolucao do socio, da medicao mais antiga para a mais recente. */
export function carregarAvaliacoes(memberId: string) {
  return pedir<Avaliacao[]>(`/mobile/assessments/${encodeURIComponent(memberId)}`);
}

/** Os planos do socio, do mais recente para tras. */
export function carregarPlanos(memberId: string) {
  return pedir<Plano[]>(`/mobile/plans/${encodeURIComponent(memberId)}`);
}

/** O socio pede um plano novo; o pedido aparece no Painel do ginasio. */
export function pedirPlano(memberId: string, kind: TipoDePlano, note?: string) {
  return pedir<{ id: string }>('/mobile/plan-requests', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, kind, note: note ?? null }),
  });
}

/** As aulas dos proximos dias, com o estado da inscricao do socio. */
export function carregarAulas(memberId: string, dias = 14) {
  return pedir<Aula[]>(
    `/mobile/classes?member_id=${encodeURIComponent(memberId)}&dias=${dias}`
  );
}

export function marcarAula(memberId: string, slotId: string, dia: string) {
  return pedir<{ id: string; status: string }>('/mobile/bookings', {
    method: 'POST',
    body: JSON.stringify({ member_id: memberId, slot_id: slotId, class_date: dia }),
  });
}

export function desmarcarAula(bookingId: string) {
  return pedir<{ message: string }>(`/mobile/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
  });
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
 * Guarda a fotografia que o socio escolheu no telemovel.
 *
 * Vai como ficheiro, nao como JSON: por isso nao passa pelo `pedir`, que poe
 * sempre o cabecalho de JSON. A fotografia fica na ficha de membro, no mesmo
 * campo que a gestao usa.
 */
export async function guardarFotoDoSocio(
  memberId: string,
  uri: string,
  nome = 'foto.jpg'
): Promise<string> {
  const formulario = new FormData();
  // No React Native um ficheiro local vai assim; o `as any` e preciso porque
  // o FormData dos tipos da web nao conhece esta forma.
  formulario.append('ficheiro', {
    uri,
    name: nome,
    type: nome.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg',
  } as any);

  const resposta = await fetch(
    `${API_BASE}/mobile/members/${encodeURIComponent(memberId)}/photo`,
    { method: 'POST', body: formulario }
  );

  if (!resposta.ok) {
    let detalhe = 'Nao consegui guardar a fotografia.';
    try {
      const corpo = await resposta.json();
      if (corpo?.detail) detalhe = String(corpo.detail);
    } catch {
      // resposta sem corpo util
    }
    throw new Error(detalhe);
  }

  const dados = (await resposta.json()) as { photo_url: string };
  return dados.photo_url;
}

export function removerFotoDoSocio(memberId: string) {
  return pedir<{ ok: boolean }>(
    `/mobile/members/${encodeURIComponent(memberId)}/photo`,
    { method: 'DELETE' }
  );
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

/**
 * O mesmo endereco, mas pedindo a fotografia **ja encolhida**.
 *
 * As fotografias da loja sao de 1600x1600 — 2,6 milhoes de pixeis — e os
 * cartoes onde aparecem tem 360. Depois de abertas ocupam megabytes na
 * memoria, e com dezassete artigos o Android desistia de desenhar algumas:
 * ficava o cartao cinzento, sem erro nenhum. De caminho, poupa os dados de
 * quem abre a loja na rua.
 *
 * So faz sentido para ficheiros nossos (`/api/uploads/...`); um endereco de
 * fora devolve-se como esta.
 */
export function enderecoReduzido(url?: string | null, largura = 720): string | null {
  const inteiro = enderecoDaImagem(url);
  if (!inteiro || !url || !url.startsWith('/api/uploads/')) return inteiro;
  const nome = url.split('/').pop();
  if (!nome) return inteiro;
  return `${API_BASE.replace(/\/api$/, '')}/api/miniaturas/${nome}?w=${largura}`;
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
