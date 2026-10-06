/**
 * As contas dos Relatórios.
 *
 * Está tudo aqui, fora dos ecrãs, para poder ser testado: é a parte do
 * sistema onde um erro passa despercebido durante meses, porque um número
 * errado continua a parecer um número.
 *
 * Duas decisões que explicam o resto do ficheiro:
 *
 * 1. **As datas nunca passam por `new Date(texto)`.** As datas chegam do
 *    servidor como `2026-10-05` ou `2026-10-05T00:00:00+00:00`, e o
 *    JavaScript lê-as como meia-noite em Londres. No horário de verão
 *    português isso é 1h da manhã do mesmo dia — o que basta para um
 *    pagamento do último dia do mês ficar de fora do próprio mês. Aqui
 *    lê-se o ano, o mês e o dia do próprio texto, e comparam-se como
 *    números (20261005). Assim não há fuso horário que interfira.
 *
 * 2. **Comparar é sempre com o período anterior do mesmo tamanho.** Um mês
 *    compara com o mês antes, um ano com o ano antes, e um intervalo à
 *    medida com os mesmos dias imediatamente antes.
 */

/**
 * O dia em que as contas do ginásio passam a contar.
 *
 * O ginásio só começou a registar as despesas a sério em outubro de 2026.
 * Antes disso há pagamentos lançados mas muitas despesas que nunca foram
 * registadas, o que dava um lucro que não existiu. O dono decidiu começar
 * as contas aqui, para o ano de 2027 ser o primeiro ano inteiro e certo.
 *
 * **Os dados antigos não foram apagados** — continuam na ficha de cada
 * sócio e na lista de pagamentos. O que muda é só o que entra nas contas.
 *
 * Não toca nos seguros: a validade do seguro vem da ficha do sócio, não
 * destas somas. (Verificado: nenhum seguro válido vinha de um pagamento
 * anterior a outubro de 2026.)
 */
export const INICIO_DAS_CONTAS = { ano: 2026, mes: 10, dia: 1 };

export const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/** Pela ordem do `getDay()`: 0 é domingo. Serve para ir buscar o nome. */
export const NOMES_DIAS = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado'
];

/** Pela ordem em que a semana se lê em Portugal, para mostrar no ecrã. */
export const SEMANA = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira',
  'Sexta-feira', 'Sábado', 'Domingo'
];

/* ------------------------------------------------------------------ datas */

/** Lê o ano, mês e dia de uma data, venha ela como texto ou como Date. */
export const partesDaData = (valor) => {
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    const { ano, mes, dia } = valor;
    if ([ano, mes, dia].every((x) => Number.isFinite(x))) return { ano, mes, dia };
    return null;
  }
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return { ano: valor.getFullYear(), mes: valor.getMonth() + 1, dia: valor.getDate() };
  }
  const texto = String(valor ?? '');
  const encontrado = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (encontrado) {
    return { ano: +encontrado[1], mes: +encontrado[2], dia: +encontrado[3] };
  }
  const d = new Date(texto);
  if (Number.isNaN(d.getTime())) return null;
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
};

/** 2026-10-05 → 20261005. Serve para comparar datas sem fusos horários. */
export const numeroDaData = (valor) => {
  const p = partesDaData(valor);
  return p ? p.ano * 10000 + p.mes * 100 + p.dia : null;
};

/** Verdadeiro se a data está dentro do intervalo, extremos incluídos. */
export const dentroDoIntervalo = (valor, inicio, fim) => {
  const n = numeroDaData(valor);
  if (n === null) return false;
  const de = numeroDaData(inicio);
  const ate = numeroDaData(fim);
  if (de !== null && n < de) return false;
  if (ate !== null && n > ate) return false;
  return true;
};

/** 0 = domingo, 6 = sábado. Calculado a partir do ano/mês/dia, não do fuso. */
export const diaDaSemana = (valor) => {
  const p = partesDaData(valor);
  if (!p) return null;
  return new Date(p.ano, p.mes - 1, p.dia).getDay();
};

/** 2026-10-05 → '2026-10'. Ordena bem por ordem alfabética. */
export const chaveDoMes = (valor) => {
  const p = partesDaData(valor);
  return p ? `${p.ano}-${String(p.mes).padStart(2, '0')}` : null;
};

/** '2026-10' → 'Outubro 2026' */
export const rotuloDoMes = (chave) => {
  const [ano, mes] = String(chave ?? '').split('-');
  const nome = NOMES_MESES[Number(mes) - 1];
  return nome ? `${nome} ${ano}` : String(chave ?? '');
};

/** Quantos dias tem o intervalo, contando o primeiro e o último. */
export const diasDoIntervalo = (inicio, fim) => {
  const a = partesDaData(inicio);
  const b = partesDaData(fim);
  if (!a || !b) return 1;
  const de = Date.UTC(a.ano, a.mes - 1, a.dia);
  const ate = Date.UTC(b.ano, b.mes - 1, b.dia);
  return Math.max(1, Math.round((ate - de) / 86400000) + 1);
};

/**
 * O período imediatamente anterior, com o mesmo número de dias.
 * De 1 a 31 de outubro → de 31 de agosto a 30 de setembro (31 dias).
 */
export const intervaloAnterior = (inicio, fim) => {
  const a = partesDaData(inicio);
  if (!a) return { inicio: null, fim: null };
  const dias = diasDoIntervalo(inicio, fim);
  const fimAnterior = new Date(a.ano, a.mes - 1, a.dia - 1);
  const inicioAnterior = new Date(a.ano, a.mes - 1, a.dia - dias);
  return { inicio: inicioAnterior, fim: fimAnterior };
};

/* ------------------------------------------------- início das contas */

/** O início do período, nunca anterior ao dia em que as contas começam. */
export const desdeOInicioDasContas = (inicio) => {
  const pedido = numeroDaData(inicio);
  const corte = numeroDaData(INICIO_DAS_CONTAS);
  return pedido === null || pedido < corte ? INICIO_DAS_CONTAS : inicio;
};

/** Verdadeiro quando o período inteiro é anterior ao início das contas. */
export const anteriorAoInicioDasContas = (fim) => {
  const ate = numeroDaData(fim);
  return ate !== null && ate < numeroDaData(INICIO_DAS_CONTAS);
};

/* ------------------------------------------------------------- comparações */

/**
 * Compara dois números e diz quanto mudou.
 *
 * Sem período anterior com que comparar (era zero), a percentagem fica a
 * `null`: dizer "subiu 100%" a partir do nada engana mais do que informa.
 */
export const variacao = (atual, anterior) => {
  const a = Number(atual) || 0;
  const b = Number(anterior) || 0;
  const absoluta = a - b;
  return {
    atual: a,
    anterior: b,
    absoluta,
    percentagem: b === 0 ? null : (absoluta / Math.abs(b)) * 100,
    sentido: absoluta > 0 ? 'subiu' : absoluta < 0 ? 'desceu' : 'igual'
  };
};

/* ------------------------------------------------------------- agrupamentos */

/** Soma `valor` por `chave`. Sem `valor`, conta um por registo. */
export const agrupar = (lista, chave, valor = () => 1) =>
  (lista || []).reduce((acc, item) => {
    const k = chave(item);
    if (k === null || k === undefined || k === '') return acc;
    acc[k] = (acc[k] || 0) + (Number(valor(item)) || 0);
    return acc;
  }, {});

/** A entrada com maior valor, ou null se não houver nenhuma acima de zero. */
export const maiorDe = (grupos) => {
  const entradas = Object.entries(grupos || {}).filter(([, v]) => v > 0);
  if (entradas.length === 0) return null;
  const [chave, valor] = entradas.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { chave, valor };
};

/** Lista ordenada do maior para o menor, com um limite opcional. */
export const porOrdemDeValor = (grupos, limite) => {
  const lista = Object.entries(grupos || {})
    .map(([chave, valor]) => ({ chave, valor }))
    .sort((a, b) => b.valor - a.valor);
  return limite ? lista.slice(0, limite) : lista;
};

/** Todos os meses entre dois extremos, mesmo os que não têm registos. */
export const mesesDoIntervalo = (inicio, fim) => {
  const a = partesDaData(inicio);
  const b = partesDaData(fim);
  if (!a || !b) return [];
  const meses = [];
  let ano = a.ano;
  let mes = a.mes;
  while (ano < b.ano || (ano === b.ano && mes <= b.mes)) {
    meses.push(`${ano}-${String(mes).padStart(2, '0')}`);
    mes += 1;
    if (mes > 12) { mes = 1; ano += 1; }
  }
  return meses;
};

/** Preenche com zero os meses sem registos, para o gráfico não ter buracos. */
export const serieMensal = (grupos, inicio, fim) =>
  mesesDoIntervalo(inicio, fim).map((chave) => ({
    chave,
    rotulo: rotuloDoMes(chave),
    valor: grupos[chave] || 0
  }));

/* ------------------------------------------------------------------ sócios */

/** Idade em anos completos, à data de hoje. */
export const idade = (dataDeNascimento, hoje = new Date()) => {
  const n = partesDaData(dataDeNascimento);
  const h = partesDaData(hoje);
  if (!n || !h) return null;
  let anos = h.ano - n.ano;
  if (h.mes < n.mes || (h.mes === n.mes && h.dia < n.dia)) anos -= 1;
  return anos >= 0 && anos < 120 ? anos : null;
};

export const ESCALOES = [
  { nome: 'Até 17', min: 0, max: 17 },
  { nome: '18 a 29', min: 18, max: 29 },
  { nome: '30 a 44', min: 30, max: 44 },
  { nome: '45 a 59', min: 45, max: 59 },
  { nome: '60 ou mais', min: 60, max: 200 }
];

export const escalaoEtario = (anos) => {
  const e = ESCALOES.find((x) => anos >= x.min && anos <= x.max);
  return e ? e.nome : null;
};

/**
 * As modalidades de um sócio. A ficha tem `activity_ids` (várias) e o
 * `activity_id` antigo (uma só); vale a lista, e o antigo só quando a lista
 * está vazia.
 */
export const modalidadesDoSocio = (socio) => {
  const lista = Array.isArray(socio?.activity_ids) ? socio.activity_ids.filter(Boolean) : [];
  if (lista.length > 0) return lista;
  return socio?.activity_id ? [socio.activity_id] : [];
};

/** Um sócio está Ativo quando tem a quota dentro da validade e não está suspenso. */
export const estaAtivo = (socio, hoje = new Date()) => {
  if (socio?.status === 'suspended') return false;
  if (socio?.membership_status) return socio.membership_status === 'active';
  const ate = numeroDaData(socio?.membership_valid_until);
  return ate !== null && ate >= numeroDaData(hoje);
};

/* --------------------------------------------------------------- relatórios */

const nomeDaModalidade = (modalidades, id) =>
  (modalidades || []).find((m) => m.id === id)?.name || 'Sem modalidade';

/**
 * Presenças: totais do período, comparação com o período anterior, e as
 * repartições por mês, por dia da semana e por modalidade.
 */
export const estatisticasDePresencas = ({
  presencas = [], experimentais = [], membros = [], modalidades = [], inicio, fim
}) => {
  const doPeriodo = presencas.filter((p) => dentroDoIntervalo(p.check_in_date, inicio, fim));
  const anterior = intervaloAnterior(inicio, fim);
  const doPeriodoAnterior = presencas.filter((p) =>
    dentroDoIntervalo(p.check_in_date, anterior.inicio, anterior.fim));

  const experimentaisDoPeriodo = experimentais.filter((e) =>
    dentroDoIntervalo(e.trial_date, inicio, fim));
  const experimentaisAnteriores = experimentais.filter((e) =>
    dentroDoIntervalo(e.trial_date, anterior.inicio, anterior.fim));

  const unicos = new Set(doPeriodo.map((p) => p.member_id)).size;
  const unicosAnteriores = new Set(doPeriodoAnterior.map((p) => p.member_id)).size;
  const dias = diasDoIntervalo(inicio, fim);
  const diasAnteriores = diasDoIntervalo(anterior.inicio, anterior.fim);

  const porNome = new Map((membros || []).map((m) => [m.id, m.name]));
  const porSocio = agrupar(doPeriodo, (p) => p.member_id);

  return {
    total: doPeriodo.length,
    unicos,
    mediaDiaria: doPeriodo.length / dias,
    experimentais: experimentaisDoPeriodo.length,
    comparacao: {
      total: variacao(doPeriodo.length, doPeriodoAnterior.length),
      unicos: variacao(unicos, unicosAnteriores),
      mediaDiaria: variacao(doPeriodo.length / dias, doPeriodoAnterior.length / diasAnteriores),
      experimentais: variacao(experimentaisDoPeriodo.length, experimentaisAnteriores.length)
    },
    periodoAnterior: anterior,
    porMes: agrupar(doPeriodo, (p) => chaveDoMes(p.check_in_date)),
    porDiaDaSemana: agrupar(doPeriodo, (p) => NOMES_DIAS[diaDaSemana(p.check_in_date)]),
    porModalidade: agrupar(doPeriodo, (p) => nomeDaModalidade(modalidades, p.activity_id)),
    porDia: agrupar(doPeriodo, (p) => partesDaData(p.check_in_date)
      ? `${partesDaData(p.check_in_date).ano}-${String(partesDaData(p.check_in_date).mes).padStart(2, '0')}-${String(partesDaData(p.check_in_date).dia).padStart(2, '0')}`
      : null),
    maisAssiduos: porOrdemDeValor(porSocio, 10).map((x) => ({
      nome: porNome.get(x.chave) || 'Desconhecido',
      valor: x.valor
    })),
    experimentaisPorModalidade: agrupar(experimentaisDoPeriodo, (e) => e.activity_name),
    experimentaisPorMes: agrupar(experimentaisDoPeriodo, (e) => chaveDoMes(e.trial_date))
  };
};

const SEGURO_FIXO = 20;

/** Num pagamento de inscrição, 20 € contam como seguro e o resto como quota. */
export const parteDoSeguro = (pagamento) => {
  if (pagamento.payment_type === 'seguro') return pagamento.amount;
  if (pagamento.payment_type === 'quota_seguro') return Math.min(SEGURO_FIXO, pagamento.amount);
  return 0;
};

/**
 * Finanças: faturação (quotas + seguros + merchandise + aulas experimentais),
 * despesa e resultado líquido, com os mesmos critérios da página de Finanças.
 *
 * As aulas experimentais são pagas, por isso o que rendem é faturação como
 * qualquer outra. Continuam fora das contagens de presenças.
 */
export const estatisticasFinanceiras = ({
  pagamentos = [], despesas = [], vendas = [], experimentais = [], inicio, fim
}) => {
  const anterior = intervaloAnterior(inicio, fim);

  const noPeriodo = (lista, campo, de, ate) =>
    lista.filter((x) => dentroDoIntervalo(x[campo], de, ate));
  const soma = (lista, valor) => lista.reduce((t, x) => t + (Number(valor(x)) || 0), 0);

  const pagos = pagamentos.filter((p) => p.status === 'paid');

  const contas = (de, ate) => {
    // Nada anterior ao início das contas entra nas somas
    const desde = desdeOInicioDasContas(de);
    const foraDoPeriodo = anteriorAoInicioDasContas(ate);

    const quotas = foraDoPeriodo ? [] : noPeriodo(pagos, 'payment_date', desde, ate);
    const vendasDo = foraDoPeriodo ? [] : noPeriodo(vendas, 'sale_date', desde, ate);
    const despesasDo = foraDoPeriodo ? [] : noPeriodo(despesas, 'expense_date', desde, ate);
    const trialsDo = foraDoPeriodo ? [] : noPeriodo(experimentais, 'trial_date', desde, ate);
    const receitaQuotas = soma(quotas, (p) => p.amount);
    const merchandise = soma(vendasDo, (v) => v.total);
    const trials = soma(trialsDo, (t) => t.amount);
    const despesa = soma(despesasDo, (e) => e.amount);
    const faturacao = receitaQuotas + merchandise + trials;
    return {
      quotas, vendasDo, despesasDo, trialsDo,
      receitaQuotas, merchandise, trials, despesa,
      faturacao,
      liquido: faturacao - despesa
    };
  };

  const agora = contas(inicio, fim);
  const antes = contas(anterior.inicio, anterior.fim);

  const pendentes = noPeriodo(pagamentos.filter((p) => p.status === 'pending'),
    'payment_date', desdeOInicioDasContas(inicio), fim).length;

  // Comparar com um período inteiramente anterior ao início das contas daria
  // sempre "subiu tudo", a partir de um zero que não é verdade
  const semComparacao = anteriorAoInicioDasContas(anterior.fim);
  const comp = (atual, antesDisso) => (semComparacao ? null : variacao(atual, antesDisso));

  return {
    faturacao: agora.faturacao,
    receitaQuotas: agora.receitaQuotas,
    seguros: soma(agora.quotas, parteDoSeguro),
    merchandise: agora.merchandise,
    unidadesVendidas: soma(agora.vendasDo, (v) => v.quantity),
    experimentais: agora.trials,
    nExperimentais: agora.trialsDo.length,
    despesa: agora.despesa,
    liquido: agora.liquido,
    nPagamentos: agora.quotas.length,
    pagamentoMedio: agora.quotas.length ? agora.receitaQuotas / agora.quotas.length : 0,
    pendentes,
    margem: agora.faturacao > 0 ? (agora.liquido / agora.faturacao) * 100 : null,
    comparacao: {
      faturacao: comp(agora.faturacao, antes.faturacao),
      despesa: comp(agora.despesa, antes.despesa),
      liquido: comp(agora.liquido, antes.liquido),
      merchandise: comp(agora.merchandise, antes.merchandise),
      experimentais: comp(agora.trials, antes.trials),
      nPagamentos: comp(agora.quotas.length, antes.quotas.length)
    },
    periodoAnterior: semComparacao ? null : anterior,
    faturacaoPorMes: (() => {
      const porMes = agrupar(agora.quotas, (p) => chaveDoMes(p.payment_date), (p) => p.amount);
      agora.vendasDo.forEach((v) => {
        const k = chaveDoMes(v.sale_date);
        if (k) porMes[k] = (porMes[k] || 0) + (Number(v.total) || 0);
      });
      agora.trialsDo.forEach((e) => {
        const k = chaveDoMes(e.trial_date);
        if (k) porMes[k] = (porMes[k] || 0) + (Number(e.amount) || 0);
      });
      return porMes;
    })(),
    experimentaisPorMes: agrupar(agora.trialsDo, (e) => chaveDoMes(e.trial_date)),
    receitaExperimentaisPorMes: agrupar(agora.trialsDo, (e) => chaveDoMes(e.trial_date), (e) => e.amount),
    experimentaisPorModalidade: agrupar(agora.trialsDo, (e) => e.activity_name),
    receitaExperimentaisPorModalidade: agrupar(agora.trialsDo, (e) => e.activity_name, (e) => e.amount),
    despesaPorMes: agrupar(agora.despesasDo, (e) => chaveDoMes(e.expense_date), (e) => e.amount),
    despesaPorCategoria: agrupar(agora.despesasDo, (e) => e.category || 'other', (e) => e.amount),
    merchandisePorArtigo: agrupar(agora.vendasDo, (v) => v.item_name, (v) => v.total),
    porMetodo: agrupar(agora.quotas, (p) => p.payment_method, (p) => p.amount)
  };
};

/** Sócios: quantos são, quantos entraram no período, e como se repartem. */
export const estatisticasDeSocios = ({
  membros = [], modalidades = [], inicio, fim, hoje = new Date()
}) => {
  const anterior = intervaloAnterior(inicio, fim);
  const novos = membros.filter((m) => dentroDoIntervalo(m.join_date, inicio, fim));
  const novosAntes = membros.filter((m) => dentroDoIntervalo(m.join_date, anterior.inicio, anterior.fim));

  const ativos = membros.filter((m) => estaAtivo(m, hoje)).length;

  const porModalidade = {};
  membros.forEach((m) => {
    modalidadesDoSocio(m).forEach((id) => {
      const nome = nomeDaModalidade(modalidades, id);
      porModalidade[nome] = (porModalidade[nome] || 0) + 1;
    });
  });

  const inscricoesPorModalidade = {};
  novos.forEach((m) => {
    modalidadesDoSocio(m).forEach((id) => {
      const nome = nomeDaModalidade(modalidades, id);
      inscricoesPorModalidade[nome] = (inscricoesPorModalidade[nome] || 0) + 1;
    });
  });

  const idades = membros.map((m) => idade(m.date_of_birth, hoje)).filter((x) => x !== null);

  return {
    total: membros.length,
    ativos,
    inativos: membros.length - ativos,
    novos: novos.length,
    percentagemAtivos: membros.length ? (ativos / membros.length) * 100 : 0,
    idadeMedia: idades.length ? idades.reduce((a, b) => a + b, 0) / idades.length : null,
    comparacao: { novos: variacao(novos.length, novosAntes.length) },
    periodoAnterior: anterior,
    inscricoesPorMes: agrupar(novos, (m) => chaveDoMes(m.join_date)),
    porModalidade,
    inscricoesPorModalidade,
    porEscalao: agrupar(
      membros.map((m) => escalaoEtario(idade(m.date_of_birth, hoje))).filter(Boolean),
      (nome) => nome
    ),
    semModalidade: membros.filter((m) => modalidadesDoSocio(m).length === 0).length
  };
};

/* ---------------------------------------------------------------- destaques */

const frase = (icone, titulo, texto) => ({ icone, titulo, texto });

/**
 * As notas do ano: os factos que se lêem de uma assentada e que não se veem
 * olhando para um número isolado.
 *
 * Só entram as que têm dados que as sustentem — uma nota a dizer "o mês mais
 * concorrido foi janeiro, com 0 presenças" não vale nada.
 */
export const destaquesDoAno = ({
  ano, presencas = [], experimentais = [], membros = [], pagamentos = [],
  vendas = [], despesas = [], modalidades = [], hoje = new Date()
}) => {
  const inicio = { ano, mes: 1, dia: 1 };
  const fim = { ano, mes: 12, dia: 31 };
  const noAno = (lista, campo) => lista.filter((x) => dentroDoIntervalo(x[campo], inicio, fim));

  // O dinheiro só conta a partir do início das contas; as presenças e as
  // inscrições contam desde sempre, que essas estão certas
  const desde = desdeOInicioDasContas(inicio);
  const noAnoEComContas = (lista, campo) =>
    lista.filter((x) => dentroDoIntervalo(x[campo], desde, fim));

  const presencasDoAno = noAno(presencas, 'check_in_date');
  const experimentaisDoAno = noAnoEComContas(experimentais, 'trial_date');
  const inscricoesDoAno = noAno(membros, 'join_date');
  const pagos = noAnoEComContas(pagamentos.filter((p) => p.status === 'paid'), 'payment_date');
  const vendasDoAno = noAnoEComContas(vendas, 'sale_date');
  const despesasDoAno = noAnoEComContas(despesas, 'expense_date');

  const notas = [];

  const mesCheio = maiorDe(agrupar(presencasDoAno, (p) => chaveDoMes(p.check_in_date)));
  if (mesCheio) {
    notas.push(frase('presencas', 'Mês mais concorrido',
      `${rotuloDoMes(mesCheio.chave)}, com ${mesCheio.valor} presenças.`));
  }

  const diaCheio = maiorDe(agrupar(presencasDoAno, (p) => NOMES_DIAS[diaDaSemana(p.check_in_date)]));
  if (diaCheio) {
    const total = presencasDoAno.length;
    const quota = total ? Math.round((diaCheio.valor / total) * 100) : 0;
    notas.push(frase('semana', 'Dia da semana com mais gente',
      `${diaCheio.chave}, com ${diaCheio.valor} presenças — ${quota}% do ano.`));
  }

  const diaVazio = (() => {
    const porDia = agrupar(presencasDoAno, (p) => NOMES_DIAS[diaDaSemana(p.check_in_date)]);
    const entradas = Object.entries(porDia);
    if (entradas.length < 2) return null;
    const [chave, valor] = entradas.reduce((a, b) => (b[1] < a[1] ? b : a));
    return { chave, valor };
  })();
  if (diaVazio) {
    notas.push(frase('semana', 'Dia mais calmo',
      `${diaVazio.chave}, com ${diaVazio.valor} presenças.`));
  }

  const modalidadeCheia = maiorDe(agrupar(presencasDoAno,
    (p) => nomeDaModalidade(modalidades, p.activity_id)));
  if (modalidadeCheia) {
    notas.push(frase('modalidade', 'Modalidade com mais presenças',
      `${modalidadeCheia.chave}, com ${modalidadeCheia.valor} presenças.`));
  }

  const porModalidade = {};
  membros.forEach((m) => {
    modalidadesDoSocio(m).forEach((id) => {
      const nome = nomeDaModalidade(modalidades, id);
      porModalidade[nome] = (porModalidade[nome] || 0) + 1;
    });
  });
  const modalidadeComMaisAlunos = maiorDe(porModalidade);
  if (modalidadeComMaisAlunos) {
    notas.push(frase('modalidade', 'Modalidade com mais alunos inscritos',
      `${modalidadeComMaisAlunos.chave}, com ${modalidadeComMaisAlunos.valor} sócios.`));
  }

  const mesDeInscricoes = maiorDe(agrupar(inscricoesDoAno, (m) => chaveDoMes(m.join_date)));
  if (mesDeInscricoes) {
    notas.push(frase('socios', 'Mês com mais inscrições',
      `${rotuloDoMes(mesDeInscricoes.chave)}, com ${mesDeInscricoes.valor} novos sócios.`));
  }

  const modalidadeDeInscricoes = (() => {
    const grupos = {};
    inscricoesDoAno.forEach((m) => {
      modalidadesDoSocio(m).forEach((id) => {
        const nome = nomeDaModalidade(modalidades, id);
        grupos[nome] = (grupos[nome] || 0) + 1;
      });
    });
    return maiorDe(grupos);
  })();
  if (modalidadeDeInscricoes) {
    notas.push(frase('modalidade', 'Modalidade que mais inscreveu este ano',
      `${modalidadeDeInscricoes.chave}, com ${modalidadeDeInscricoes.valor} inscrições.`));
  }

  if (experimentaisDoAno.length > 0) {
    const mesExperimentais = maiorDe(agrupar(experimentaisDoAno, (e) => chaveDoMes(e.trial_date)));
    if (mesExperimentais) {
      notas.push(frase('experimental', 'Mês com mais aulas experimentais',
        `${rotuloDoMes(mesExperimentais.chave)}, com ${mesExperimentais.valor} aulas.`));
    }
    const modalidadeExperimentais = maiorDe(agrupar(experimentaisDoAno, (e) => e.activity_name));
    if (modalidadeExperimentais) {
      notas.push(frase('experimental', 'Experimentais: modalidade mais procurada',
        `${modalidadeExperimentais.chave}, com ${modalidadeExperimentais.valor} aulas.`));
    }
    const rendeu = experimentaisDoAno.reduce((t, e) => t + (Number(e.amount) || 0), 0);
    notas.push(frase('experimental', 'O que as experimentais renderam',
      `${rendeu.toFixed(2)} € em ${experimentaisDoAno.length} aulas` +
      (experimentaisDoAno.length
        ? `, a uma média de ${(rendeu / experimentaisDoAno.length).toFixed(2)} € por aula.`
        : '.')));
  }

  const faturacaoPorMes = agrupar(pagos, (p) => chaveDoMes(p.payment_date), (p) => p.amount);
  vendasDoAno.forEach((v) => {
    const k = chaveDoMes(v.sale_date);
    if (k) faturacaoPorMes[k] = (faturacaoPorMes[k] || 0) + (Number(v.total) || 0);
  });
  // As aulas experimentais sao pagas: o que rendem e faturacao como as outras
  experimentaisDoAno.forEach((e) => {
    const k = chaveDoMes(e.trial_date);
    if (k) faturacaoPorMes[k] = (faturacaoPorMes[k] || 0) + (Number(e.amount) || 0);
  });
  const melhorMes = maiorDe(faturacaoPorMes);
  if (melhorMes) {
    notas.push(frase('dinheiro', 'Melhor mês de faturação',
      `${rotuloDoMes(melhorMes.chave)}, com ${melhorMes.valor.toFixed(2)} €.`));
  }

  const despesaPorMes = agrupar(despesasDoAno, (e) => chaveDoMes(e.expense_date), (e) => e.amount);
  const mesDeDespesa = maiorDe(despesaPorMes);
  if (mesDeDespesa) {
    notas.push(frase('dinheiro', 'Mês de maior despesa',
      `${rotuloDoMes(mesDeDespesa.chave)}, com ${mesDeDespesa.valor.toFixed(2)} €.`));
  }

  const meses = mesesDoIntervalo(inicio, fim);
  const liquidoPorMes = {};
  meses.forEach((m) => {
    liquidoPorMes[m] = (faturacaoPorMes[m] || 0) - (despesaPorMes[m] || 0);
  });
  const comValores = Object.entries(liquidoPorMes)
    .filter(([m]) => (faturacaoPorMes[m] || 0) > 0 || (despesaPorMes[m] || 0) > 0);
  if (comValores.length > 0) {
    const melhor = comValores.reduce((a, b) => (b[1] > a[1] ? b : a));
    const pior = comValores.reduce((a, b) => (b[1] < a[1] ? b : a));
    notas.push(frase('dinheiro', 'Melhor resultado líquido',
      `${rotuloDoMes(melhor[0])}, com ${melhor[1].toFixed(2)} €.`));
    if (pior[0] !== melhor[0]) {
      notas.push(frase('dinheiro', 'Pior resultado líquido',
        `${rotuloDoMes(pior[0])}, com ${pior[1].toFixed(2)} €.`));
    }
  }

  const ativos = membros.filter((m) => estaAtivo(m, hoje)).length;
  if (membros.length > 0) {
    notas.push(frase('socios', 'Sócios com a quota em dia',
      `${ativos} de ${membros.length} (${Math.round((ativos / membros.length) * 100)}%).`));
  }

  const idades = membros.map((m) => idade(m.date_of_birth, hoje)).filter((x) => x !== null);
  if (idades.length > 0) {
    const media = idades.reduce((a, b) => a + b, 0) / idades.length;
    const escalao = maiorDe(agrupar(
      membros.map((m) => escalaoEtario(idade(m.date_of_birth, hoje))).filter(Boolean),
      (nome) => nome
    ));
    notas.push(frase('socios', 'Idade dos sócios',
      `Média de ${media.toFixed(0)} anos; o escalão maior é o dos ${escalao ? escalao.chave : '—'}.`));
  }

  if (presencasDoAno.length > 0) {
    const visitantes = new Set(presencasDoAno.map((p) => p.member_id)).size;
    notas.push(frase('presencas', 'Quantos sócios apareceram',
      `${visitantes} sócios diferentes treinaram este ano, ` +
      `numa média de ${(presencasDoAno.length / visitantes).toFixed(1)} idas por sócio.`));
  }

  return {
    ano,
    notas,
    presencasPorMes: agrupar(presencasDoAno, (p) => chaveDoMes(p.check_in_date)),
    presencasPorDiaDaSemana: agrupar(presencasDoAno, (p) => NOMES_DIAS[diaDaSemana(p.check_in_date)]),
    presencasPorModalidade: agrupar(presencasDoAno, (p) => nomeDaModalidade(modalidades, p.activity_id)),
    inscricoesPorMes: agrupar(inscricoesDoAno, (m) => chaveDoMes(m.join_date)),
    experimentaisPorMes: agrupar(experimentaisDoAno, (e) => chaveDoMes(e.trial_date)),
    receitaExperimentaisPorMes: agrupar(experimentaisDoAno, (e) => chaveDoMes(e.trial_date), (e) => e.amount),
    experimentaisPorModalidade: agrupar(experimentaisDoAno, (e) => e.activity_name),
    faturacaoPorMes,
    despesaPorMes,
    liquidoPorMes,
    sociosPorModalidade: porModalidade,
    totais: {
      presencas: presencasDoAno.length,
      inscricoes: inscricoesDoAno.length,
      experimentais: experimentaisDoAno.length,
      receitaExperimentais: experimentaisDoAno.reduce((t, e) => t + (Number(e.amount) || 0), 0),
      faturacao: Object.values(faturacaoPorMes).reduce((a, b) => a + b, 0),
      despesa: despesasDoAno.reduce((t, e) => t + (Number(e.amount) || 0), 0),
      socios: membros.length,
      ativos
    }
  };
};

/** Os anos para os quais há alguma coisa registada, do mais recente para trás. */
export const anosComDados = (listas) => {
  const anos = new Set();
  (listas || []).forEach(({ lista, campo }) => {
    (lista || []).forEach((x) => {
      const p = partesDaData(x[campo]);
      if (p) anos.add(p.ano);
    });
  });
  return [...anos].sort((a, b) => b - a);
};
