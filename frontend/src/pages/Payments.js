import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { 
  CreditCard, 
  ShoppingBag,
  Plus, 
  Search, 
  Filter,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Edit,
  Trash2,
  Eye,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Payments = ({ language, translations }) => {
  const { isAdmin } = useAuth();
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedMember, setSelectedMember] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [sales, setSales] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [expenseFormData, setExpenseFormData] = useState({
    description: '',
    amount: '',
    expense_date: '',
    category: ''
  });

  const todayISO = () => new Date().toISOString().split('T')[0];

  const INSURANCE_AMOUNT = '20.00';

  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    payment_date: todayISO(),
    payment_type: 'quota',
    payment_method: 'cash',
    description: ''
  });

  const t = {
    pt: {
      payments: 'Gestão de Finanças',
      addPayment: 'Registar Pagamento',
      addExpense: 'Registar Despesa',
      searchPayments: 'Procurar pagamentos...',
      allStatuses: 'Todos os Status',
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Em Atraso',
      allMembers: 'Todos os Membros',
      allDates: 'Todas as Datas',
      thisMonth: 'Este Mês',
      lastMonth: 'Mês Passado',
      thisYear: 'Este Ano',
      member: 'Membro',
      amount: 'Valor',
      paymentMethod: 'Método de Pagamento',
      cash: 'Numerário',
      card: 'Cartão',
      transfer: 'Transferência',
      mbway: 'MBWay',
      description: 'Descrição',
      paymentDate: 'Data do Pagamento',
    category: 'Categoria',
    selectCategory: 'Selecionar categoria',
    categoryRent: 'Renda',
    categorySalaries: 'Salários (Prof., colaboradores)',
    categoryAccountant: 'Contabilista',
    categoryTechnology: 'Tecnologia (Hostinger, Site, Meta, etc.)',
    categoryEnergy: 'Energia (Luz, Gás, Água)',
    categoryInfrastructure: 'Infraestruturas (Obras)',
    categoryMerchandise: 'Merchandise',
    categoryMarketing: 'Marketing (Redes sociais, multimédia)',
    categoryLicenses: 'Licenças (Seguros)',
    categoryFnb: 'F&B (Alimentos e bebidas)',
      status: 'Status',
      save: 'Guardar',
      cancel: 'Cancelar',
      view: 'Ver',
      edit: 'Editar',
      actions: 'Ações',
      editPayment: 'Corrigir Pagamento',
      delete: 'Eliminar',
      confirmDeletePayment: 'Eliminar este pagamento? As validades do sócio serão recalculadas.',
      paymentDeleted: 'Pagamento eliminado e validades recalculadas.',
      paymentUpdated: 'Pagamento corrigido.',
      totalRevenue: 'Receitas (Quotas)',
      merchandise: 'Merchandise (Vendas)',
      paymentType: 'Tipo de Pagamento',
      modalities: 'Modalidades',
      dailyRevenue: 'Receita Diária',
      quotaBadge: 'Quota',
      insuranceBadge: 'Seguro',
      bothBadge: 'Quota + Seguro',
      typeQuota: 'Quota (mensalidade)',
      typeInsurance: 'Seguro (anual)',
      typeBoth: 'Mensalidade + Seguro',
      insuranceHint: 'Renova o seguro do sócio por um ano a partir da data do pagamento.',
      bothHint: 'Escreve o valor total (mensalidade + 20 € de seguro). Renova a mensalidade por um mês e o seguro por um ano.',
      insuranceRevenue: 'Seguros',
      merchandiseMonth: 'este mês',
      units: 'unidades vendidas',
      recentSales: 'Vendas de Merchandise',
      noSales: 'Ainda não há vendas registadas',
      item: 'Artigo',
      monthlyRevenue: 'Receita Mensal',
      pendingPayments: 'Despesas',
      recentPayments: 'Pagamentos Recentes',
      noPayments: 'Nenhum pagamento encontrado',
      paymentAdded: 'Pagamento registado com sucesso!',
      expenseAdded: 'Despesa registada com sucesso!',
      export: 'Exportar',
      paymentDetails: 'Detalhes do Pagamento',
      membershipPayment: 'Pagamento de Membership',
      selectMember: 'Selecionar membro...',
      enterAmount: 'Inserir valor...',
      paymentDescription: 'Descrição do pagamento...'
    },
    en: {
      payments: 'Finance Management',
      addPayment: 'Add Payment',
      addExpense: 'Add Expense',
      searchPayments: 'Search payments...',
      allStatuses: 'All Statuses',
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      allMembers: 'All Members',
      allDates: 'All Dates',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      thisYear: 'This Year',
      member: 'Member',
      amount: 'Amount',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      card: 'Card',
      transfer: 'Transfer',
      mbway: 'MBWay',
      description: 'Description',
      paymentDate: 'Payment Date',
    category: 'Category',
    selectCategory: 'Select category',
    categoryRent: 'Rent',
    categorySalaries: 'Salaries (teachers, staff)',
    categoryAccountant: 'Accountant',
    categoryTechnology: 'Technology (Hostinger, website, Meta, etc.)',
    categoryEnergy: 'Energy (electricity, gas, water)',
    categoryInfrastructure: 'Infrastructure (works)',
    categoryMerchandise: 'Merchandise',
    categoryMarketing: 'Marketing (social media, multimedia)',
    categoryLicenses: 'Licences (insurance)',
    categoryFnb: 'F&B (food and drinks)',
      status: 'Status',
      save: 'Save',
      cancel: 'Cancel',
      view: 'View',
      edit: 'Edit',
      actions: 'Actions',
      editPayment: 'Edit Payment',
      delete: 'Delete',
      confirmDeletePayment: 'Delete this payment? The member validities will be recalculated.',
      paymentDeleted: 'Payment deleted and validities recalculated.',
      paymentUpdated: 'Payment updated.',
      totalRevenue: 'Revenue (Fees)',
      merchandise: 'Merchandise (Sales)',
      paymentType: 'Payment Type',
      modalities: 'Activities',
      dailyRevenue: 'Daily Revenue',
      quotaBadge: 'Fee',
      insuranceBadge: 'Insurance',
      bothBadge: 'Fee + Insurance',
      typeQuota: 'Membership fee',
      typeInsurance: 'Insurance (yearly)',
      typeBoth: 'Membership + Insurance',
      insuranceHint: "Renews the member's insurance for one year from the payment date.",
      bothHint: 'Enter the total (fee + €20 insurance). Renews the fee for a month and the insurance for a year.',
      insuranceRevenue: 'Insurance',
      merchandiseMonth: 'this month',
      units: 'units sold',
      recentSales: 'Merchandise Sales',
      noSales: 'No sales recorded yet',
      item: 'Item',
      monthlyRevenue: 'Monthly Revenue',
      pendingPayments: 'Expenses',
      recentPayments: 'Recent Payments',
      noPayments: 'No payments found',
      paymentAdded: 'Payment added successfully!',
      expenseAdded: 'Expense added successfully!',
      export: 'Export',
      paymentDetails: 'Payment Details',
      membershipPayment: 'Membership Payment',
      selectMember: 'Select member...',
      enterAmount: 'Enter amount...',
      paymentDescription: 'Payment description...'
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchPayments();
    fetchExpenses();
    fetchSales();
    fetchActivities();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, dateFilter, selectedMember, searchTerm]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const memberActivities = (member) => {
    const ids = member?.activity_ids?.length
      ? member.activity_ids
      : (member?.activity_id ? [member.activity_id] : []);
    return ids.map((id) => activities.find((a) => a.id === id)).filter(Boolean);
  };

  const fetchSales = async () => {
    try {
      const response = await axios.get(`${API}/sales`);
      setSales(response.data);
    } catch (error) {
      console.error('Error fetching sales:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (selectedMember !== 'all') params.append('member_id', selectedMember);
      
      // Date filters
      const now = new Date();
      if (dateFilter === 'thisMonth') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        params.append('start_date', startOfMonth.toISOString().split('T')[0]);
      } else if (dateFilter === 'lastMonth') {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        params.append('start_date', startOfLastMonth.toISOString().split('T')[0]);
        params.append('end_date', endOfLastMonth.toISOString().split('T')[0]);
      } else if (dateFilter === 'thisYear') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        params.append('start_date', startOfYear.toISOString().split('T')[0]);
      }
      
      const response = await axios.get(`${API}/payments?${params}`);
      let paymentsData = response.data;
      
      // Get member details for each payment with better error handling
      const paymentsWithMembers = await Promise.all(
        paymentsData.map(async (payment) => {
          try {
            const memberResponse = await axios.get(`${API}/members/${payment.member_id}`);
            return {
              ...payment,
              member: memberResponse.data
            };
          } catch (error) {
            console.warn(`Member ${payment.member_id} not found for payment, likely deleted`);
            return {
              ...payment,
              member: { 
                name: 'Membro eliminado', 
                id: payment.member_id,
                member_number: 'N/A',
                membership_type: 'N/A'
              }
            };
          }
        })
      );
      
      // Filter by search term if provided
      if (searchTerm) {
        paymentsWithMembers = paymentsWithMembers.filter(payment => 
          payment.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Mais recentes no topo
      paymentsWithMembers.sort((a, b) => {
        const dataA = new Date(a.payment_date), dataB = new Date(b.payment_date);
        if (dataA.getTime() !== dataB.getTime()) return dataB - dataA;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setPayments(paymentsWithMembers);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const editarPagamento = (payment) => {
    setEditingPayment(payment);
    setMemberSearch('');
    setFormData({
      member_id: payment.member_id,
      amount: String(payment.amount),
      payment_date: String(payment.payment_date).split('T')[0],
      payment_type: payment.payment_type || 'quota',
      payment_method: payment.payment_method || 'cash',
      description: payment.description || ''
    });
    setShowAddDialog(true);
  };

  const apagarPagamento = async (payment) => {
    if (!window.confirm(t[language].confirmDeletePayment)) return;
    try {
      await axios.delete(`${API}/payments/${payment.id}`);
      toast.success(t[language].paymentDeleted);
      fetchPayments();
      fetchMembers();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error(error.response?.data?.detail || 'Erro ao eliminar o pagamento');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.member_id) {
      toast.error('Escolhe o aluno na lista.');
      return;
    }

    const corpo = {
      ...formData,
      amount: parseFloat(formData.amount),
      payment_date: formData.payment_date || null
    };

    try {
      if (editingPayment) {
        await axios.put(`${API}/payments/${editingPayment.id}`, corpo);
        toast.success(t[language].paymentUpdated);
      } else {
        await axios.post(`${API}/payments`, corpo);
        toast.success(t[language].paymentAdded);
      }

      // Qualquer pagamento altera as validades do sócio
      fetchMembers();
      setShowAddDialog(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error(error.response?.data?.detail || 'Erro ao guardar o pagamento');
    }
  };

  const resetForm = () => {
    setMemberSearch('');
    setFormData({
      member_id: '',
      amount: '',
      payment_date: todayISO(),
      payment_type: 'quota',
      payment_method: 'cash',
      description: ''
    });
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        description: expenseFormData.description,
        amount: parseFloat(expenseFormData.amount)
      };
      if (expenseFormData.expense_date) {
        payload.expense_date = expenseFormData.expense_date;
      }
      if (expenseFormData.category) {
        payload.category = expenseFormData.category;
      }
      await axios.post(`${API}/expenses`, payload);

      toast.success(t[language].expenseAdded);
      setShowAddExpenseDialog(false);
      resetExpenseForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Erro ao registar despesa');
    }
  };

  const resetExpenseForm = () => {
    setExpenseFormData({
      description: '',
      amount: '',
      expense_date: '',
      category: ''
    });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPaymentMethodColor = (method) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800';
      case 'card': return 'bg-blue-100 text-blue-800';
      case 'transfer': return 'bg-purple-100 text-purple-800';
      case 'mbway': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800 dark:text-gray-100';
    }
  };

  const getPaymentStats = () => {
    const pagos = payments.filter(p => p.status === 'paid');
    const seguroFixo = parseFloat(INSURANCE_AMOUNT);

    // Num pagamento combinado, os 20 € do seguro contam como seguro e o
    // restante como quota, para as duas receitas nao se confundirem
    const parteSeguro = (p) => {
      if (p.payment_type === 'seguro') return p.amount;
      if (p.payment_type === 'quota_seguro') return Math.min(seguroFixo, p.amount);
      return 0;
    };
    const parteQuota = (p) => p.amount - parteSeguro(p);

    const totalRevenue = pagos.reduce((sum, p) => sum + parteQuota(p), 0);
    const insuranceRevenue = pagos.reduce((sum, p) => sum + parteSeguro(p), 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = pagos
      .filter(p => new Date(p.payment_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    // Receita do dia: tudo o que entrou hoje, para fechar a caixa
    const hoje = new Date();
    const mesmoDia = (d) => {
      const data = new Date(d);
      return data.getFullYear() === hoje.getFullYear()
        && data.getMonth() === hoje.getMonth()
        && data.getDate() === hoje.getDate();
    };
    const dailyPayments = pagos.filter(p => mesmoDia(p.payment_date)).reduce((sum, p) => sum + p.amount, 0);
    const dailySales = sales.filter(s => mesmoDia(s.sale_date)).reduce((sum, s) => sum + (s.total || 0), 0);
    const dailyRevenue = dailyPayments + dailySales;

    // Vendas de merchandise: receita do balcao, contada a parte das quotas
    const merchandiseRevenue = sales.reduce((sum, s) => sum + (s.total || 0), 0);
    const merchandiseMonthly = sales
      .filter(s => new Date(s.sale_date) >= startOfMonth)
      .reduce((sum, s) => sum + (s.total || 0), 0);
    const merchandiseUnits = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);

    return {
      totalRevenue,
      insuranceRevenue,
      monthlyRevenue,
      dailyRevenue,
      dailyPayments,
      dailySales,
      pendingCount,
      totalExpenses,
      merchandiseRevenue,
      merchandiseMonthly,
      merchandiseUnits
    };
  };

  const exportPayments = () => {
    const csvContent = [
      ['Data', 'Membro', 'Valor', 'Método', 'Status', 'Descrição'],
      ...payments.map(payment => [
        payment.payment_date,
        payment.member.name,
        payment.amount,
        payment.payment_method,
        payment.status,
        payment.description || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const stats = getPaymentStats();

  // Pesquisa sem preciosismos: ignora maiúsculas, acentos e as ligações dos
  // nomes ("de", "da", "dos"), para "joao silva" encontrar "João da Silva"
  const LIGACOES = ['de', 'da', 'do', 'das', 'dos', 'e', 'du', 'del', 'di'];

  const normalizar = (texto) =>
    String(texto || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim();

  // Procura pelo início das palavras, nunca a meio, desde a primeira letra.
  // Quem tem o nome próprio a começar pelas letras escritas aparece primeiro.
  const correspondePesquisa = (procurado, nome, numero, telefone) => {
    const termos = normalizar(procurado).split(/\s+/).filter((t) => t && !LIGACOES.includes(t));
    if (termos.length === 0) return true;

    const palavras = normalizar(nome).split(/\s+/).filter((p) => p && !LIGACOES.includes(p));
    const numeroLimpo = normalizar(numero);
    const digitos = String(telefone || '').replace(/\D/g, '');

    return termos.every((termo) => {
      if (palavras.some((p) => p.startsWith(termo))) return true;
      if (numeroLimpo && (numeroLimpo.startsWith(termo) || numeroLimpo.replace(/^0+/, '').startsWith(termo))) return true;
      if (digitos && /^\d+$/.test(termo) && digitos.includes(termo)) return true;
      return false;
    });
  };

  // 0 para quem tem o nome próprio a começar pelo que foi escrito, 1 para os restantes
  const relevancia = (procurado, nome) => {
    const termos = normalizar(procurado).split(/\s+/).filter((t) => t && !LIGACOES.includes(t));
    const palavras = normalizar(nome).split(/\s+/).filter((p) => p && !LIGACOES.includes(p));
    if (termos.length === 0 || palavras.length === 0) return 1;
    return termos.some((t) => palavras[0].startsWith(t)) ? 0 : 1;
  };

  const getSearchedMembers = () => {
    const procurado = memberSearch.trim();
    const lista = procurado
      ? members.filter((m) => correspondePesquisa(procurado, m.name, m.member_number, m.phone))
      : members;

    // Nomes próprios primeiro; dentro de cada grupo, por ordem alfabética
    return [...lista].sort((a, b) => {
      const ra = procurado ? relevancia(procurado, a.name) : 0;
      const rb = procurado ? relevancia(procurado, b.name) : 0;
      if (ra !== rb) return ra - rb;
      return normalizar(a.name).localeCompare(normalizar(b.name));
    });
  };

  const getSelectedMemberObject = () => members.find((m) => m.id === formData.member_id);

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 lg:mb-0">
          {t[language].payments}
        </h1>
        
        <Dialog
          open={showAddDialog}
          onOpenChange={(aberto) => { setShowAddDialog(aberto); if (!aberto) setEditingPayment(null); }}
        >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? t[language].editPayment : t[language].addPayment}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="member_search">{t[language].member} *</Label>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="member_search"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Procurar por nome ou numero do aluno..."
                    className="pl-9"
                    autoComplete="off"
                    data-testid="payment-member-search"
                  />
                </div>

                <div className="mt-2 border rounded-lg max-h-[8.25rem] overflow-y-auto" data-testid="payment-member-list">
                  {getSearchedMembers().length > 0 ? (
                    getSearchedMembers().map((member) => {
                      const selected = formData.member_id === member.id;
                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => setFormData({...formData, member_id: member.id})}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between border-b last:border-b-0 transition-colors ${
                            selected ? 'font-medium' : 'hover:bg-gray-50'
                          }`}
                          style={{ background: selected ? 'rgba(184, 101, 27, 0.18)' : 'transparent', color: 'var(--text-primary)' }}
                          data-testid={`payment-member-${member.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <Badge variant="outline">{member.member_number}</Badge>
                            <span>{member.name}</span>
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{member.membership_type}</span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhum aluno encontrado</p>
                  )}
                </div>

                {formData.member_id && getSelectedMemberObject() && (
                  <p className="text-sm mt-2" style={{ color: 'var(--ko-primary-orange)' }}>
                    Aluno selecionado: <strong>{getSelectedMemberObject().name}</strong> (n.º {getSelectedMemberObject().member_number})
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="payment_type">{t[language].paymentType} *</Label>
                <Select
                  value={formData.payment_type}
                  onValueChange={(value) => setFormData({
                    ...formData,
                    payment_type: value,
                    // Só o seguro isolado tem valor fixo; nos outros o valor é escrito
                    amount: value === 'seguro' ? INSURANCE_AMOUNT : (formData.amount === INSURANCE_AMOUNT ? '' : formData.amount)
                  })}
                >
                  <SelectTrigger data-testid="payment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quota">{t[language].typeQuota}</SelectItem>
                    <SelectItem value="seguro">{t[language].typeInsurance}</SelectItem>
                    <SelectItem value="quota_seguro">{t[language].typeBoth}</SelectItem>
                  </SelectContent>
                </Select>
                {formData.payment_type === 'seguro' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ko-primary-orange)' }}>
                    {t[language].insuranceHint}
                  </p>
                )}
                {formData.payment_type === 'quota_seguro' && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ko-primary-orange)' }}>
                    {t[language].bothHint}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="amount">{t[language].amount} (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                  placeholder={t[language].enterAmount}
                  data-testid="payment-amount"
                />
              </div>
              
              <div>
                <Label htmlFor="payment_date">{t[language].paymentDate} *</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                  required
                  data-testid="payment-date"
                />
              </div>

              <div>
                <Label htmlFor="payment_method">{t[language].paymentMethod} *</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => setFormData({...formData, payment_method: value})}
                >
                  <SelectTrigger data-testid="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t[language].cash}</SelectItem>
                    <SelectItem value="card">{t[language].card}</SelectItem>
                    <SelectItem value="transfer">{t[language].transfer}</SelectItem>
                    <SelectItem value="mbway">{t[language].mbway}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">{t[language].description}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  placeholder={t[language].paymentDescription}
                  data-testid="payment-description"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                >
                  {t[language].cancel}
                </Button>
                <Button type="submit" data-testid="save-payment-btn">
                  {t[language].save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showAddExpenseDialog} onOpenChange={setShowAddExpenseDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t[language].addExpense}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <Label htmlFor="expense-category">{t[language].category}</Label>
            <Select value={expenseFormData.category} onValueChange={(value) => setExpenseFormData({...expenseFormData, category: value})}>
              <SelectTrigger id="expense-category" data-testid="expense-category">
                <SelectValue placeholder={t[language].selectCategory} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="rent">{t[language].categoryRent}</SelectItem>
                <SelectItem value="salaries">{t[language].categorySalaries}</SelectItem>
                <SelectItem value="accountant">{t[language].categoryAccountant}</SelectItem>
                <SelectItem value="technology">{t[language].categoryTechnology}</SelectItem>
                <SelectItem value="energy">{t[language].categoryEnergy}</SelectItem>
                <SelectItem value="infrastructure">{t[language].categoryInfrastructure}</SelectItem>
                <SelectItem value="merchandise">{t[language].categoryMerchandise}</SelectItem>
                <SelectItem value="marketing">{t[language].categoryMarketing}</SelectItem>
                <SelectItem value="licenses">{t[language].categoryLicenses}</SelectItem>
                <SelectItem value="fnb">{t[language].categoryFnb}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="expense-description">{t[language].description} *</Label>
            <Textarea
              id="expense-description"
              value={expenseFormData.description}
              onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
              required
              placeholder={t[language].paymentDescription}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="expense-amount">{t[language].amount} (€) *</Label>
            <Input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0"
              value={expenseFormData.amount}
              onChange={(e) => setExpenseFormData({...expenseFormData, amount: e.target.value})}
              required
              placeholder={t[language].enterAmount}
              data-testid="expense-amount"
            />
          </div>

          <div>
            <Label htmlFor="expense-date">{t[language].paymentDate}</Label>
            <Input
              id="expense-date"
              type="date"
              value={expenseFormData.expense_date}
              onChange={(e) => setExpenseFormData({...expenseFormData, expense_date: e.target.value})}
            />
          </div>


          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddExpenseDialog(false)}
            >
              {t[language].cancel}
            </Button>
            <Button type="submit" data-testid="save-expense-btn">
              {t[language].save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

{/* Statistics */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin() ? 'lg:grid-cols-3 xl:grid-cols-5' : ''} gap-6`}>
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t[language].totalRevenue}
                </p>
                {isAdmin() && (
                  <>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      €{stats.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t[language].insuranceRevenue}: €{stats.insuranceRevenue.toFixed(2)}
                    </p>
                  </>
                )}
                <Button
                  size="sm"
                  className="btn-hover mt-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => { resetForm(); setShowAddDialog(true); }}
                  data-testid="add-payment-btn"
                >
                  <Plus className="mr-1" size={14} />
                  {t[language].addPayment}
                </Button>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <DollarSign size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {isAdmin() && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t[language].monthlyRevenue}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  €{stats.monthlyRevenue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {isAdmin() && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t[language].dailyRevenue}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  €{stats.dailyRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  €{stats.dailyPayments.toFixed(2)} pagamentos · €{stats.dailySales.toFixed(2)} merchandise
                </p>
              </div>
              <div className="p-3 rounded-full" style={{ background: 'var(--gradient-primary)' }}>
                <Calendar size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {isAdmin() && (
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t[language].merchandise}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  €{stats.merchandiseRevenue.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  €{stats.merchandiseMonthly.toFixed(2)} {t[language].merchandiseMonth} · {stats.merchandiseUnits} {t[language].units}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-600">
                <ShoppingBag size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        )}
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  {t[language].pendingPayments}
                </p>
                {isAdmin() && (
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">€{stats.totalExpenses.toFixed(2)}</p>
                )}
                <Button
                  size="sm"
                  className="btn-hover mt-2 bg-orange-500 hover:bg-orange-600 text-white"
                  onClick={() => { resetExpenseForm(); setShowAddExpenseDialog(true); }}
                  data-testid="add-expense-btn"
                >
                  <Plus className="mr-1" size={14} />
                  {t[language].addExpense}
                </Button>
              </div>
              <div className="p-3 rounded-full bg-orange-500">
                <CreditCard size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={t[language].searchPayments}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="payments-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allStatuses}</SelectItem>
                <SelectItem value="paid">{t[language].paid}</SelectItem>
                <SelectItem value="pending">{t[language].pending}</SelectItem>
                <SelectItem value="overdue">{t[language].overdue}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allDates} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allDates}</SelectItem>
                <SelectItem value="thisMonth">{t[language].thisMonth}</SelectItem>
                <SelectItem value="lastMonth">{t[language].lastMonth}</SelectItem>
                <SelectItem value="thisYear">{t[language].thisYear}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allMembers} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allMembers}</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2" />
            {t[language].recentPayments} ({payments.length})
          </CardTitle>
          {isAdmin() && (
            <Button 
              variant="outline" 
              onClick={exportPayments}
              className="btn-hover"
              data-testid="export-payments-btn"
            >
              <Download className="mr-2" size={16} />
              {t[language].export}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].member}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {isAdmin() ? t[language].amount : t[language].modalities}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].paymentMethod}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].paymentDate}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].status}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].description}
                    </th>
                    <th className="text-right p-4 font-medium text-gray-600 dark:text-gray-300">
                      {t[language].actions}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{payment.member.name}</p>
                            <Badge
                              variant="outline"
                              className="mt-1"
                              style={payment.payment_type === 'seguro'
                                ? { borderColor: '#16a34a', color: '#16a34a' }
                                : payment.payment_type === 'quota_seguro'
                                  ? { borderColor: '#2563eb', color: '#2563eb' }
                                  : { borderColor: 'var(--ko-primary-orange)', color: 'var(--ko-primary-orange)' }}
                            >
                              {payment.payment_type === 'seguro'
                                ? t[language].insuranceBadge
                                : payment.payment_type === 'quota_seguro'
                                  ? t[language].bothBadge
                                  : t[language].quotaBadge}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {isAdmin() ? (
                          <div className="flex items-center">
                            <DollarSign size={16} className="text-gray-400 dark:text-gray-500 mr-1" />
                            <span className="font-semibold">€{payment.amount.toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {memberActivities(payment.member).length > 0 ? (
                              memberActivities(payment.member).map((a) => (
                                <Badge key={a.id} variant="outline" style={{ borderColor: a.color, color: a.color }}>
                                  {a.name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge className={getPaymentMethodColor(payment.payment_method)}>
                          {t[language][payment.payment_method]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Calendar size={16} className="text-gray-400 dark:text-gray-500 mr-2" />
                          {new Date(payment.payment_date).toLocaleDateString('pt-PT')}
                        </div>
                      </td>
                      <td className="p-4">
                        {(() => {
                          // Ligado exclusivamente aos pagamentos do sócio
                          const estado = payment.member?.membership_status;
                          const cor = estado === 'active' ? '#16a34a'
                            : estado === 'suspended' ? '#dc2626' : '#dc2626';
                          const texto = estado === 'active' ? 'ATIVO'
                            : estado === 'suspended' ? 'SUSPENSO' : 'INATIVO';
                          const ate = payment.member?.membership_valid_until;
                          return (
                            <Badge
                              variant="outline"
                              style={{ borderColor: cor, color: cor }}
                              title={ate ? `Quota paga até ${new Date(ate).toLocaleDateString('pt-PT')}` : 'Sem quota registada'}
                            >
                              {texto}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate max-w-xs">
                          {payment.description || '-'}
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editarPagamento(payment)}
                            title={t[language].edit}
                            data-testid={`edit-payment-${payment.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          {isAdmin() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => apagarPagamento(payment)}
                              className="text-red-600 hover:text-red-700"
                              title={t[language].delete}
                              data-testid={`delete-payment-${payment.id}`}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">{t[language].noPayments}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vendas de merchandise */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingBag className="mr-2" size={20} />
            {t[language].recentSales} ({sales.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length > 0 ? (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: 'var(--background-elevated)', color: 'var(--text-primary)' }}
                  data-testid={`sale-${sale.id}`}
                >
                  <div>
                    <p className="font-medium">
                      {sale.quantity}x {sale.item_name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(sale.sale_date).toLocaleDateString('pt-PT')}
                      {sale.member_name ? ` · ${sale.member_name}` : ''}
                      {sale.sold_by ? ` · vendido por ${sale.sold_by}` : ''}
                    </p>
                  </div>
                  {isAdmin() && (
                    <div className="text-right">
                      <p className="font-semibold">€{sale.total.toFixed(2)}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        €{sale.unit_price.toFixed(2)} cada
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-6 text-gray-500 dark:text-gray-400">{t[language].noSales}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
