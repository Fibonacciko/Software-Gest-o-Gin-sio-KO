/**
 * Testes das contas dos Relatórios.
 *
 * Correr com: yarn test --watchAll=false
 *
 * O que estes testes protegem, por ordem de importância:
 *
 * 1. **O último dia do período conta.** As datas são guardadas com hora
 *    (`2026-07-31T00:00:00+00:00`). No horário de verão, lida como data
 *    local isso dá 1h da manhã, e um `<=` contra a meia-noite do último dia
 *    deixava o dia de fora. Era o erro que já tinha aparecido no servidor.
 * 2. **O dia da semana.** Pelo mesmo motivo, um registo podia ser contado no
 *    dia errado — e a conta de "que dia tem mais alunos" ficava torta.
 * 3. **O período de comparação** tem o mesmo número de dias e acaba na
 *    véspera do atual.
 * 4. **Faturação menos despesa** dá o resultado líquido, com o merchandise
 *    incluído na faturação.
 */
import {
  partesDaData, numeroDaData, dentroDoIntervalo, diaDaSemana, chaveDoMes,
  rotuloDoMes, diasDoIntervalo, intervaloAnterior, variacao, agrupar, maiorDe,
  porOrdemDeValor, mesesDoIntervalo, idade, escalaoEtario, modalidadesDoSocio,
  estaAtivo, estatisticasDePresencas, estatisticasFinanceiras,
  estatisticasDeSocios, destaquesDoAno, anosComDados, parteDoSeguro, NOMES_DIAS, SEMANA,
  INICIO_DAS_CONTAS, desdeOInicioDasContas, anteriorAoInicioDasContas, dataDasContas
} from './estatisticas';

/* ------------------------------------------------------------------ datas */

describe('leitura das datas', () => {
  test('aceita um ano/mes/dia já separado', () => {
    // Os destaques do ano passam os limites assim: se isto devolvesse null,
    // o filtro deixava de ter limites e contava todos os anos de uma vez.
    expect(partesDaData({ ano: 2026, mes: 1, dia: 1 })).toEqual({ ano: 2026, mes: 1, dia: 1 });
    expect(partesDaData({ ano: 2026 })).toBeNull();
  });

  test('lê o dia do próprio texto, com ou sem hora', () => {
    expect(partesDaData('2026-07-31')).toEqual({ ano: 2026, mes: 7, dia: 31 });
    expect(partesDaData('2026-07-31T00:00:00+00:00')).toEqual({ ano: 2026, mes: 7, dia: 31 });
  });

  test('aceita um Date e devolve o dia local', () => {
    expect(partesDaData(new Date(2026, 6, 31))).toEqual({ ano: 2026, mes: 7, dia: 31 });
  });

  test('datas impossíveis devolvem null em vez de números errados', () => {
    expect(partesDaData('')).toBeNull();
    expect(partesDaData(null)).toBeNull();
    expect(partesDaData('xpto')).toBeNull();
    expect(numeroDaData(undefined)).toBeNull();
  });

  test('compara como número, sem fusos horários', () => {
    expect(numeroDaData('2026-07-31T00:00:00+00:00')).toBe(20260731);
  });
});

describe('o último dia do período conta', () => {
  // Julho é horário de verão em Portugal: é aqui que o erro aparecia.
  test('um registo do último dia entra no intervalo', () => {
    expect(dentroDoIntervalo('2026-07-31T00:00:00+00:00', new Date(2026, 6, 1), new Date(2026, 6, 31)))
      .toBe(true);
  });

  test('e o do primeiro dia também', () => {
    expect(dentroDoIntervalo('2026-07-01T00:00:00+00:00', new Date(2026, 6, 1), new Date(2026, 6, 31)))
      .toBe(true);
  });

  test('o dia seguinte fica de fora', () => {
    expect(dentroDoIntervalo('2026-08-01', new Date(2026, 6, 1), new Date(2026, 6, 31))).toBe(false);
  });

  test('um só dia encontra o que aconteceu nesse dia', () => {
    const dia = new Date(2026, 6, 15);
    expect(dentroDoIntervalo('2026-07-15T00:00:00+00:00', dia, dia)).toBe(true);
    expect(dentroDoIntervalo('2026-07-16T00:00:00+00:00', dia, dia)).toBe(false);
  });
});

describe('dia da semana', () => {
  test('não escorrega por causa do fuso horário', () => {
    // 5 de outubro de 2026 foi uma segunda-feira.
    expect(NOMES_DIAS[diaDaSemana('2026-10-05')]).toBe('Segunda-feira');
    expect(NOMES_DIAS[diaDaSemana('2026-10-05T00:00:00+00:00')]).toBe('Segunda-feira');
    // 12 de julho de 2026, em horário de verão, foi um domingo.
    expect(NOMES_DIAS[diaDaSemana('2026-07-12T00:00:00+00:00')]).toBe('Domingo');
  });
});

describe('ordem da semana', () => {
  test('mostra-se de segunda a domingo, como em Portugal', () => {
    expect(SEMANA[0]).toBe('Segunda-feira');
    expect(SEMANA[6]).toBe('Domingo');
  });

  test('tem os mesmos sete dias que a tabela do getDay()', () => {
    expect([...SEMANA].sort()).toEqual([...NOMES_DIAS].sort());
  });
});

describe('meses', () => {
  test('a chave do mês ordena bem', () => {
    expect(chaveDoMes('2026-07-31')).toBe('2026-07');
    expect(['2026-10', '2026-07', '2026-01'].sort()).toEqual(['2026-01', '2026-07', '2026-10']);
  });

  test('o rótulo é legível', () => {
    expect(rotuloDoMes('2026-07')).toBe('Julho 2026');
  });

  test('lista os meses entre dois extremos, incluindo os dois', () => {
    expect(mesesDoIntervalo(new Date(2025, 10, 15), new Date(2026, 1, 3)))
      .toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

/* ------------------------------------------------------------- comparações */

describe('período de comparação', () => {
  test('um mês compara com o mês anterior, dia a dia', () => {
    const { inicio, fim } = intervaloAnterior(new Date(2026, 6, 1), new Date(2026, 6, 31));
    expect(partesDaData(fim)).toEqual({ ano: 2026, mes: 6, dia: 30 });
    // Julho tem 31 dias, por isso recua 31 dias: 30 de junho para trás.
    expect(diasDoIntervalo(inicio, fim)).toBe(31);
  });

  test('o período anterior acaba sempre na véspera', () => {
    const { fim } = intervaloAnterior(new Date(2026, 0, 1), new Date(2026, 11, 31));
    expect(partesDaData(fim)).toEqual({ ano: 2025, mes: 12, dia: 31 });
  });

  test('conta os dois extremos', () => {
    expect(diasDoIntervalo(new Date(2026, 6, 1), new Date(2026, 6, 31))).toBe(31);
    expect(diasDoIntervalo(new Date(2026, 6, 15), new Date(2026, 6, 15))).toBe(1);
  });
});

describe('variação', () => {
  test('sobe, desce e fica igual', () => {
    expect(variacao(120, 100)).toMatchObject({ absoluta: 20, percentagem: 20, sentido: 'subiu' });
    expect(variacao(80, 100)).toMatchObject({ absoluta: -20, percentagem: -20, sentido: 'desceu' });
    expect(variacao(100, 100)).toMatchObject({ absoluta: 0, percentagem: 0, sentido: 'igual' });
  });

  test('sem período anterior não inventa percentagem', () => {
    expect(variacao(50, 0).percentagem).toBeNull();
    expect(variacao(50, 0).absoluta).toBe(50);
  });

  test('a percentagem funciona a partir de um valor negativo', () => {
    // De -100 para -50 é uma melhoria de 50%.
    expect(variacao(-50, -100).percentagem).toBe(50);
  });
});

/* ------------------------------------------------------------ agrupamentos */

describe('agrupar e ordenar', () => {
  const vendas = [
    { artigo: 'Luvas', valor: 30 },
    { artigo: 'Luvas', valor: 20 },
    { artigo: 'Ligaduras', valor: 5 },
    { artigo: null, valor: 99 }
  ];

  test('soma por chave e ignora chaves vazias', () => {
    expect(agrupar(vendas, (v) => v.artigo, (v) => v.valor)).toEqual({ Luvas: 50, Ligaduras: 5 });
  });

  test('sem valor, conta registos', () => {
    expect(agrupar(vendas, (v) => v.artigo)).toEqual({ Luvas: 2, Ligaduras: 1 });
  });

  test('o maior é o maior', () => {
    expect(maiorDe({ Luvas: 50, Ligaduras: 5 })).toEqual({ chave: 'Luvas', valor: 50 });
  });

  test('sem nada acima de zero, não há maior', () => {
    expect(maiorDe({})).toBeNull();
    expect(maiorDe({ Luvas: 0 })).toBeNull();
  });

  test('a ordem é do maior para o menor', () => {
    expect(porOrdemDeValor({ a: 1, b: 9, c: 5 }, 2))
      .toEqual([{ chave: 'b', valor: 9 }, { chave: 'c', valor: 5 }]);
  });
});

/* ------------------------------------------------------------------ sócios */

describe('idades', () => {
  const hoje = new Date(2026, 9, 5);   // 5 de outubro de 2026

  test('conta anos completos', () => {
    expect(idade('1990-10-05', hoje)).toBe(36);
    expect(idade('1990-10-06', hoje)).toBe(35);   // ainda não fez anos
  });

  test('datas impossíveis não contam', () => {
    expect(idade(null, hoje)).toBeNull();
    expect(idade('2030-01-01', hoje)).toBeNull();
  });

  test('os escalões cobrem todas as idades', () => {
    expect(escalaoEtario(10)).toBe('Até 17');
    expect(escalaoEtario(18)).toBe('18 a 29');
    expect(escalaoEtario(44)).toBe('30 a 44');
    expect(escalaoEtario(59)).toBe('45 a 59');
    expect(escalaoEtario(90)).toBe('60 ou mais');
  });
});

describe('modalidades do sócio', () => {
  test('vale a lista nova', () => {
    expect(modalidadesDoSocio({ activity_ids: ['a', 'b'], activity_id: 'c' })).toEqual(['a', 'b']);
  });

  test('sem lista, vale a antiga', () => {
    expect(modalidadesDoSocio({ activity_ids: [], activity_id: 'c' })).toEqual(['c']);
  });

  test('sem nenhuma, é lista vazia', () => {
    expect(modalidadesDoSocio({})).toEqual([]);
  });
});

describe('quem está ativo', () => {
  const hoje = new Date(2026, 9, 5);

  test('manda o estado calculado pelo servidor', () => {
    expect(estaAtivo({ membership_status: 'active' }, hoje)).toBe(true);
    expect(estaAtivo({ membership_status: 'inactive' }, hoje)).toBe(false);
  });

  test('uma suspensão manda sempre', () => {
    expect(estaAtivo({ status: 'suspended', membership_status: 'active' }, hoje)).toBe(false);
  });

  test('sem estado calculado, vale a validade da quota', () => {
    expect(estaAtivo({ membership_valid_until: '2026-10-05' }, hoje)).toBe(true);
    expect(estaAtivo({ membership_valid_until: '2026-10-04' }, hoje)).toBe(false);
    expect(estaAtivo({}, hoje)).toBe(false);
  });
});

/* -------------------------------------------------------------- presenças */

describe('estatísticas de presenças', () => {
  const modalidades = [{ id: 'bx', name: 'Boxe' }, { id: 'kb', name: 'Kickboxing' }];
  const membros = [{ id: 'm1', name: 'Ana' }, { id: 'm2', name: 'Bruno' }];
  const presencas = [
    // Outubro de 2026 (período em análise)
    { member_id: 'm1', activity_id: 'bx', check_in_date: '2026-10-01' },
    { member_id: 'm1', activity_id: 'bx', check_in_date: '2026-10-05' },
    { member_id: 'm2', activity_id: 'kb', check_in_date: '2026-10-05' },
    { member_id: 'm1', activity_id: 'bx', check_in_date: '2026-10-31' },  // último dia
    // Setembro de 2026 (período de comparação)
    { member_id: 'm1', activity_id: 'bx', check_in_date: '2026-09-10' },
    { member_id: 'm2', activity_id: 'bx', check_in_date: '2026-09-11' }
  ];
  const inicio = new Date(2026, 9, 1);
  const fim = new Date(2026, 9, 31);
  const r = estatisticasDePresencas({ presencas, membros, modalidades, inicio, fim });

  test('conta o período todo, incluindo o último dia', () => {
    expect(r.total).toBe(4);
  });

  test('conta sócios diferentes, não visitas', () => {
    expect(r.unicos).toBe(2);
  });

  test('a média diária é o total a dividir pelos dias do período', () => {
    expect(r.mediaDiaria).toBeCloseTo(4 / 31);
  });

  test('compara com o mês anterior', () => {
    expect(r.comparacao.total).toMatchObject({ atual: 4, anterior: 2, absoluta: 2 });
  });

  test('reparte por modalidade', () => {
    expect(r.porModalidade).toEqual({ Boxe: 3, Kickboxing: 1 });
  });

  test('reparte por dia da semana', () => {
    // 1 de outubro de 2026 foi quinta, 5 foi segunda, 31 foi sábado.
    expect(r.porDiaDaSemana).toEqual({
      'Quinta-feira': 1, 'Segunda-feira': 2, 'Sábado': 1
    });
  });

  test('os mais assíduos vêm por ordem', () => {
    expect(r.maisAssiduos[0]).toEqual({ nome: 'Ana', valor: 3 });
  });

  test('uma presença sem modalidade não é perdida', () => {
    const semModalidade = estatisticasDePresencas({
      presencas: [{ member_id: 'm1', check_in_date: '2026-10-02' }],
      membros, modalidades, inicio, fim
    });
    expect(semModalidade.total).toBe(1);
    expect(semModalidade.porModalidade).toEqual({ 'Sem modalidade': 1 });
  });
});

/* --------------------------------------------------------------- finanças */

describe('estatísticas financeiras', () => {
  // Novembro, e outubro como mes de comparacao: setembro e anterior ao
  // inicio das contas e ja nao serve de termo de comparacao
  const inicio = new Date(2026, 10, 1);
  const fim = new Date(2026, 10, 30);
  const pagamentos = [
    { status: 'paid', amount: 35, payment_type: 'quota', payment_method: 'cash', payment_date: '2026-11-05' },
    { status: 'paid', amount: 20, payment_type: 'seguro', payment_method: 'cash', payment_date: '2026-11-05' },
    { status: 'paid', amount: 55, payment_type: 'quota_seguro', payment_method: 'mbway', payment_date: '2026-11-30' },
    { status: 'pending', amount: 35, payment_type: 'quota', payment_method: 'cash', payment_date: '2026-11-10' },
    { status: 'paid', amount: 100, payment_type: 'quota', payment_method: 'cash', payment_date: '2026-10-15' }
  ];
  const vendas = [
    { total: 12, quantity: 1, item_name: 'Luvas', sale_date: '2026-11-05' },
    { total: 8, quantity: 2, item_name: 'Ligaduras', sale_date: '2026-10-20' }
  ];
  const despesas = [
    { amount: 30, category: 'rent', expense_date: '2026-11-05' },
    { amount: 100, category: 'rent', expense_date: '2026-10-20' }
  ];
  const experimentais = [
    { amount: 5, activity_name: 'Boxe', trial_date: '2026-11-07' },
    { amount: 5, activity_name: 'Boxe', trial_date: '2026-11-30' },
    { amount: 5, activity_name: 'Kickboxing', trial_date: '2026-10-09' }
  ];
  const r = estatisticasFinanceiras({ pagamentos, despesas, vendas, experimentais, inicio, fim });

  test('a faturação são as quotas pagas, o merchandise e as experimentais', () => {
    // 35 + 20 + 55 (pagos) + 12 (venda) + 10 (2 experimentais) = 132.
    // O pagamento pendente não conta.
    expect(r.faturacao).toBe(132);
    expect(r.receitaQuotas).toBe(110);
    expect(r.merchandise).toBe(12);
    expect(r.experimentais).toBe(10);
    expect(r.nExperimentais).toBe(2);
  });

  test('o resultado líquido é a faturação menos a despesa', () => {
    expect(r.despesa).toBe(30);
    expect(r.liquido).toBe(132 - 30);
    expect(r.liquido).toBe(r.faturacao - r.despesa);
  });

  test('uma experimental oferecida conta como aula mas não como receita', () => {
    const comOferta = estatisticasFinanceiras({
      experimentais: [{ amount: 0, activity_name: 'Boxe', trial_date: '2026-11-07' }],
      inicio, fim
    });
    expect(comOferta.nExperimentais).toBe(1);
    expect(comOferta.experimentais).toBe(0);
    expect(comOferta.faturacao).toBe(0);
  });

  test('sem experimentais, a faturação é a de sempre', () => {
    const semTrials = estatisticasFinanceiras({ pagamentos, despesas, vendas, inicio, fim });
    expect(semTrials.faturacao).toBe(122);
  });

  test('num pagamento de inscrição, 20 € são seguro e o resto quota', () => {
    expect(parteDoSeguro({ payment_type: 'quota_seguro', amount: 55 })).toBe(20);
    expect(parteDoSeguro({ payment_type: 'seguro', amount: 20 })).toBe(20);
    expect(parteDoSeguro({ payment_type: 'quota', amount: 35 })).toBe(0);
    expect(r.seguros).toBe(40);   // 20 do seguro + 20 da inscrição
  });

  test('um pagamento pendente não é faturação, mas é contado como pendente', () => {
    expect(r.pendentes).toBe(1);
    expect(r.nPagamentos).toBe(3);
  });

  test('compara com o mês anterior', () => {
    // Outubro: 100 de quota + 8 de venda + 5 de experimental = 113.
    expect(r.comparacao.faturacao).toMatchObject({ atual: 132, anterior: 113 });
    expect(r.comparacao.liquido).toMatchObject({ atual: 102, anterior: 13 });
    expect(r.comparacao.experimentais).toMatchObject({ atual: 10, anterior: 5 });
  });

  test('o pagamento e a experimental do último dia do mês contam', () => {
    // Se o dia 30 fosse excluído, faltavam 55 de quota e 5 de experimental.
    expect(r.faturacao).toBe(132);
  });

  test('a faturação por mês soma o mesmo que o total', () => {
    const soma = Object.values(r.faturacaoPorMes).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(r.faturacao);
  });

  test('a despesa por categoria soma o mesmo que o total', () => {
    const soma = Object.values(r.despesaPorCategoria).reduce((a, b) => a + b, 0);
    expect(soma).toBeCloseTo(r.despesa);
  });

  test('sem faturação não há margem a mostrar', () => {
    const vazio = estatisticasFinanceiras({ inicio, fim });
    expect(vazio.faturacao).toBe(0);
    expect(vazio.margem).toBeNull();
    expect(vazio.pagamentoMedio).toBe(0);
  });
});

/* ----------------------------------------------------------------- sócios */

describe('estatísticas de sócios', () => {
  const hoje = new Date(2026, 9, 5);
  const modalidades = [{ id: 'bx', name: 'Boxe' }, { id: 'kb', name: 'Kickboxing' }];
  const membros = [
    { id: '1', join_date: '2026-10-01', date_of_birth: '1990-01-01', activity_ids: ['bx'], membership_status: 'active' },
    { id: '2', join_date: '2026-10-31', date_of_birth: '2000-01-01', activity_ids: ['bx', 'kb'], membership_status: 'inactive' },
    { id: '3', join_date: '2026-09-15', date_of_birth: '1980-01-01', activity_ids: [], activity_id: 'kb', membership_status: 'active' },
    { id: '4', join_date: '2025-01-01', date_of_birth: '1970-01-01', activity_ids: [], membership_status: 'inactive' }
  ];
  const r = estatisticasDeSocios({
    membros, modalidades, inicio: new Date(2026, 9, 1), fim: new Date(2026, 9, 31), hoje
  });

  test('conta os novos do período, incluindo o último dia', () => {
    expect(r.novos).toBe(2);
  });

  test('compara as inscrições com o período anterior', () => {
    expect(r.comparacao.novos).toMatchObject({ atual: 2, anterior: 1 });
  });

  test('um sócio com duas modalidades conta nas duas', () => {
    expect(r.porModalidade).toEqual({ Boxe: 2, Kickboxing: 2 });
  });

  test('conta quem está com a quota em dia', () => {
    expect(r.ativos).toBe(2);
    expect(r.inativos).toBe(2);
    expect(r.percentagemAtivos).toBe(50);
  });

  test('assinala quem não tem modalidade atribuída', () => {
    expect(r.semModalidade).toBe(1);
  });

  test('a idade média é dos sócios todos', () => {
    // 36, 26, 46 e 56 anos
    expect(r.idadeMedia).toBeCloseTo((36 + 26 + 46 + 56) / 4);
  });
});

/* -------------------------------------------------------------- destaques */

describe('destaques do ano', () => {
  const modalidades = [{ id: 'bx', name: 'Boxe' }, { id: 'kb', name: 'Kickboxing' }];
  const membros = [
    { id: '1', join_date: '2026-03-10', date_of_birth: '1990-01-01', activity_ids: ['bx'], membership_status: 'active' },
    { id: '2', join_date: '2026-03-20', date_of_birth: '1995-01-01', activity_ids: ['bx'], membership_status: 'active' },
    { id: '3', join_date: '2026-07-01', date_of_birth: '1985-01-01', activity_ids: ['kb'], membership_status: 'inactive' }
  ];
  const presencas = [
    { member_id: '1', activity_id: 'bx', check_in_date: '2026-03-02' },   // segunda
    { member_id: '1', activity_id: 'bx', check_in_date: '2026-03-09' },   // segunda
    { member_id: '2', activity_id: 'bx', check_in_date: '2026-03-16' },   // segunda
    { member_id: '3', activity_id: 'kb', check_in_date: '2026-04-07' },   // terça
    { member_id: '1', activity_id: 'bx', check_in_date: '2025-05-05' }    // outro ano
  ];
  const d = destaquesDoAno({
    ano: 2026, presencas, membros, modalidades,
    // O dinheiro e de depois do inicio das contas; as presencas e as
    // inscricoes acima sao de marco e contam na mesma
    experimentais: [
      { activity_name: 'Boxe', trial_date: '2026-11-10', amount: 5 },
      { activity_name: 'Boxe', trial_date: '2026-11-11', amount: 5 },
      { activity_name: 'Kickboxing', trial_date: '2026-12-02', amount: 0 }
    ],
    pagamentos: [{ status: 'paid', amount: 200, payment_date: '2026-10-05' }],
    vendas: [{ total: 50, sale_date: '2026-11-02' }],
    despesas: [{ amount: 500, expense_date: '2026-11-20' }],
    hoje: new Date(2026, 9, 5)
  });

  const nota = (titulo) => d.notas.find((n) => n.titulo === titulo)?.texto || '';

  test('só olha para o ano pedido', () => {
    expect(d.totais.presencas).toBe(4);
  });

  test('diz qual foi o mês mais concorrido', () => {
    expect(nota('Mês mais concorrido')).toContain('Março 2026');
    expect(nota('Mês mais concorrido')).toContain('3 presenças');
  });

  test('diz qual é o dia da semana com mais gente', () => {
    expect(nota('Dia da semana com mais gente')).toContain('Segunda-feira');
  });

  test('diz qual é a modalidade com mais presenças e com mais alunos', () => {
    expect(nota('Modalidade com mais presenças')).toContain('Boxe');
    expect(nota('Modalidade com mais alunos inscritos')).toContain('Boxe');
  });

  test('diz qual foi o mês com mais inscrições', () => {
    expect(nota('Mês com mais inscrições')).toContain('Março 2026');
    expect(nota('Mês com mais inscrições')).toContain('2 novos sócios');
  });

  test('diz qual foi o mês com mais aulas experimentais', () => {
    expect(nota('Mês com mais aulas experimentais')).toContain('Novembro 2026');
  });

  test('o melhor mês de faturação inclui o merchandise e as experimentais', () => {
    expect(nota('Melhor mês de faturação')).toContain('Outubro 2026');
    // Novembro: 50 da venda + 10 das duas experimentais pagas
    expect(d.faturacaoPorMes['2026-11']).toBe(60);
  });

  test('diz o que as experimentais renderam', () => {
    expect(d.totais.receitaExperimentais).toBe(10);
    expect(d.totais.experimentais).toBe(3);
    expect(nota('O que as experimentais renderam')).toContain('10.00 €');
    expect(nota('O que as experimentais renderam')).toContain('3 aulas');
  });

  test('uma experimental oferecida conta como aula e rende zero', () => {
    expect(d.receitaExperimentaisPorMes['2026-12']).toBe(0);
    expect(d.experimentaisPorMes['2026-12']).toBe(1);
  });

  test('o resultado líquido por mês é a faturação menos a despesa', () => {
    expect(d.liquidoPorMes['2026-10']).toBe(200);
    expect(d.liquidoPorMes['2026-11']).toBe(60 - 500);
    expect(nota('Pior resultado líquido')).toContain('Novembro 2026');
  });

  test('sem dados não inventa notas', () => {
    const vazio = destaquesDoAno({ ano: 2026 });
    expect(vazio.notas).toEqual([]);
    expect(vazio.totais.presencas).toBe(0);
  });

  test('um ano sem aulas experimentais não fala delas', () => {
    const sem = destaquesDoAno({ ano: 2026, presencas, membros, modalidades });
    expect(sem.notas.some((n) => n.titulo.includes('experimentais'))).toBe(false);
  });
});

/* -------------------------------------------------- início das contas */

describe('início das contas', () => {
  // O ginásio só começou a registar as despesas a sério em outubro de 2026.
  // Antes disso ha pagamentos mas faltam despesas, o que dava um lucro que
  // nunca existiu. As contas comecam ai; os dados antigos ficam guardados.

  test('começa em 1 de outubro de 2026', () => {
    expect(INICIO_DAS_CONTAS).toEqual({ ano: 2026, mes: 10, dia: 1 });
  });

  test('um período anterior é empurrado para o início das contas', () => {
    expect(desdeOInicioDasContas(new Date(2026, 0, 1))).toEqual(INICIO_DAS_CONTAS);
    expect(desdeOInicioDasContas(new Date(2025, 5, 1))).toEqual(INICIO_DAS_CONTAS);
  });

  test('um período posterior fica como está', () => {
    const novembro = new Date(2026, 10, 1);
    expect(desdeOInicioDasContas(novembro)).toBe(novembro);
  });

  test('reconhece um período inteiramente anterior', () => {
    expect(anteriorAoInicioDasContas(new Date(2026, 8, 30))).toBe(true);
    expect(anteriorAoInicioDasContas(new Date(2026, 9, 1))).toBe(false);
  });
});

describe('o dinheiro antigo não entra nas contas', () => {
  const antigos = [
    { status: 'paid', amount: 1000, payment_type: 'quota', payment_date: '2026-07-15' },
    { status: 'paid', amount: 500, payment_type: 'quota', payment_date: '2026-09-30' }
  ];
  const novos = [
    { status: 'paid', amount: 35, payment_type: 'quota', payment_date: '2026-10-05' }
  ];
  const despesasAntigas = [{ amount: 800, category: 'rent', expense_date: '2026-09-20' }];
  const despesasNovas = [{ amount: 100, category: 'rent', expense_date: '2026-10-10' }];
  const experimentaisAntigas = [{ amount: 5, activity_name: 'Boxe', trial_date: '2026-09-29' }];
  const experimentaisNovas = [{ amount: 5, activity_name: 'Boxe', trial_date: '2026-10-02' }];

  const anoInteiro = { inicio: new Date(2026, 0, 1), fim: new Date(2026, 11, 31) };

  test('um ano inteiro só conta de outubro para a frente', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [...antigos, ...novos],
      despesas: [...despesasAntigas, ...despesasNovas],
      experimentais: [...experimentaisAntigas, ...experimentaisNovas],
      ...anoInteiro
    });
    expect(r.receitaQuotas).toBe(35);      // e nao 1535
    expect(r.despesa).toBe(100);           // e nao 900
    expect(r.experimentais).toBe(5);       // e nao 10
    expect(r.faturacao).toBe(40);
    expect(r.liquido).toBe(-60);
  });

  test('o corte vale para tudo, incluindo as vendas de balcão', () => {
    // A unica venda anterior, de 29 de setembro, foi passada para 1 de
    // outubro na base de dados: o dono quis que contasse em outubro.
    const r = estatisticasFinanceiras({
      vendas: [
        { total: 65, quantity: 1, item_name: 'Luvas', sale_date: '2026-09-29' },
        { total: 20, quantity: 1, item_name: 'Ligaduras', sale_date: '2026-10-02' }
      ],
      ...anoInteiro
    });
    expect(r.merchandise).toBe(20);
    expect(r.faturacao).toBe(20);
  });

  test('um período todo anterior dá zero, e não os valores antigos', () => {
    const r = estatisticasFinanceiras({
      pagamentos: antigos, despesas: despesasAntigas,
      inicio: new Date(2026, 6, 1), fim: new Date(2026, 6, 31)
    });
    expect(r.faturacao).toBe(0);
    expect(r.despesa).toBe(0);
    expect(r.liquido).toBe(0);
    expect(r.nPagamentos).toBe(0);
  });

  test('outubro não se compara com setembro, que não tem contas', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [...antigos, ...novos],
      inicio: new Date(2026, 9, 1), fim: new Date(2026, 9, 31)
    });
    expect(r.faturacao).toBe(35);
    // Comparar com setembro daria "subiu tudo" a partir de um zero falso
    expect(r.comparacao.faturacao).toBeNull();
    expect(r.periodoAnterior).toBeNull();
  });

  test('novembro já se compara com outubro', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [
        ...novos,
        { status: 'paid', amount: 70, payment_type: 'quota', payment_date: '2026-11-05' }
      ],
      inicio: new Date(2026, 10, 1), fim: new Date(2026, 10, 30)
    });
    expect(r.faturacao).toBe(70);
    expect(r.comparacao.faturacao).toMatchObject({ atual: 70, anterior: 35 });
  });

  test('um pagamento pendente antigo também não conta', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [{ status: 'pending', amount: 35, payment_date: '2026-07-10' }],
      ...anoInteiro
    });
    expect(r.pendentes).toBe(0);
  });

  test('os destaques do ano seguem a mesma regra', () => {
    const d = destaquesDoAno({
      ano: 2026,
      pagamentos: [...antigos, ...novos],
      despesas: [...despesasAntigas, ...despesasNovas],
      experimentais: [...experimentaisAntigas, ...experimentaisNovas],
      vendas: [{ total: 65, sale_date: '2026-09-29' }],
      presencas: [{ member_id: '1', check_in_date: '2026-03-02' }],
      membros: [{ id: '1', join_date: '2026-03-10' }]
    });
    expect(d.totais.despesa).toBe(100);
    expect(d.totais.experimentais).toBe(1);
    expect(d.faturacaoPorMes['2026-07']).toBeUndefined();
    expect(d.faturacaoPorMes['2026-10']).toBe(40);   // 35 de quota + 5 da experimental
    expect(d.faturacaoPorMes['2026-09']).toBeUndefined();   // nem a venda de balcao
  });

  test('as presenças e as inscrições antigas continuam a contar', () => {
    const d = destaquesDoAno({
      ano: 2026,
      presencas: [
        { member_id: '1', check_in_date: '2026-03-02' },
        { member_id: '1', check_in_date: '2026-10-02' }
      ],
      membros: [{ id: '1', join_date: '2026-03-10' }]
    });
    expect(d.totais.presencas).toBe(2);
    expect(d.totais.inscricoes).toBe(1);
  });
});

describe('a data das contas e a data do pagamento', () => {
  // Os pagamentos do fim de setembro de 2026 eram a mensalidade de outubro:
  // o dinheiro conta em outubro, mas a validade da quota nasce do dia em que
  // o socio pagou. Sao duas datas diferentes, de proposito.

  test('sem data de contas, vale a data do pagamento', () => {
    expect(dataDasContas({ payment_date: '2026-10-05' })).toBe('2026-10-05');
    expect(dataDasContas({ payment_date: '2026-10-05', accounting_date: null })).toBe('2026-10-05');
  });

  test('com data de contas, é essa que manda', () => {
    expect(dataDasContas({ payment_date: '2026-09-30', accounting_date: '2026-10-01' }))
      .toBe('2026-10-01');
  });

  test('um pagamento de setembro marcado para outubro entra nas contas', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [
        { status: 'paid', amount: 50, payment_date: '2026-09-22', accounting_date: '2026-10-01' },
        { status: 'paid', amount: 35, payment_date: '2026-10-05' }
      ],
      inicio: new Date(2026, 9, 1), fim: new Date(2026, 9, 31)
    });
    expect(r.faturacao).toBe(85);
    expect(r.nPagamentos).toBe(2);
  });

  test('e deixa de aparecer em setembro', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [{ status: 'paid', amount: 50, payment_date: '2026-09-22', accounting_date: '2026-10-01' }],
      inicio: new Date(2026, 8, 1), fim: new Date(2026, 8, 30)
    });
    expect(r.faturacao).toBe(0);
  });

  test('a repartição por mês segue a data das contas', () => {
    const r = estatisticasFinanceiras({
      pagamentos: [{ status: 'paid', amount: 50, payment_date: '2026-09-22', accounting_date: '2026-10-01' }],
      inicio: new Date(2026, 0, 1), fim: new Date(2026, 11, 31)
    });
    expect(r.faturacaoPorMes['2026-10']).toBe(50);
    expect(r.faturacaoPorMes['2026-09']).toBeUndefined();
  });

  test('os destaques do ano seguem a mesma data', () => {
    const d = destaquesDoAno({
      ano: 2026,
      pagamentos: [{ status: 'paid', amount: 50, payment_date: '2026-09-22', accounting_date: '2026-10-01' }]
    });
    expect(d.faturacaoPorMes['2026-10']).toBe(50);
    expect(d.totais.faturacao).toBe(50);
  });
});


describe('anos com dados', () => {
  test('junta os anos de todas as listas, do mais recente para trás', () => {
    expect(anosComDados([
      { lista: [{ d: '2025-01-01' }, { d: '2026-05-05' }], campo: 'd' },
      { lista: [{ x: '2024-12-31' }], campo: 'x' }
    ])).toEqual([2026, 2025, 2024]);
  });

  test('sem listas, não há anos', () => {
    expect(anosComDados([])).toEqual([]);
  });
});
