import {
  CANDEEIRO,
  NOME_COMECA_AOS,
  LETRA_DO_NOME,
  NOME_NAO_SOBE_ACIMA_DE,
  RACIO,
  alturaDaPorta,
  topoDaPorta,
  candeeiroNoEcra,
  luzAcabaEm,
  desvioDoNome,
} from './porta';

// O logotipo acaba aos 212 e a etiqueta do primeiro campo comeca aos 303:
// sao as duas coisas em que o nome do ginasio nao pode ir bater.
const LOGOTIPO_ACABA_AOS = 212;
const PRIMEIRA_ETIQUETA_AOS = 303;

// Os telemoveis que interessam, do mais baixo ao mais alto que se ve hoje
const ECRAS: [number, number][] = [
  [360, 780],
  [393, 800],
  [393, 852],
  [393, 873],
  [400, 895],
  [412, 915],
  [430, 950],
];

describe('a porta no ecra de entrada', () => {
  it.each(ECRAS)('em %ix%i a fotografia cobre o ecra todo', (largura, altura) => {
    const h = alturaDaPorta(largura, altura);
    const topo = topoDaPorta(largura, altura);
    expect(topo).toBeLessThanOrEqual(0);
    expect(topo + h).toBeGreaterThanOrEqual(altura);
    // E a altura e que manda no `cover`: esticada, ela ja chega para a largura
    expect(h * RACIO).toBeGreaterThanOrEqual(largura);
  });

  it.each(ECRAS)('em %ix%i o candeeiro fica no alto do ecra', (largura, altura) => {
    const candeeiro = candeeiroNoEcra(largura, altura);
    expect(candeeiro).toBeGreaterThan(0);
    // acima do nome, que e o que esta debaixo dele
    expect(candeeiro).toBeLessThan(NOME_COMECA_AOS);
  });

  it.each(ECRAS)('em %ix%i a luz acaba onde o nome comeca', (largura, altura) => {
    // Salvo nos ecras pequenos, onde a fotografia ja nao pode crescer mais:
    // ai a luz acaba mais acima e e o nome que sobe ao encontro dela.
    const luz = luzAcabaEm(largura, altura);
    expect(luz).toBeLessThanOrEqual(NOME_COMECA_AOS + 1);
    expect(luz).toBeGreaterThan(NOME_NAO_SOBE_ACIMA_DE - 1);
  });
});

describe('o nome do ginasio por baixo do candeeiro', () => {
  const nomeNoEcra = (largura: number, altura: number) => {
    const topo = NOME_COMECA_AOS + desvioDoNome(largura, altura);
    return { topo, base: topo + LETRA_DO_NOME };
  };

  it.each(ECRAS)('em %ix%i o nome comeca onde a luz acaba', (largura, altura) => {
    const luz = luzAcabaEm(largura, altura);
    const nome = nomeNoEcra(largura, altura);
    // por baixo da luz, nao por cima dela nem dentro dela
    expect(nome.topo).toBeGreaterThanOrEqual(Math.min(luz, NOME_NAO_SOBE_ACIMA_DE));
    // e encostado: um pixel de arredondamento e tudo o que se admite
    expect(nome.topo).toBeLessThanOrEqual(Math.max(luz, NOME_NAO_SOBE_ACIMA_DE) + 1);
  });

  it.each(ECRAS)('em %ix%i o nome fica dentro do cone de luz', (largura, altura) => {
    const h = alturaDaPorta(largura, altura);
    const fimDoCone = topoDaPorta(largura, altura) + 0.4 * h;
    const nome = nomeNoEcra(largura, altura);
    expect(nome.base).toBeLessThan(fimDoCone);
  });

  it.each(ECRAS)('em %ix%i o nome nao bate no logotipo nem nos campos', (largura, altura) => {
    const nome = nomeNoEcra(largura, altura);
    expect(nome.topo).toBeGreaterThan(LOGOTIPO_ACABA_AOS);
    expect(nome.base).toBeLessThan(PRIMEIRA_ETIQUETA_AOS);
  });

  it('o candeeiro nao se mexe de telemovel para telemovel, salvo nos pequenos', () => {
    const grandes = ECRAS.filter(([l, a]) => alturaDaPorta(l, a) * CANDEEIRO.base > NOME_COMECA_AOS);
    const sitios = grandes.map(([l, a]) => Math.round(luzAcabaEm(l, a)));
    expect(new Set(sitios).size).toBe(1);
    expect(sitios[0]).toBe(NOME_COMECA_AOS);
  });
});
