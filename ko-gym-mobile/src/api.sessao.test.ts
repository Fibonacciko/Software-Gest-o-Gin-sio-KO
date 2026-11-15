/**
 * O token vai em cada pedido, e um 401 devolve o sócio ao ecrã de entrada.
 *
 * As rotas `/mobile/` passaram a exigi-lo. Do lado de cá o risco é o
 * contrário do do servidor: **o token simplesmente não ir**, e aí a
 * aplicação deixa de funcionar inteira sem que nada no código esteja
 * errado à vista. Por isso o que estes testes olham é o cabeçalho que sai.
 */

type Guardado = Record<string, string>;
let mockGuardado: Guardado = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (chave: string) => mockGuardado[chave] ?? null),
  setItem: jest.fn(async (chave: string, valor: string) => {
    mockGuardado[chave] = valor;
  }),
  removeItem: jest.fn(async (chave: string) => {
    delete mockGuardado[chave];
  }),
}));

const CHAVE = 'ko-gym-sessao';

/** O que o servidor responde a uma entrada que corre bem. */
const entradaBoa = {
  access_token: 'o-token-do-socio',
  member: { id: 'socio-1', member_number: '002', name: 'Sócio Um' },
};

type Chamada = { url: string; opcoes: RequestInit };

/** Um servidor de mentira que vai guardando o que lhe pedem. */
function servidor(respostas: Array<{ ok: boolean; status?: number; corpo?: unknown }>) {
  const chamadas: Chamada[] = [];
  let i = 0;
  const falso = jest.fn(async (url: string, opcoes: RequestInit = {}) => {
    chamadas.push({ url, opcoes });
    const r = respostas[Math.min(i++, respostas.length - 1)];
    return {
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.corpo ?? {},
    };
  });
  (global as unknown as { fetch: unknown }).fetch = falso;
  return chamadas;
}

/** A api fresca, com o token em memória por estrear. */
function apiNova() {
  let api: typeof import('./api');
  jest.isolateModules(() => {
    api = require('./api');
  });
  return api!;
}

const cabecalho = (c: Chamada) =>
  (c.opcoes.headers as Record<string, string> | undefined)?.Authorization;

beforeEach(() => {
  mockGuardado = {};
  jest.clearAllMocks();
});

describe('o token em cada pedido', () => {
  it('a entrada guarda-o, e o pedido seguinte leva-o', async () => {
    const chamadas = servidor([
      { ok: true, corpo: entradaBoa },
      { ok: true, corpo: { id: 'socio-1' } },
    ]);
    const api = apiNova();

    await api.entrarComPin('002', '462801');
    await api.carregarCartao('socio-1');

    // O login não leva token — ainda não há nenhum
    expect(cabecalho(chamadas[0])).toBeUndefined();
    // O pedido a seguir já leva
    expect(cabecalho(chamadas[1])).toBe('Bearer o-token-do-socio');
  });

  it('numa aplicação reaberta, vem do disco', async () => {
    // É o caso de todos os dias: a aplicação fecha-se e abre-se, e a sessão
    // está no disco, não em memória.
    mockGuardado[CHAVE] = JSON.stringify({ token: 'o-de-ontem', memberId: 'socio-1' });
    const chamadas = servidor([{ ok: true, corpo: { id: 'socio-1' } }]);
    const api = apiNova();

    await api.carregarCartao('socio-1');
    expect(cabecalho(chamadas[0])).toBe('Bearer o-de-ontem');
  });

  it('a fotografia também o leva, e vai como ficheiro', async () => {
    // Não passa pelo `pedir`, por ser multipart: era o sítio certo para o
    // token ficar esquecido.
    mockGuardado[CHAVE] = JSON.stringify({ token: 'o-token-do-socio', memberId: 'socio-1' });
    const chamadas = servidor([{ ok: true, corpo: { photo_url: '/api/uploads/a.jpg' } }]);
    const api = apiNova();

    await api.guardarFotoDoSocio('socio-1', 'file:///foto.jpg');

    expect(cabecalho(chamadas[0])).toBe('Bearer o-token-do-socio');
    // E sem `Content-Type` nosso: quem o põe é o FormData, com a fronteira
    expect((chamadas[0].opcoes.headers as Record<string, string>)['Content-Type'])
      .toBeUndefined();
  });

  it('sem sessão nenhuma, não inventa cabeçalho', async () => {
    const chamadas = servidor([{ ok: true, corpo: [] }]);
    const api = apiNova();

    await api.carregarParceiros();
    expect(cabecalho(chamadas[0])).toBeUndefined();
  });
});

describe('quando o servidor diz que a sessão acabou', () => {
  it('esquece-a e avisa quem estiver à espera', async () => {
    mockGuardado[CHAVE] = JSON.stringify({ token: 'o-velho', memberId: 'socio-1' });
    servidor([{ ok: false, status: 401, corpo: { detail: 'A tua sessão terminou.' } }]);
    const api = apiNova();

    let avisou = false;
    api.aoPerderASessao(() => {
      avisou = true;
    });

    await expect(api.carregarCartao('socio-1')).rejects.toThrow('A tua sessão terminou.');
    expect(avisou).toBe(true);
    expect(mockGuardado[CHAVE]).toBeUndefined();
    expect(await api.sessaoGuardada()).toBeNull();
  });

  it('um PIN errado no ecrã de entrada não é perder a sessão', async () => {
    // O login responde 401 quando o PIN não confere. Aí não há sessão
    // nenhuma para perder: é um erro para ler, não um motivo para sair.
    servidor([{ ok: false, status: 401, corpo: { detail: 'Número de sócio ou PIN não conferem.' } }]);
    const api = apiNova();

    let avisou = false;
    api.aoPerderASessao(() => {
      avisou = true;
    });

    await expect(api.entrarComPin('002', '000001')).rejects.toThrow(/não conferem/);
    expect(avisou).toBe(false);
  });

  it('sair esquece o token, e o pedido seguinte vai sem ele', async () => {
    mockGuardado[CHAVE] = JSON.stringify({ token: 'o-token-do-socio', memberId: 'socio-1' });
    const chamadas = servidor([{ ok: true, corpo: {} }, { ok: true, corpo: [] }]);
    const api = apiNova();

    await api.carregarCartao('socio-1');
    expect(cabecalho(chamadas[0])).toBe('Bearer o-token-do-socio');

    await api.sair();
    await api.carregarParceiros();
    expect(cabecalho(chamadas[1])).toBeUndefined();
  });
});
