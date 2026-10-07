import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Download,
  Calendar,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  DollarSign,
  Package,
  Activity,
  Printer,
  ShoppingBag,
  Sparkles,
  Dumbbell,
  Wallet,
  Lightbulb,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import {
  estatisticasDePresencas,
  estatisticasFinanceiras,
  estatisticasDeSocios,
  destaquesDoAno,
  anosComDados,
  porOrdemDeValor,
  serieMensal,
  rotuloDoMes,
  SEMANA
} from '../lib/estatisticas';
import { nomeDaCategoria } from '../lib/categorias';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;



// Metodos de pagamento, com os mesmos nomes que aparecem nas Financas
const PAYMENT_METHOD_LABELS = {
  cash: 'Numerário',
  card: 'Cartão',
  transfer: 'Transferência',
  mbway: 'MBWay'
};

const paymentMethodLabel = (id) => PAYMENT_METHOD_LABELS[id] || id;

const euros = (valor) => `${valor < 0 ? '-' : ''}€${Math.abs(Number(valor) || 0).toFixed(2)}`;
const numero = (valor, casas = 0) => (Number(valor) || 0).toFixed(casas);

/** A data de hoje em componentes locais, sem passar pelo fuso horário. */
const hojeLocal = () => {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
};

const ICONES_DAS_NOTAS = {
  presencas: Activity,
  semana: CalendarDays,
  modalidade: Dumbbell,
  socios: Users,
  experimental: Sparkles,
  dinheiro: Wallet
};

const Reports = ({ language }) => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('resumo');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [anoEscolhido, setAnoEscolhido] = useState(new Date().getFullYear());
  // As presenças por dia da semana contam-se mês a mês; 'ano' mostra o ano todo
  const [mesDaSemana, setMesDaSemana] = useState('ano');

  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [trials, setTrials] = useState([]);
  const [activities, setActivities] = useState([]);
  const [inventory, setInventory] = useState([]);

  const t = {
    pt: {
      reports: 'Relatórios',
      generateReport: 'Gerar Relatório',
      reportType: 'Tipo de Relatório',
      overviewReport: 'Resumo do Ano',
      attendanceReport: 'Presenças',
      paymentReport: 'Finanças',
      memberReport: 'Sócios',
      inventoryReport: 'Stock',
      dateRange: 'Período',
      year: 'Ano',
      thisMonth: 'Este Mês',
      lastMonth: 'Mês Passado',
      thisYear: 'Este Ano',
      lastYear: 'Ano Passado',
      last12: 'Últimos 12 Meses',
      custom: 'Personalizado',
      startDate: 'Data Início',
      endDate: 'Data Fim',
      export: 'Exportar',
      print: 'Imprimir',
      noData: 'Ainda não há dados para este período.',
      comparedTo: 'vs. anterior',
      previousPeriod: 'Período anterior',
      highlights: 'Notas do ano',
      highlightsHint: 'Leituras automáticas a partir dos registos do ano escolhido.',
      accountsStart: 'As contas começam a 1 de outubro de 2026, quando o ginásio passou a registar tudo. As presenças e as inscrições contam desde sempre.',
      // Presenças
      totalAttendance: 'Total de Presenças',
      uniqueVisitors: 'Sócios Diferentes',
      dailyAverage: 'Média Diária',
      trialClasses: 'Aulas Experimentais',
      attendanceByMonth: 'Presenças por Mês',
      attendanceByWeekday: 'Presenças por Dia da Semana',
      attendanceByActivity: 'Presenças por Modalidade',
      topMembers: 'Sócios Mais Assíduos',
      trialsByActivity: 'Experimentais por Modalidade',
      trialsByMonth: 'Aulas Experimentais por Mês',
      netByActivity: 'Resultado Líquido por Modalidade',
      netByActivityHint: 'Só a receita que cada modalidade gerou. A despesa não é registada por modalidade e conta no Resultado Líquido por Mês.',
      signupsHint: 'Quantas inscrições e quanto renderam de seguro, mês a mês.',
      trialsHint: 'Quantas aulas experimentais e quanto renderam, mês a mês.',
      activeMembersByActivity: 'Sócios por Modalidade (ativos)',
      total: 'Total',
      wholeYear: 'Ano inteiro',
      // Finanças
      billing: 'Faturação',
      billingHint: 'quotas, seguros, merchandise e experimentais',
      totalExpenses: 'Despesa',
      netProfit: 'Resultado Líquido',
      margin: 'Margem',
      merchandiseRevenue: 'Merchandise',
      trialRevenue: 'Aulas Experimentais',
      trialRevenueByMonth: 'Experimentais: Receita por Mês',
      trialRevenueByActivity: 'Experimentais: Receita por Modalidade',
      totalPayments: 'Pagamentos Registados',
      averagePayment: 'Pagamento Médio',
      pendingPayments: 'Pagamentos Pendentes',
      billingByMonth: 'Faturação por Mês',
      expensesByMonth: 'Despesa por Mês',
      netByMonth: 'Resultado Líquido por Mês',
      expensesByCategory: 'Despesa por Categoria',
      merchandiseByItem: 'Merchandise por Artigo',
      byMethod: 'Faturação por Método de Pagamento',
      // Sócios
      totalMembers: 'Total de Sócios',
      activeMembers: 'Com Quota em Dia',
      newMembers: 'Novas Inscrições',
      averageAge: 'Idade Média',
      signupsByMonth: 'Inscrições por Mês',
      membersByActivity: 'Sócios por Modalidade',
      signupsByActivity: 'Inscrições por Modalidade',
      membersByAge: 'Sócios por Escalão Etário',
      withoutActivity: 'sem modalidade atribuída',
      // Stock
      totalItems: 'Total de Artigos',
      totalValue: 'Valor em Stock',
      lowStockItems: 'Artigos com Stock Baixo',
      itemsByCategory: 'Artigos por Categoria',
      bestSellers: 'Artigos Mais Vendidos',
      years: 'anos',
      records: 'registos'
    },
    en: {
      reports: 'Reports',
      generateReport: 'Generate Report',
      reportType: 'Report Type',
      overviewReport: 'Year Overview',
      attendanceReport: 'Attendance',
      paymentReport: 'Finances',
      memberReport: 'Members',
      inventoryReport: 'Inventory',
      dateRange: 'Period',
      year: 'Year',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      thisYear: 'This Year',
      lastYear: 'Last Year',
      last12: 'Last 12 Months',
      custom: 'Custom',
      startDate: 'Start Date',
      endDate: 'End Date',
      export: 'Export',
      print: 'Print',
      noData: 'No data for this period yet.',
      comparedTo: 'vs. previous',
      previousPeriod: 'Previous period',
      highlights: 'Notes of the year',
      highlightsHint: 'Read automatically from the records of the selected year.',
      accountsStart: 'The accounts start on 1 October 2026, when the gym began recording everything. Attendance and sign-ups count from the beginning.',
      totalAttendance: 'Total Check-ins',
      uniqueVisitors: 'Distinct Members',
      dailyAverage: 'Daily Average',
      trialClasses: 'Trial Classes',
      attendanceByMonth: 'Check-ins by Month',
      attendanceByWeekday: 'Check-ins by Weekday',
      attendanceByActivity: 'Check-ins by Activity',
      topMembers: 'Most Active Members',
      trialsByActivity: 'Trials by Activity',
      trialsByMonth: 'Trial Classes by Month',
      netByActivity: 'Net Result by Activity',
      netByActivityHint: 'Only the revenue each activity generated. Expenses are not recorded per activity and count in the monthly net result.',
      signupsHint: 'How many sign-ups and how much insurance they brought in, month by month.',
      trialsHint: 'How many trial classes and how much they brought in, month by month.',
      activeMembersByActivity: 'Members by Activity (active)',
      total: 'Total',
      wholeYear: 'Whole year',
      billing: 'Billing',
      billingHint: 'fees, insurance, merchandise and trials',
      totalExpenses: 'Expenses',
      netProfit: 'Net Result',
      margin: 'Margin',
      merchandiseRevenue: 'Merchandise',
      trialRevenue: 'Trial Classes',
      trialRevenueByMonth: 'Trials: Revenue by Month',
      trialRevenueByActivity: 'Trials: Revenue by Activity',
      totalPayments: 'Payments Recorded',
      averagePayment: 'Average Payment',
      pendingPayments: 'Pending Payments',
      billingByMonth: 'Billing by Month',
      expensesByMonth: 'Expenses by Month',
      netByMonth: 'Net Result by Month',
      expensesByCategory: 'Expenses by Category',
      merchandiseByItem: 'Merchandise by Item',
      byMethod: 'Billing by Payment Method',
      totalMembers: 'Total Members',
      activeMembers: 'Fees Up to Date',
      newMembers: 'New Sign-ups',
      averageAge: 'Average Age',
      signupsByMonth: 'Sign-ups by Month',
      membersByActivity: 'Members by Activity',
      signupsByActivity: 'Sign-ups by Activity',
      membersByAge: 'Members by Age Group',
      withoutActivity: 'with no activity assigned',
      totalItems: 'Total Items',
      totalValue: 'Stock Value',
      lowStockItems: 'Low Stock Items',
      itemsByCategory: 'Items by Category',
      bestSellers: 'Best Sellers',
      years: 'years',
      records: 'records'
    }
  };

  const txt = t[language] || t.pt;

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        const vazio = () => ({ data: [] });
        const [m, p, a, e, s, tr, act, inv] = await Promise.all([
          axios.get(`${API}/members`).catch(vazio),
          axios.get(`${API}/payments`).catch(vazio),
          axios.get(`${API}/attendance`).catch(vazio),
          axios.get(`${API}/expenses`).catch(vazio),
          axios.get(`${API}/sales`).catch(vazio),
          axios.get(`${API}/trials`).catch(vazio),
          axios.get(`${API}/activities`).catch(vazio),
          axios.get(`${API}/inventory`).catch(vazio)
        ]);
        setMembers(m.data);
        setPayments(p.data);
        setAttendance(a.data);
        setExpenses(e.data);
        setSales(s.data);
        setTrials(tr.data);
        setActivities(act.data);
        setInventory(inv.data);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);

  /* ----------------------------------------------------------- período */

  const { inicio, fim } = useMemo(() => {
    const agora = new Date();
    switch (dateRange) {
      case 'thisMonth':
        return {
          inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
          fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
        };
      case 'lastMonth':
        return {
          inicio: new Date(agora.getFullYear(), agora.getMonth() - 1, 1),
          fim: new Date(agora.getFullYear(), agora.getMonth(), 0)
        };
      case 'thisYear':
        return {
          inicio: new Date(agora.getFullYear(), 0, 1),
          fim: new Date(agora.getFullYear(), 11, 31)
        };
      case 'lastYear':
        return {
          inicio: new Date(agora.getFullYear() - 1, 0, 1),
          fim: new Date(agora.getFullYear() - 1, 11, 31)
        };
      case 'last12':
        return {
          inicio: new Date(agora.getFullYear(), agora.getMonth() - 11, 1),
          fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
        };
      case 'custom':
        return {
          inicio: startDate || new Date(agora.getFullYear(), agora.getMonth(), 1),
          fim: endDate || hojeLocal()
        };
      default:
        return {
          inicio: new Date(agora.getFullYear(), agora.getMonth(), 1),
          fim: new Date(agora.getFullYear(), agora.getMonth() + 1, 0)
        };
    }
  }, [dateRange, startDate, endDate]);

  const anosDisponiveis = useMemo(() => {
    const anos = anosComDados([
      { lista: attendance, campo: 'check_in_date' },
      { lista: payments, campo: 'payment_date' },
      { lista: members, campo: 'join_date' },
      { lista: expenses, campo: 'expense_date' }
    ]);
    const atual = new Date().getFullYear();
    return anos.includes(atual) ? anos : [atual, ...anos];
  }, [attendance, payments, members, expenses]);

  /* ------------------------------------------------------------ contas */

  const presencas = useMemo(
    () => estatisticasDePresencas({
      presencas: attendance, experimentais: trials, membros: members,
      modalidades: activities, inicio, fim
    }),
    [attendance, trials, members, activities, inicio, fim]
  );

  const financas = useMemo(
    () => estatisticasFinanceiras({
      pagamentos: payments, despesas: expenses, vendas: sales, experimentais: trials, inicio, fim
    }),
    [payments, expenses, sales, trials, inicio, fim]
  );

  const socios = useMemo(
    () => estatisticasDeSocios({ membros: members, modalidades: activities, inicio, fim }),
    [members, activities, inicio, fim]
  );

  const resumo = useMemo(
    () => destaquesDoAno({
      ano: anoEscolhido, presencas: attendance, experimentais: trials, membros: members,
      pagamentos: payments, vendas: sales, despesas: expenses, modalidades: activities
    }),
    [anoEscolhido, attendance, trials, members, payments, sales, expenses, activities]
  );

  const stock = useMemo(() => {
    const totalItems = inventory.reduce((s, i) => s + (i.quantity || 0), 0);
    const totalValue = inventory.reduce((s, i) => s + (i.quantity || 0) * (i.price || 0), 0);
    const lowStockItems = inventory.filter((i) => i.quantity > 0 && i.quantity <= 5).length;
    const porCategoria = inventory.reduce((acc, i) => {
      acc[i.category || 'other'] = (acc[i.category || 'other'] || 0) + (i.quantity || 0);
      return acc;
    }, {});
    const maisVendidos = sales.reduce((acc, v) => {
      acc[v.item_name] = (acc[v.item_name] || 0) + (v.quantity || 0);
      return acc;
    }, {});
    return { totalItems, totalValue, lowStockItems, porCategoria, maisVendidos };
  }, [inventory, sales]);

  /* --------------------------------------------------------- exportação */

  const exportReport = () => {
    const linhas = [];
    const periodo = reportType === 'resumo'
      ? `Ano ${anoEscolhido}`
      : `${new Date(inicio).toLocaleDateString('pt-PT')} a ${new Date(fim).toLocaleDateString('pt-PT')}`;
    linhas.push(['Relatorio', txt[`${reportType === 'resumo' ? 'overview' : reportType}Report`] || reportType]);
    linhas.push(['Periodo', periodo]);
    linhas.push(['']);

    const tabela = (titulo, pares, formatar = (v) => v) => {
      linhas.push([titulo]);
      pares.forEach(([k, v]) => linhas.push([k, formatar(v)]));
      linhas.push(['']);
    };

    if (reportType === 'resumo') {
      tabela('Notas do ano', resumo.notas.map((n) => [n.titulo, n.texto]));
      tabela('Presencas por mes', Object.entries(resumo.presencasPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v]));
      tabela('Presencas por dia da semana (ano inteiro)', SEMANA
        .filter((d) => resumo.presencasPorDiaDaSemana[d])
        .map((d) => [d, resumo.presencasPorDiaDaSemana[d]]));
      // Mes a mes, para o historico ficar todo no ficheiro
      Object.keys(resumo.presencasPorDiaDaSemanaEMes).sort().forEach((mes) => {
        tabela(`Presencas por dia da semana — ${rotuloDoMes(mes)}`, SEMANA
          .filter((d) => resumo.presencasPorDiaDaSemanaEMes[mes][d])
          .map((d) => [d, resumo.presencasPorDiaDaSemanaEMes[mes][d]]));
      });
      tabela('Presencas por modalidade', porOrdemDeValor(resumo.presencasPorModalidade)
        .map((x) => [x.chave, x.valor]));
      tabela('Inscricoes por mes (quantas e quanto renderam de seguro)',
        Object.entries(resumo.inscricoesPorMes).sort()
          .map(([m, v]) => [rotuloDoMes(m), `${v} | ${(resumo.segurosPorMes[m] || 0).toFixed(2)} EUR`]));
      tabela('Aulas experimentais por mes (quantas e quanto renderam)',
        Object.entries(resumo.experimentaisPorMes).sort()
          .map(([m, v]) => [rotuloDoMes(m), `${v} | ${(resumo.receitaExperimentaisPorMes[m] || 0).toFixed(2)} EUR`]));
      tabela('Socios por modalidade (ativos)', porOrdemDeValor(resumo.sociosAtivosPorModalidade)
        .map((x) => [x.chave, x.valor]));
      tabela('Socios por modalidade (todos)', porOrdemDeValor(resumo.sociosPorModalidade)
        .map((x) => [x.chave, x.valor]));
      tabela('Resultado liquido por modalidade (so a receita que gerou)',
        porOrdemDeValor(resumo.porModalidade.receita).map((x) => [x.chave, x.valor.toFixed(2)]));
      tabela('Faturacao por mes', Object.entries(resumo.faturacaoPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
      tabela('Despesa por mes', Object.entries(resumo.despesaPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
      tabela('Resultado liquido por mes', Object.entries(resumo.liquidoPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
    } else if (reportType === 'attendance') {
      tabela('Totais', [
        ['Total de presencas', presencas.total],
        ['Socios diferentes', presencas.unicos],
        ['Media diaria', numero(presencas.mediaDiaria, 1)],
        ['Aulas experimentais', presencas.experimentais],
        ['Total no periodo anterior', presencas.comparacao.total.anterior]
      ]);
      tabela('Por mes', Object.entries(presencas.porMes).sort().map(([m, v]) => [rotuloDoMes(m), v]));
      tabela('Por dia da semana', SEMANA.filter((d) => presencas.porDiaDaSemana[d])
        .map((d) => [d, presencas.porDiaDaSemana[d]]));
      tabela('Por modalidade', porOrdemDeValor(presencas.porModalidade).map((x) => [x.chave, x.valor]));
      tabela('Socios mais assiduos', presencas.maisAssiduos.map((m) => [m.nome, m.valor]));
      tabela('Experimentais por modalidade',
        porOrdemDeValor(presencas.experimentaisPorModalidade).map((x) => [x.chave, x.valor]));
    } else if (reportType === 'payment') {
      tabela('Totais', [
        ['Faturacao (quotas + seguros + merchandise + experimentais)', financas.faturacao.toFixed(2)],
        ['  dos quais quotas e seguros', financas.receitaQuotas.toFixed(2)],
        ['  dos quais seguros', financas.seguros.toFixed(2)],
        ['  dos quais merchandise', financas.merchandise.toFixed(2)],
        ['  dos quais aulas experimentais', financas.experimentais.toFixed(2)],
        ['Aulas experimentais (quantas)', financas.nExperimentais],
        ['Despesa', financas.despesa.toFixed(2)],
        ['Resultado liquido', financas.liquido.toFixed(2)],
        ['Margem (%)', financas.margem === null ? '-' : financas.margem.toFixed(1)],
        ['Pagamentos registados', financas.nPagamentos],
        ['Pagamento medio', financas.pagamentoMedio.toFixed(2)],
        ['Pagamentos pendentes', financas.pendentes],
        ...(financas.comparacao.faturacao ? [
          ['Faturacao no periodo anterior', financas.comparacao.faturacao.anterior.toFixed(2)],
          ['Despesa no periodo anterior', financas.comparacao.despesa.anterior.toFixed(2)],
          ['Resultado liquido no periodo anterior', financas.comparacao.liquido.anterior.toFixed(2)]
        ] : [['Periodo anterior', 'sem contas: e anterior a 1 de outubro de 2026']])
      ]);
      tabela('Faturacao por mes', Object.entries(financas.faturacaoPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
      tabela('Despesa por mes', Object.entries(financas.despesaPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
      tabela('Despesa por categoria', porOrdemDeValor(financas.despesaPorCategoria)
        .map((x) => [nomeDaCategoria(x.chave), x.valor.toFixed(2)]));
      tabela('Merchandise por artigo', porOrdemDeValor(financas.merchandisePorArtigo)
        .map((x) => [x.chave, x.valor.toFixed(2)]));
      tabela('Aulas experimentais por mes (quantas)',
        Object.entries(financas.experimentaisPorMes).sort().map(([m, v]) => [rotuloDoMes(m), v]));
      tabela('Aulas experimentais por mes (quanto renderam)',
        Object.entries(financas.receitaExperimentaisPorMes).sort()
          .map(([m, v]) => [rotuloDoMes(m), v.toFixed(2)]));
      tabela('Aulas experimentais por modalidade (quanto renderam)',
        porOrdemDeValor(financas.receitaExperimentaisPorModalidade)
          .map((x) => [x.chave, x.valor.toFixed(2)]));
    } else if (reportType === 'member') {
      tabela('Totais', [
        ['Total de socios', socios.total],
        ['Com quota em dia', socios.ativos],
        ['Sem quota em dia', socios.inativos],
        ['Novas inscricoes no periodo', socios.novos],
        ['Inscricoes no periodo anterior', socios.comparacao.novos.anterior],
        ['Idade media', socios.idadeMedia === null ? '-' : socios.idadeMedia.toFixed(0)],
        ['Sem modalidade atribuida', socios.semModalidade]
      ]);
      tabela('Inscricoes por mes', Object.entries(socios.inscricoesPorMes).sort()
        .map(([m, v]) => [rotuloDoMes(m), v]));
      tabela('Socios por modalidade', porOrdemDeValor(socios.porModalidade).map((x) => [x.chave, x.valor]));
      tabela('Socios por escalao etario', porOrdemDeValor(socios.porEscalao).map((x) => [x.chave, x.valor]));
    } else if (reportType === 'inventory') {
      tabela('Totais', [
        ['Total de artigos', stock.totalItems],
        ['Valor em stock', stock.totalValue.toFixed(2)],
        ['Artigos com stock baixo', stock.lowStockItems]
      ]);
      tabela('Artigos por categoria', porOrdemDeValor(stock.porCategoria).map((x) => [x.chave, x.valor]));
      tabela('Artigos mais vendidos', porOrdemDeValor(stock.maisVendidos, 15).map((x) => [x.chave, x.valor]));
    }

    const csv = linhas.map((linha) => linha.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    const h = hojeLocal();
    a.href = url;
    a.download = `relatorio_${reportType}_${h.ano}-${String(h.mes).padStart(2, '0')}-${String(h.dia).padStart(2, '0')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  /* -------------------------------------------------------- componentes */

  /** A linha de comparação com o período anterior, por baixo do número. */
  const Comparacao = ({ dados, formatar = (v) => numero(v) }) => {
    if (!dados) return null;
    const { absoluta, percentagem, sentido } = dados;
    const Icone = sentido === 'subiu' ? TrendingUp : sentido === 'desceu' ? TrendingDown : Minus;
    const cor = sentido === 'subiu' ? 'text-emerald-600 dark:text-emerald-400'
      : sentido === 'desceu' ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';
    return (
      <p className={`text-xs mt-1 flex items-start gap-1 ${cor}`}>
        <Icone size={13} className="shrink-0 mt-0.5" />
        <span className="leading-tight">
          {absoluta > 0 ? '+' : ''}{formatar(absoluta)}
          {percentagem !== null && ` (${percentagem > 0 ? '+' : ''}${percentagem.toFixed(0)}%)`}
          {' '}
          <span className="text-gray-500 dark:text-gray-400">{txt.comparedTo}</span>
        </span>
      </p>
    );
  };

  const StatCard = ({ title, value, hint, icon: Icon, color, comparacao, formatarComparacao, destaque }) => (
    <Card className="card-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">{title}</p>
            <p
              className="text-2xl font-bold truncate"
              style={{ color: destaque || 'var(--text-primary)' }}
            >
              {value}
            </p>
            {hint && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{hint}</p>}
            <Comparacao dados={comparacao} formatar={formatarComparacao} />
          </div>
          <div className={`p-2.5 rounded-full shrink-0 ${color}`}>
            <Icon size={20} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  /**
   * Gráfico de barras. Mantém-se em HTML simples de propósito: não vale a
   * pena carregar uma biblioteca de gráficos inteira para isto, depois do
   * trabalho que deu reduzir o tamanho da aplicação.
   */
  /**
   * Gráfico de barras, com uma segunda coluna opcional.
   *
   * A segunda coluna serve para pôr lado a lado a contagem e o dinheiro que
   * ela gera: quantas inscrições e quanto renderam de seguro, quantas aulas
   * experimentais e quanto renderam. Cada coluna leva o seu total.
   */
  const Barras = ({
    titulo, dados, formatar = (v) => numero(v), cor = 'bg-amber-500',
    corNegativa = 'bg-red-500', nota, acessorio, formatarSegundo = euros
  }) => {
    const maximo = Math.max(...dados.map((d) => Math.abs(d.valor)), 0) || 1;
    const total = dados.reduce((t, d) => t + d.valor, 0);
    const temSegunda = dados.some((d) => d.segundo !== undefined && d.segundo !== null);
    const totalSegundo = dados.reduce((t, d) => t + (Number(d.segundo) || 0), 0);
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-base">{titulo}</CardTitle>
            {acessorio}
          </div>
          {nota && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{nota}</p>
          )}
        </CardHeader>
        <CardContent>
          {dados.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{txt.noData}</p>
          ) : (
            <div className="space-y-2">
              {dados.map((d) => (
                <div key={d.rotulo} className="flex items-center gap-3">
                  <span
                    className={`text-sm shrink-0 truncate ${temSegunda ? 'w-24 sm:w-28' : 'w-28 sm:w-36'}`}
                    title={d.rotulo}
                  >
                    {d.rotulo}
                  </span>
                  <div className="flex-1 min-w-0 h-5 rounded bg-gray-100 dark:bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded ${d.valor < 0 ? corNegativa : cor}`}
                      style={{ width: `${(Math.abs(d.valor) / maximo) * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 text-right truncate ${temSegunda ? 'w-12 sm:w-14' : 'w-20 sm:w-24'}`}
                    style={{ color: d.valor < 0 ? '#dc2626' : 'var(--text-primary)' }}
                  >
                    {formatar(d.valor)}
                  </span>
                  {temSegunda && (
                    <span
                      className="text-sm font-semibold w-16 sm:w-20 shrink-0 text-right truncate"
                      style={{ color: 'var(--ko-primary-orange)' }}
                    >
                      {formatarSegundo(d.segundo || 0)}
                    </span>
                  )}
                </div>
              ))}
              {/* Os totais, em pequeno, no canto de baixo à direita */}
              <div className="pt-2 flex justify-end gap-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {txt.total}:{' '}
                  <span className="font-semibold" style={{ color: total < 0 ? '#dc2626' : 'var(--text-primary)' }}>
                    {formatar(total)}
                  </span>
                </span>
                {temSegunda && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {txt.total}:{' '}
                    <span className="font-semibold" style={{ color: 'var(--ko-primary-orange)' }}>
                      {formatarSegundo(totalSegundo)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const serie = (grupos, formatarRotulo = (k) => k) =>
    porOrdemDeValor(grupos).map((x) => ({ rotulo: formatarRotulo(x.chave), valor: x.valor }));

  const porMes = (grupos, de, ate) =>
    serieMensal(grupos, de, ate).map((m) => ({ rotulo: m.rotulo, valor: m.valor }));

  /** Por mês, com uma segunda coluna: a contagem e o dinheiro que ela gera. */
  const porMesComDinheiro = (grupos, dinheiro, de, ate) =>
    serieMensal(grupos, de, ate).map((m) => ({
      rotulo: m.rotulo,
      valor: m.valor,
      segundo: dinheiro[m.chave] || 0
    }));

  const semanaOrdenada = (grupos) =>
    SEMANA.filter((d) => grupos[d] !== undefined).map((d) => ({ rotulo: d, valor: grupos[d] }));

  /* ------------------------------------------------------------- ecrã */

  // Os limites do ano escolhido, que as barras por mês usam
  const doAno = {
    de: { ano: anoEscolhido, mes: 1, dia: 1 },
    ate: { ano: anoEscolhido, mes: 12, dia: 31 }
  };
  const mesesComPresencas = Object.keys(resumo.presencasPorDiaDaSemanaEMes || {}).sort();

  const periodoLegivel = `${new Date(inicio).toLocaleDateString('pt-PT')} — ${new Date(fim).toLocaleDateString('pt-PT')}`;
  const anteriorLegivel = (p) => p && p.inicio
    ? `${new Date(p.inicio).toLocaleDateString('pt-PT')} — ${new Date(p.fim).toLocaleDateString('pt-PT')}`
    : '';

  return (
    <div className="p-4 sm:p-6 space-y-6 fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{txt.reports}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {reportType === 'resumo' ? `${txt.year} ${anoEscolhido}` : periodoLegivel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={exportReport} className="btn-hover" data-testid="export-report-btn">
            <Download className="mr-2" size={16} />
            {txt.export}
          </Button>
          <Button onClick={() => window.print()} variant="outline" className="btn-hover" data-testid="print-report-btn">
            <Printer className="mr-2" size={16} />
            {txt.print}
          </Button>
        </div>
      </div>

      {(reportType === 'resumo' || reportType === 'payment') && (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {txt.accountsStart}
        </p>
      )}

      {/* Escolha do relatório */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                {txt.reportType}
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="report-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="resumo">{txt.overviewReport}</SelectItem>
                  <SelectItem value="attendance">{txt.attendanceReport}</SelectItem>
                  <SelectItem value="payment">{txt.paymentReport}</SelectItem>
                  <SelectItem value="member">{txt.memberReport}</SelectItem>
                  <SelectItem value="inventory">{txt.inventoryReport}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === 'resumo' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {txt.year}
                </label>
                <Select value={String(anoEscolhido)} onValueChange={(v) => setAnoEscolhido(Number(v))}>
                  <SelectTrigger data-testid="report-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {txt.dateRange}
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger data-testid="date-range"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">{txt.thisMonth}</SelectItem>
                    <SelectItem value="lastMonth">{txt.lastMonth}</SelectItem>
                    <SelectItem value="thisYear">{txt.thisYear}</SelectItem>
                    <SelectItem value="lastYear">{txt.lastYear}</SelectItem>
                    <SelectItem value="last12">{txt.last12}</SelectItem>
                    <SelectItem value="custom">{txt.custom}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {reportType !== 'resumo' && dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {txt.startDate}
                  </label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} data-testid="start-date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                    {txt.endDate}
                  </label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} data-testid="end-date" />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">A carregar dados...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">

          {/* ------------------------------------------------ Resumo do ano */}
          {reportType === 'resumo' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={txt.totalAttendance} value={numero(resumo.totais.presencas)}
                  hint={`${txt.year} ${anoEscolhido}`} icon={Activity} color="bg-blue-600" />
                <StatCard title={txt.newMembers} value={numero(resumo.totais.inscricoes)}
                  hint={`${txt.year} ${anoEscolhido}`} icon={UserPlus} color="bg-indigo-600" />
                <StatCard title={txt.billing} value={euros(resumo.totais.faturacao)}
                  hint={`${txt.year} ${anoEscolhido}`} icon={TrendingUp} color="bg-green-600" />
                <StatCard title={txt.netProfit}
                  value={euros(resumo.totais.faturacao - resumo.totais.despesa)}
                  hint={`${txt.year} ${anoEscolhido}`} icon={Wallet}
                  color={resumo.totais.faturacao - resumo.totais.despesa >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
                  destaque={resumo.totais.faturacao - resumo.totais.despesa < 0 ? '#dc2626' : undefined} />
                <StatCard title={txt.trialClasses} value={numero(resumo.totais.experimentais)}
                  hint={`${euros(resumo.totais.receitaExperimentais)} ${txt.year.toLowerCase()} ${anoEscolhido}`}
                  icon={Sparkles} color="bg-violet-600" />
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb size={18} className="text-amber-500" />
                    {txt.highlights}
                  </CardTitle>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{txt.highlightsHint}</p>
                </CardHeader>
                <CardContent>
                  {resumo.notas.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{txt.noData}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {resumo.notas.map((n) => {
                        const Icone = ICONES_DAS_NOTAS[n.icone] || Lightbulb;
                        return (
                          <div key={n.titulo} className="flex items-start gap-3 p-3 rounded-lg"
                               style={{ background: 'var(--background-elevated)' }}>
                            <div className="p-2 rounded-full bg-amber-500/15 shrink-0">
                              <Icone size={16} className="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {n.titulo}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-300">{n.texto}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* A ordem pedida pelo dono do ginásio: primeiro quem são e
                  quantos, depois o que fazem, depois o dinheiro */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Barras titulo={txt.activeMembersByActivity}
                  dados={serie(resumo.sociosAtivosPorModalidade)} cor="bg-cyan-600" />
                <Barras titulo={txt.signupsByMonth}
                  dados={porMesComDinheiro(resumo.inscricoesPorMes, resumo.segurosPorMes, doAno.de, doAno.ate)}
                  cor="bg-indigo-500" nota={txt.signupsHint} />

                <Barras titulo={txt.attendanceByActivity}
                  dados={serie(resumo.presencasPorModalidade)} cor="bg-violet-500" />
                <Barras titulo={txt.trialsByMonth}
                  dados={porMesComDinheiro(resumo.experimentaisPorMes, resumo.receitaExperimentaisPorMes, doAno.de, doAno.ate)}
                  cor="bg-fuchsia-500" nota={txt.trialsHint} />

                <Barras titulo={txt.attendanceByMonth}
                  dados={porMes(resumo.presencasPorMes, doAno.de, doAno.ate)}
                  cor="bg-blue-500" />
                <Barras
                  titulo={txt.attendanceByWeekday}
                  dados={semanaOrdenada(
                    mesDaSemana === 'ano'
                      ? resumo.presencasPorDiaDaSemana
                      : (resumo.presencasPorDiaDaSemanaEMes[mesDaSemana] || {})
                  )}
                  cor="bg-indigo-500"
                  acessorio={
                    <Select value={mesDaSemana} onValueChange={setMesDaSemana}>
                      <SelectTrigger className="w-40 h-8 text-xs" data-testid="weekday-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ano">{txt.wholeYear}</SelectItem>
                        {mesesComPresencas.map((m) => (
                          <SelectItem key={m} value={m}>{rotuloDoMes(m)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  }
                />

                <Barras titulo={txt.netByMonth}
                  dados={porMes(resumo.liquidoPorMes, doAno.de, doAno.ate)}
                  formatar={euros} cor="bg-emerald-600" />
                <Barras titulo={txt.expensesByMonth}
                  dados={porMes(resumo.despesaPorMes, doAno.de, doAno.ate)}
                  formatar={euros} cor="bg-red-500" />

                <Barras titulo={txt.netByActivity}
                  dados={serie(resumo.porModalidade.receita)}
                  formatar={euros} cor="bg-emerald-600"
                  nota={txt.netByActivityHint} />
              </div>
            </>
          )}

          {/* --------------------------------------------------- Presenças */}
          {reportType === 'attendance' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={txt.totalAttendance} value={numero(presencas.total)}
                  icon={Activity} color="bg-blue-600" comparacao={presencas.comparacao.total} />
                <StatCard title={txt.uniqueVisitors} value={numero(presencas.unicos)}
                  icon={Users} color="bg-green-600" comparacao={presencas.comparacao.unicos} />
                <StatCard title={txt.dailyAverage} value={numero(presencas.mediaDiaria, 1)}
                  icon={Calendar} color="bg-purple-600" comparacao={presencas.comparacao.mediaDiaria}
                  formatarComparacao={(v) => numero(v, 1)} />
                <StatCard title={txt.trialClasses} value={numero(presencas.experimentais)}
                  icon={Sparkles} color="bg-violet-600" comparacao={presencas.comparacao.experimentais} />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {txt.previousPeriod}: {anteriorLegivel(presencas.periodoAnterior)}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Barras titulo={txt.attendanceByMonth} dados={porMes(presencas.porMes, inicio, fim)} cor="bg-blue-500" />
                <Barras titulo={txt.attendanceByWeekday} dados={semanaOrdenada(presencas.porDiaDaSemana)} cor="bg-indigo-500" />
                <Barras titulo={txt.attendanceByActivity} dados={serie(presencas.porModalidade)} cor="bg-violet-500" />
                <Barras titulo={txt.topMembers}
                  dados={presencas.maisAssiduos.map((m) => ({ rotulo: m.nome, valor: m.valor }))}
                  cor="bg-amber-500" />
                {presencas.experimentais > 0 && (
                  <>
                    <Barras titulo={txt.trialsByActivity} dados={serie(presencas.experimentaisPorModalidade)} cor="bg-fuchsia-500" />
                    <Barras titulo={txt.trialsByMonth} dados={porMes(presencas.experimentaisPorMes, inicio, fim)} cor="bg-fuchsia-500" />
                  </>
                )}
              </div>
            </>
          )}

          {/* ---------------------------------------------------- Finanças */}
          {reportType === 'payment' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard title={txt.billing} value={euros(financas.faturacao)} hint={txt.billingHint}
                  icon={TrendingUp} color="bg-green-600"
                  comparacao={financas.comparacao.faturacao} formatarComparacao={euros} />
                <StatCard title={txt.totalExpenses} value={euros(financas.despesa)}
                  icon={TrendingDown} color="bg-red-500"
                  comparacao={financas.comparacao.despesa} formatarComparacao={euros} />
                <StatCard title={txt.netProfit} value={euros(financas.liquido)}
                  hint={financas.margem === null ? undefined : `${txt.margin}: ${financas.margem.toFixed(1)}%`}
                  icon={Wallet} color={financas.liquido >= 0 ? 'bg-emerald-600' : 'bg-red-600'}
                  destaque={financas.liquido < 0 ? '#dc2626' : undefined}
                  comparacao={financas.comparacao.liquido} formatarComparacao={euros} />
                <StatCard title={txt.merchandiseRevenue} value={euros(financas.merchandise)}
                  hint={`${numero(financas.unidadesVendidas)} un.`}
                  icon={ShoppingBag} color="bg-green-700"
                  comparacao={financas.comparacao.merchandise} formatarComparacao={euros} />
                <StatCard title={txt.totalPayments} value={numero(financas.nPagamentos)}
                  hint={`${txt.averagePayment}: ${euros(financas.pagamentoMedio)}`}
                  icon={DollarSign} color="bg-blue-600"
                  comparacao={financas.comparacao.nPagamentos} />
                <StatCard title={txt.trialRevenue} value={euros(financas.experimentais)}
                  hint={`${numero(financas.nExperimentais)} ${txt.trialClasses.toLowerCase()}`}
                  icon={Sparkles} color="bg-violet-600"
                  comparacao={financas.comparacao.experimentais} formatarComparacao={euros} />
                <StatCard title={txt.pendingPayments} value={numero(financas.pendentes)}
                  icon={Calendar} color="bg-orange-500" />
              </div>

              {financas.periodoAnterior && (
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                  {txt.previousPeriod}: {anteriorLegivel(financas.periodoAnterior)}
                </p>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Barras titulo={txt.billingByMonth} dados={porMes(financas.faturacaoPorMes, inicio, fim)}
                  formatar={euros} cor="bg-green-600" />
                <Barras titulo={txt.expensesByMonth} dados={porMes(financas.despesaPorMes, inicio, fim)}
                  formatar={euros} cor="bg-red-500" />
                <Barras titulo={txt.netByMonth}
                  dados={porMes(
                    Object.fromEntries(Object.keys({ ...financas.faturacaoPorMes, ...financas.despesaPorMes })
                      .map((m) => [m, (financas.faturacaoPorMes[m] || 0) - (financas.despesaPorMes[m] || 0)])),
                    inicio, fim
                  )}
                  formatar={euros} cor="bg-emerald-600" />
                <Barras titulo={txt.expensesByCategory}
                  dados={serie(financas.despesaPorCategoria, nomeDaCategoria)}
                  formatar={euros} cor="bg-orange-500" />
                <Barras titulo={txt.merchandiseByItem} dados={serie(financas.merchandisePorArtigo)}
                  formatar={euros} cor="bg-teal-600" />
                <Barras titulo={txt.byMethod} dados={serie(financas.porMetodo, paymentMethodLabel)}
                  formatar={euros} cor="bg-sky-600" />
                {financas.nExperimentais > 0 && (
                  <>
                    <Barras titulo={txt.trialRevenueByMonth}
                      dados={porMes(financas.receitaExperimentaisPorMes, inicio, fim)}
                      formatar={euros} cor="bg-violet-500" />
                    <Barras titulo={txt.trialsByMonth}
                      dados={porMes(financas.experimentaisPorMes, inicio, fim)}
                      cor="bg-fuchsia-500" />
                    <Barras titulo={txt.trialRevenueByActivity}
                      dados={serie(financas.receitaExperimentaisPorModalidade)}
                      formatar={euros} cor="bg-violet-500" />
                    <Barras titulo={txt.trialsByActivity}
                      dados={serie(financas.experimentaisPorModalidade)}
                      cor="bg-fuchsia-500" />
                  </>
                )}
              </div>
            </>
          )}

          {/* ------------------------------------------------------ Sócios */}
          {reportType === 'member' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={txt.totalMembers} value={numero(socios.total)}
                  hint={socios.semModalidade > 0 ? `${socios.semModalidade} ${txt.withoutActivity}` : undefined}
                  icon={Users} color="bg-blue-600" />
                <StatCard title={txt.activeMembers} value={numero(socios.ativos)}
                  hint={`${socios.percentagemAtivos.toFixed(0)}%`}
                  icon={Activity} color="bg-emerald-600" />
                <StatCard title={txt.newMembers} value={numero(socios.novos)}
                  icon={UserPlus} color="bg-indigo-600" comparacao={socios.comparacao.novos} />
                <StatCard title={txt.averageAge}
                  value={socios.idadeMedia === null ? '—' : `${numero(socios.idadeMedia)} ${txt.years}`}
                  icon={CalendarDays} color="bg-purple-600" />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                {txt.previousPeriod}: {anteriorLegivel(socios.periodoAnterior)}
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Barras titulo={txt.signupsByMonth} dados={porMes(socios.inscricoesPorMes, inicio, fim)} cor="bg-indigo-500" />
                <Barras titulo={txt.signupsByActivity} dados={serie(socios.inscricoesPorModalidade)} cor="bg-amber-500" />
                <Barras titulo={txt.membersByActivity} dados={serie(socios.porModalidade)} cor="bg-cyan-600" />
                <Barras titulo={txt.membersByAge} dados={serie(socios.porEscalao)} cor="bg-purple-500" />
              </div>
            </>
          )}

          {/* ------------------------------------------------------- Stock */}
          {reportType === 'inventory' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title={txt.totalItems} value={numero(stock.totalItems)} icon={Package} color="bg-blue-600" />
                <StatCard title={txt.totalValue} value={euros(stock.totalValue)} icon={DollarSign} color="bg-green-600" />
                <StatCard title={txt.lowStockItems} value={numero(stock.lowStockItems)} icon={Activity} color="bg-orange-500" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Barras titulo={txt.itemsByCategory} dados={serie(stock.porCategoria)} cor="bg-blue-500" />
                <Barras titulo={txt.bestSellers} dados={serie(stock.maisVendidos).slice(0, 15)} cor="bg-teal-600" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;
