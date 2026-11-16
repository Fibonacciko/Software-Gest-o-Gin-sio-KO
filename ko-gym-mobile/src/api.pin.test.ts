/**
 * "É a minha primeira vez aqui" desaparece depois de haver PIN.
 *
 * Decisão do dono, novembro de 2026: quem já registou um PIN não volta a ter
 * uma primeira vez, e a linha só ocupava o ecrã e convidava a enganos.
 *
 * A marca é **deste telemóvel** e não da conta: a pergunta faz-se antes de
 * alguém dizer quem é, e nessa altura o servidor não tem a quem perguntar.
 * O que estes testes prendem é quando ela se põe e — mais importante —
 * **quando se tira**: se o balcão apagar o PIN, a primeira vez volta mesmo
 * a ser a primeira, e sem isso ficava escondida no ecrã onde faz falta.
 */

let mockGuardado: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (chave: string) => mockGuardado[chave] ?? null),
  setItem: jest.fn(async (chave: string, valor: string) => {
    mockGuardado[chave] = valor;
  }),
  removeItem: jest.fn(async (chave: string) => {
    delete mockGuardado[chave];
  }),
}));

const entradaBoa = {
  access_token: 'o-token-do-socio',
  member: { id: 'socio-1', member_number: '002', name: 'Sócio Um' },
};

function servidor(corpo: unknown, ok = true) {
  (global as unknown as { fetch: unknown }).fetch = jest.fn(async () => ({
    ok,
    status: ok ? 200 : 400,
    json: async () => corpo,
  }));
}

function apiNova() {
  let api: typeof import('./api');
  jest.isolateModules(() => {
    api = require('./api');
  });
  return api!;
}

beforeEach(() => {
  mockGuardado = {};
  jest.clearAllMocks();
});

describe('a marca de que este telemóvel já teve PIN', () => {
  it('não existe numa aplicação acabada de instalar', async () => {
    const api = apiNova();
    expect(await api.jaTemPin()).toBe(false);
  });

  it('fica depois de escolher o PIN', async () => {
    servidor(entradaBoa);
    const api = apiNova();
    await api.escolherPin('002', '919888777', '462801');
    expect(await api.jaTemPin()).toBe(true);
  });

  it('fica depois de entrar com o PIN', async () => {
    // Quem entrou com um PIN tem um PIN, mesmo que o tenha escolhido noutro
    // telemóvel ou antes de reinstalar a aplicação.
    servidor(entradaBoa);
    const api = apiNova();
    await api.entrarComPin('002', '462801');
    expect(await api.jaTemPin()).toBe(true);
  });

  it('fica depois de recuperar o PIN pelo email', async () => {
    servidor(entradaBoa);
    const api = apiNova();
    await api.recuperarOPin('002', '123456', '719204');
    expect(await api.jaTemPin()).toBe(true);
  });

  it('NÃO fica ao entrar só com o telemóvel', async () => {
    // É a primeira vez: ainda não há PIN nenhum, e o ecrã a seguir é
    // precisamente o de o escolher.
    servidor({ ...entradaBoa, precisa_de_pin: true });
    const api = apiNova();
    await api.entrarPelaPrimeiraVez('002', '919888777');
    expect(await api.jaTemPin()).toBe(false);
  });
});

describe('quando o balcão apaga o PIN', () => {
  it('a marca sai, e a primeira vez volta', async () => {
    const api = apiNova();

    servidor(entradaBoa);
    await api.entrarComPin('002', '462801');
    expect(await api.jaTemPin()).toBe(true);

    // O sócio carrega em "Esqueci-me do PIN" e o servidor diz que não há PIN
    servidor({
      enviado: false,
      motivo: 'sem_pin',
      mensagem: 'Essa conta ainda não tem PIN. Entra com o número de sócio e o telemóvel, e escolhe um.',
    });
    await api.pedirCodigoDoPin('002');

    expect(await api.jaTemPin()).toBe(false);
  });

  it('mas um motivo qualquer não a tira', async () => {
    // Não ter email na ficha não quer dizer que não tenha PIN
    const api = apiNova();

    servidor(entradaBoa);
    await api.entrarComPin('002', '462801');

    servidor({
      enviado: false,
      motivo: 'sem_email',
      mensagem: 'Não temos email na tua ficha. Passa pela receção.',
    });
    await api.pedirCodigoDoPin('002');

    expect(await api.jaTemPin()).toBe(true);
  });

  it('nem o código enviado com sucesso', async () => {
    const api = apiNova();

    servidor(entradaBoa);
    await api.entrarComPin('002', '462801');

    servidor({ enviado: true, email: 's***@exemplo.pt', minutos: 15, mensagem: 'Enviámos um código.' });
    await api.pedirCodigoDoPin('002');

    expect(await api.jaTemPin()).toBe(true);
  });
});
