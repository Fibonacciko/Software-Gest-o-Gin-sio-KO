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
  Plus, 
  Search, 
  Filter,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Edit,
  Eye,
  Users,
  Trash2,
  Clock,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Payments = ({ language, translations }) => {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [modalityFilter, setModalityFilter] = useState('all');
  const [expenseCategory, setExpenseCategory] = useState('fixed');
  const [filteredMembers, setFilteredMembers] = useState([]);

  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    payment_method: 'cash',
    description: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  const [expenseFormData, setExpenseFormData] = useState({
    category: 'rent',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // New states for expense management
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showViewExpensesDialog, setShowViewExpensesDialog] = useState(false);
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('all');
  const [expenseDateFilter, setExpenseDateFilter] = useState('all');

  // New states for revenue management
  const [showAddRevenueDialog, setShowAddRevenueDialog] = useState(false);
  const [showViewRevenuesDialog, setShowViewRevenuesDialog] = useState(false);
  const [revenues, setRevenues] = useState([]);
  const [revenueSearchTerm, setRevenueSearchTerm] = useState('');
  const [revenueTypeFilter, setRevenueTypeFilter] = useState('all');
  const [revenueDateFilter, setRevenueDateFilter] = useState('all');
  const [revenueFormData, setRevenueFormData] = useState({
    category: 'personalTraining',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // New states for membership payments
  const [showMembershipDialog, setShowMembershipDialog] = useState(false);
  const [membershipSearchTerm, setMembershipSearchTerm] = useState('');
  const [selectedMemberForPayment, setSelectedMemberForPayment] = useState(null);
  const [membershipFormData, setMembershipFormData] = useState({
    amount: '',
    description: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  // Section and filter management
  const [activeTab, setActiveTab] = useState('receitas');
  const [showViewPaymentsDialog, setShowViewPaymentsDialog] = useState(false);
  const [periodFilter, setPeriodFilter] = useState('all');

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const t = {
    pt: {
      finances: 'Finanças',
      registerPayments: 'Receitas',
      registerExpenses: 'Despesas',
      searchMembers: 'Procurar por nome ou número de sócio',
      fixedExpenses: 'Despesa Fixa',
      variableExpenses: 'Despesa Variável',
      monthlyRevenue: 'Receita do Mês',
      monthlyExpenses: 'Despesas do Mês',
      netRevenue: 'Receita Líquida',
      addPayment: 'Registar Pagamento',
      addExpense: 'Registar Despesa',
      searchPayments: 'Procurar pagamentos...',
      status: 'Status',
      paid: 'Pago',
      pending: 'Pendente',
      modalities: 'Modalidades',
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
      status: 'Status',
      save: 'Guardar',
      cancel: 'Cancelar',
      view: 'Ver',
      edit: 'Editar',
      recentPayments: 'Pagamentos Recentes',
      noPayments: 'Nenhum pagamento encontrado',
      paymentAdded: 'Pagamento registado com sucesso!',
      expenseAdded: 'Despesa registada com sucesso!',
      export: 'Exportar',
      paymentDetails: 'Detalhes do Pagamento',
      membershipPayment: 'Pagamento de Membership',
      selectMember: 'Selecionar membro...',
      enterAmount: 'Inserir valor...',
      paymentDescription: 'Descrição do pagamento...',
      expenseDescription: 'Descrição da despesa...',
      selectCategory: 'Selecionar categoria...',
      addExpenseBtn: 'Adicionar',
      viewExpensesBtn: 'Consultar',
      expenses: 'Despesas',
      viewExpenses: 'Consultar Despesas',
      rent: 'Renda',
      energy: 'Energia',
      maintenance: 'Manutenção',
      teachers: 'Professores',
      equipment: 'Equipamentos',
      articles: 'Artigos',
      extras: 'Extras',
      expenseType: 'Tipo',
      expenseDate: 'Data',
      expenseValue: 'Valor',
      noExpenses: 'Nenhuma despesa encontrada',
      deleteExpense: 'Eliminar despesa',
      paymentDate: 'Data do Pagamento',
      addRevenueBtn: 'Adicionar',
      viewRevenuesBtn: 'Consultar',
      revenues: 'Receitas',
      viewRevenues: 'Consultar Receitas',
      plans: 'Planos',
      personalTraining: 'PT\'s',
      subsidies: 'Subsídios',
      revenueExtras: 'Extras',
      revenueType: 'Tipo',
      revenueDate: 'Data',
      revenueValue: 'Valor',
      noRevenues: 'Nenhuma receita encontrada',
      deleteRevenue: 'Eliminar receita',
      addRevenue: 'Registar Receita',
      revenueDescription: 'Descrição da receita...',
      memberships: 'Mensalidades',
      registerMembership: 'Registar',
      membershipPayments: 'Pagamentos de Mensalidades',
      searchMemberPlaceholder: 'Pesquisar por Nº Sócio ou Nome...',
      memberNumber: 'Nº Sócio',
      memberName: 'Nome do Membro',
      membershipAmount: 'Valor da Mensalidade',
      membershipDate: 'Data do Pagamento',
      membershipDescription: 'Descrição da mensalidade...',
      membershipAdded: 'Mensalidade registada com sucesso!',
      updateMemberStatus: 'Status do membro atualizado',
      selectMemberForPayment: 'Selecionar membro para pagamento'
    },
    en: {
      finances: 'Finance',
      registerPayments: 'Revenues',
      registerExpenses: 'Expenses',
      searchMembers: 'Search by name or member number',
      salaries: 'Salaries',
      fixedExpenses: 'Fixed Expenses',
      extraExpenses: 'Extra Expenses',
      monthlyRevenue: 'Monthly Revenue',
      monthlyExpenses: 'Monthly Expenses',
      netRevenue: 'Net Revenue',
      addPayment: 'Add Payment',
      addExpense: 'Add Expense',
      searchPayments: 'Search payments...',
      status: 'Status',
      paid: 'Paid',
      pending: 'Pending',
      modalities: 'Modalities',
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
      status: 'Status',
      save: 'Save',
      cancel: 'Cancel',
      view: 'View',
      edit: 'Edit',
      recentPayments: 'Recent Payments',
      noPayments: 'No payments found',
      paymentAdded: 'Payment added successfully!',
      expenseAdded: 'Expense added successfully!',
      export: 'Export',
      paymentDetails: 'Payment Details',
      membershipPayment: 'Membership Payment',
      selectMember: 'Select member...',
      enterAmount: 'Enter amount...',
      paymentDescription: 'Payment description...',
      expenseDescription: 'Expense description...',
      selectCategory: 'Select category...',
      paymentDate: 'Payment Date',
      addExpenseBtn: 'Add',
      viewExpensesBtn: 'View',
      expenses: 'Expenses',
      viewExpenses: 'View Expenses',
      rent: 'Rent',
      energy: 'Energy', 
      maintenance: 'Maintenance',
      teachers: 'Teachers',
      equipment: 'Equipment',
      articles: 'Articles',
      extras: 'Extras',
      expenseType: 'Type',
      expenseDate: 'Date',
      expenseValue: 'Value',
      noExpenses: 'No expenses found',
      deleteExpense: 'Delete expense',
      addRevenueBtn: 'Add',
      viewRevenuesBtn: 'View',
      revenues: 'Revenues',
      viewRevenues: 'View Revenues',
      plans: 'Plans',
      personalTraining: 'Personal Training',
      subsidies: 'Subsidies',
      revenueExtras: 'Extras',
      revenueType: 'Type',
      revenueDate: 'Date',
      revenueValue: 'Value',
      noRevenues: 'No revenues found',
      deleteRevenue: 'Delete revenue',
      addRevenue: 'Add Revenue',
      revenueDescription: 'Revenue description...',
      memberships: 'Memberships',
      registerMembership: 'Register',
      membershipPayments: 'Membership Payments',
      searchMemberPlaceholder: 'Search by Member Number or Name...',
      memberNumber: 'Member Number',
      memberName: 'Member Name',
      membershipAmount: 'Membership Amount',
      membershipDate: 'Payment Date',
      membershipDescription: 'Membership description...',
      membershipAdded: 'Membership registered successfully!',
      updateMemberStatus: 'Member status updated',
      selectMemberForPayment: 'Select member for payment'
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchPayments();
    fetchExpenses(); // Staff can now access expenses too
    fetchRevenues(); // Fetch revenues too
    fetchActivities();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, dateFilter, modalityFilter, searchTerm]);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
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
      
      // Filter by modality if selected
      let filteredPayments = paymentsWithMembers;
      if (modalityFilter !== 'all') {
        // Get attendance records for the modality
        const attendanceResponse = await axios.get(`${API}/attendance?activity_id=${modalityFilter}`);
        const memberIdsInModality = [...new Set(attendanceResponse.data.map(att => att.member_id))];
        filteredPayments = paymentsWithMembers.filter(payment => 
          memberIdsInModality.includes(payment.member_id)
        );
      }
      
      // Filter by search term if provided
      if (searchTerm) {
        filteredPayments = filteredPayments.filter(payment => 
          payment.member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      // Sort by date (most recent first) - handle missing dates
      filteredPayments.sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date) : new Date(0);
        const dateB = b.payment_date ? new Date(b.payment_date) : new Date(0);
        return dateB - dateA;
      });
      
      setPayments(filteredPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Erro ao carregar pagamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('=== PAYMENT SUBMISSION DEBUG ===');
    console.log('Form data:', formData);
    console.log('API URL:', `${API}/payments`);
    
    try {
      const response = await axios.post(`${API}/payments`, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      console.log('Payment success response:', response);
      toast.success(t[language].paymentAdded);
      setShowAddDialog(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('=== PAYMENT ERROR ===');
      console.error('Error object:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error status:', error.response?.status);
      toast.error(`Erro ao registar pagamento: ${error.response?.data?.detail || error.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '',
      payment_method: 'cash',
      description: '',
      payment_date: new Date().toISOString().split('T')[0]
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStats = () => {
    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyRevenue = payments
      .filter(p => p.status === 'paid' && new Date(p.payment_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.amount, 0);
    
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    
    return { totalRevenue, monthlyRevenue, pendingCount };
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

  // Function to handle member search
  const handleMemberSearch = (searchValue) => {
    setMemberSearchTerm(searchValue);
    if (searchValue.trim() === '') {
      setFilteredMembers([]);
      return;
    }
    
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      member.member_number.toString().includes(searchValue)
    );
    setFilteredMembers(filtered);
  };

  // Function to delete payment
  const handleDeletePayment = async (paymentId) => {
    if (window.confirm('Tem certeza que deseja eliminar este pagamento?')) {
      try {
        await axios.delete(`${API}/payments/${paymentId}`);
        toast.success('Pagamento eliminado com sucesso');
        fetchPayments();
      } catch (error) {
        console.error('Error deleting payment:', error);
        toast.error('Erro ao eliminar pagamento');
      }
    }
  };

  // Function to handle expense submission
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/expenses`, expenseFormData);
      
      toast.success(t[language].expenseAdded);
      setShowAddExpenseDialog(false);
      setExpenseFormData({
        category: 'rent',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      if (isAdmin()) {
        fetchExpenses();
      }
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Erro ao registar despesa');
    }
  };

  // Function to fetch expenses (now accessible to staff too)
  const fetchExpenses = async () => {
    try {
      const response = await axios.get(`${API}/expenses`);
      setExpenses(response.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  // Function to delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Tem certeza que deseja eliminar esta despesa?')) {
      try {
        await axios.delete(`${API}/expenses/${expenseId}`);
        toast.success('Despesa eliminada com sucesso');
        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        toast.error('Erro ao eliminar despesa');
      }
    }
  };

  // Revenue management functions
  const fetchRevenues = async () => {
    try {
      const response = await axios.get(`${API}/revenues`);
      setRevenues(response.data);
    } catch (error) {
      console.error('Error fetching revenues:', error);
    }
  };

  const handleRevenueSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/revenues`, revenueFormData);
      
      toast.success('Receita registada com sucesso!');
      setShowAddRevenueDialog(false);
      setRevenueFormData({
        category: 'personalTraining',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      
      fetchRevenues();
    } catch (error) {
      console.error('Error adding revenue:', error);
      toast.error('Erro ao registar receita');
    }
  };

  const handleDeleteRevenue = async (revenueId) => {
    if (window.confirm('Tem certeza que deseja eliminar esta receita?')) {
      try {
        await axios.delete(`${API}/revenues/${revenueId}`);
        toast.success('Receita eliminada com sucesso');
        fetchRevenues();
      } catch (error) {
        console.error('Error deleting revenue:', error);
        toast.error('Erro ao eliminar receita');
      }
    }
  };

  // Membership payment functions
  const handleMembershipSearch = (searchTerm) => {
    setMembershipSearchTerm(searchTerm);
  };

  const filteredMembersForPayment = members.filter((member) => {
    if (!membershipSearchTerm) return false;
    const searchLower = membershipSearchTerm.toLowerCase();
    return (
      member.name.toLowerCase().includes(searchLower) ||
      member.member_number.toString().includes(searchLower)
    );
  });

  const handleMembershipSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMemberForPayment) {
      toast.error('Por favor, selecione um membro');
      return;
    }

    try {
      // Create payment record
      const paymentData = {
        member_id: selectedMemberForPayment.id,
        amount: parseFloat(membershipFormData.amount),
        payment_method: 'membership', // Special category for memberships
        description: membershipFormData.description || `Mensalidade ${selectedMemberForPayment.name}`,
        payment_date: membershipFormData.payment_date,
        status: 'paid'
      };

      await axios.post(`${API}/payments`, paymentData);

      // Update member status to 'active' after payment
      const updateData = {
        ...selectedMemberForPayment,
        status: 'active',
        last_payment_date: membershipFormData.payment_date
      };
      
      await axios.put(`${API}/members/${selectedMemberForPayment.id}`, updateData);

      toast.success(t[language].membershipAdded);
      toast.success(t[language].updateMemberStatus);
      
      // Reset form
      setShowMembershipDialog(false);
      setSelectedMemberForPayment(null);
      setMembershipSearchTerm('');
      setMembershipFormData({
        amount: '',
        description: '',
        payment_date: new Date().toISOString().split('T')[0]
      });

      // Refresh data
      fetchPayments();
      fetchMembers();
      
    } catch (error) {
      console.error('Error processing membership payment:', error);
      toast.error('Erro ao registar mensalidade');
    }
  };

  // Function to reset all financial data (Admin only)
  const handleResetFinancialData = async () => {
    const confirmMessage = 'ATENÇÃO: Esta ação vai APAGAR PERMANENTEMENTE todos os dados financeiros (pagamentos, despesas, vendas). Esta operação NÃO pode ser desfeita. Tem certeza que deseja continuar?';
    
    if (window.confirm(confirmMessage)) {
      const doubleConfirm = 'Por favor, confirme novamente: Vai apagar TODOS os dados financeiros. Escreva "APAGAR" para confirmar:';
      const userInput = prompt(doubleConfirm);
      
      if (userInput === 'APAGAR') {
        try {
          const response = await axios.post(`${API}/admin/reset-financials`);
          toast.success(`Dados financeiros resetados com sucesso! Eliminados: ${response.data.deleted.payments} pagamentos, ${response.data.deleted.expenses} despesas, ${response.data.deleted.revenues} receitas, ${response.data.deleted.sales} vendas`);
          
          // Refresh all data
          fetchPayments();
          fetchRevenues();
          fetchMembers(); // Refresh members data after reset
          if (isAdmin()) {
            fetchExpenses();
          }
        } catch (error) {
          console.error('Error resetting financial data:', error);
          toast.error(`Erro ao resetar dados financeiros: ${error.response?.data?.detail || error.message}`);
        }
      } else {
        toast.info('Reset cancelado');
      }
    }
  };

  const stats = getPaymentStats();
  
  // Enhanced stats calculation
  const getEnhancedStats = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Monthly revenue
    const monthlyRevenue = payments
      .filter(payment => new Date(payment.payment_date) >= startOfMonth && payment.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    // Monthly expenses (only for admin)
    let monthlyExpenses = 0;
    if (isAdmin()) {
      monthlyExpenses = expenses
        .filter(expense => new Date(expense.expense_date) >= startOfMonth)
        .reduce((sum, expense) => sum + expense.amount, 0);
    }
    
    const netRevenue = monthlyRevenue - monthlyExpenses;
    
    return {
      monthlyRevenue,
      monthlyExpenses,
      netRevenue
    };
  };

  const enhancedStats = getEnhancedStats();

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].finances}
        </h1>
      </div>

      {/* 3 Section Windows - Horizontal Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Receitas Window */}
        <Card className="bg-neutral-800/80 dark:bg-neutral-900/80 text-white border-orange-200/30">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-white mb-4 text-center">
              {t[language].registerPayments}
            </h2>
            <div className="flex flex-col gap-3">
              <Dialog open={showAddRevenueDialog} onOpenChange={setShowAddRevenueDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Plus className="mr-2" size={16} />
                      {t[language].addRevenueBtn}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t[language].addRevenue}</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleRevenueSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="revenue_category">{t[language].selectCategory} *</Label>
                        <Select 
                          value={revenueFormData.category} 
                          onValueChange={(value) => setRevenueFormData({...revenueFormData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personalTraining">{t[language].personalTraining}</SelectItem>
                            <SelectItem value="subsidies">{t[language].subsidies}</SelectItem>
                            <SelectItem value="revenueExtras">{t[language].revenueExtras}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="revenue_amount">{t[language].amount} (€) *</Label>
                        <Input
                          id="revenue_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={revenueFormData.amount}
                          onChange={(e) => setRevenueFormData({...revenueFormData, amount: e.target.value})}
                          required
                          placeholder={t[language].enterAmount}
                        />
                      </div>

                      <div>
                        <Label htmlFor="revenue_date">{t[language].revenueDate} *</Label>
                        <Input
                          id="revenue_date"
                          type="date"
                          value={revenueFormData.date}
                          onChange={(e) => setRevenueFormData({...revenueFormData, date: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="revenue_description">{t[language].description}</Label>
                        <Textarea
                          id="revenue_description"
                          value={revenueFormData.description}
                          onChange={(e) => setRevenueFormData({...revenueFormData, description: e.target.value})}
                          rows={3}
                          placeholder={t[language].revenueDescription}
                        />
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setShowAddRevenueDialog(false)}
                        >
                          {t[language].cancel}
                        </Button>
                        <Button type="submit">
                          {t[language].save}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={showViewRevenuesDialog} onOpenChange={setShowViewRevenuesDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Eye className="mr-2" size={16} />
                      {t[language].viewRevenuesBtn}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{t[language].viewRevenues}</DialogTitle>
                    </DialogHeader>
                    
                    {/* Revenue Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Pesquisar por descrição..."
                          value={revenueSearchTerm}
                          onChange={(e) => setRevenueSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <Select value={revenueTypeFilter} onValueChange={setRevenueTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t[language].revenueType} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="personalTraining">{t[language].personalTraining}</SelectItem>
                          <SelectItem value="subsidies">{t[language].subsidies}</SelectItem>
                          <SelectItem value="revenueExtras">{t[language].revenueExtras}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={revenueDateFilter} onValueChange={setRevenueDateFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t[language].revenueDate} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t[language].allDates}</SelectItem>
                          <SelectItem value="thisMonth">{t[language].thisMonth}</SelectItem>
                          <SelectItem value="lastMonth">{t[language].lastMonth}</SelectItem>
                          <SelectItem value="thisYear">{t[language].thisYear}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Revenues Table */}
                    {revenues && revenues.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].revenueDate}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].revenueType}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].revenueValue}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].description}</th>
                              <th className="text-left p-4 font-medium text-gray-600">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {revenues
                              .filter(revenue => {
                                // Apply filters
                                if (revenueSearchTerm && !revenue.description?.toLowerCase().includes(revenueSearchTerm.toLowerCase())) {
                                  return false;
                                }
                                if (revenueTypeFilter !== 'all' && revenue.category !== revenueTypeFilter) {
                                  return false;
                                }
                                
                                // Date filter
                                if (revenueDateFilter !== 'all') {
                                  const revenueDate = new Date(revenue.revenue_date || revenue.date);
                                  const now = new Date();
                                  
                                  if (revenueDateFilter === 'thisMonth') {
                                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                    if (revenueDate < startOfMonth) return false;
                                  } else if (revenueDateFilter === 'lastMonth') {
                                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                    if (revenueDate < startOfLastMonth || revenueDate > endOfLastMonth) return false;
                                  } else if (revenueDateFilter === 'thisYear') {
                                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                                    if (revenueDate < startOfYear) return false;
                                  }
                                }
                                
                                return true;
                              })
                              .map((revenue) => (
                                <tr key={revenue.id} className="border-b hover:bg-gray-50">
                                  <td className="p-4">
                                    {new Date(revenue.revenue_date || revenue.date).toLocaleDateString('pt-PT')}
                                  </td>
                                  <td className="p-4">
                                    <Badge className="bg-green-100 text-green-800">
                                      {t[language][revenue.category] || revenue.category}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-semibold">€{revenue.amount.toFixed(2)}</span>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-sm text-gray-600 truncate max-w-xs">
                                      {revenue.description || '-'}
                                    </p>
                                  </td>
                                  <td className="p-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteRevenue(revenue.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">{t[language].noRevenues}</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Dialog open={showViewRevenuesDialog} onOpenChange={setShowViewRevenuesDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      <Plus className="mr-2" size={16} />
                      {t[language].addExpenseBtn}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t[language].addExpense}</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="category">{t[language].selectCategory} *</Label>
                        <Select 
                          value={expenseFormData.category} 
                          onValueChange={(value) => setExpenseFormData({...expenseFormData, category: value})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rent">{t[language].rent}</SelectItem>
                            <SelectItem value="energy">{t[language].energy}</SelectItem>
                            <SelectItem value="maintenance">{t[language].maintenance}</SelectItem>
                            <SelectItem value="teachers">{t[language].teachers}</SelectItem>
                            <SelectItem value="equipment">{t[language].equipment}</SelectItem>
                            <SelectItem value="articles">{t[language].articles}</SelectItem>
                            <SelectItem value="extras">{t[language].extras}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="expense_amount">{t[language].amount} (€) *</Label>
                        <Input
                          id="expense_amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={expenseFormData.amount}
                          onChange={(e) => setExpenseFormData({...expenseFormData, amount: e.target.value})}
                          required
                          placeholder={t[language].enterAmount}
                        />
                      </div>

                      <div>
                        <Label htmlFor="expense_date">{t[language].expenseDate} *</Label>
                        <Input
                          id="expense_date"
                          type="date"
                          value={expenseFormData.date}
                          onChange={(e) => setExpenseFormData({...expenseFormData, date: e.target.value})}
                          required
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="expense_description">{t[language].description}</Label>
                        <Textarea
                          id="expense_description"
                          value={expenseFormData.description}
                          onChange={(e) => setExpenseFormData({...expenseFormData, description: e.target.value})}
                          rows={3}
                          placeholder={t[language].expenseDescription}
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
                        <Button type="submit">
                          {t[language].save}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={showViewExpensesDialog} onOpenChange={setShowViewExpensesDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <Eye className="mr-2" size={16} />
                      {t[language].viewExpensesBtn}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>{t[language].viewExpenses}</DialogTitle>
                    </DialogHeader>
                    
                    {/* Expense Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Pesquisar por descrição..."
                          value={expenseSearchTerm}
                          onChange={(e) => setExpenseSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      <Select value={expenseTypeFilter} onValueChange={setExpenseTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t[language].expenseType} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="rent">{t[language].rent}</SelectItem>
                          <SelectItem value="energy">{t[language].energy}</SelectItem>
                          <SelectItem value="maintenance">{t[language].maintenance}</SelectItem>
                          <SelectItem value="teachers">{t[language].teachers}</SelectItem>
                          <SelectItem value="equipment">{t[language].equipment}</SelectItem>
                          <SelectItem value="articles">{t[language].articles}</SelectItem>
                          <SelectItem value="extras">{t[language].extras}</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Select value={expenseDateFilter} onValueChange={setExpenseDateFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder={t[language].expenseDate} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t[language].allDates}</SelectItem>
                          <SelectItem value="thisMonth">{t[language].thisMonth}</SelectItem>
                          <SelectItem value="lastMonth">{t[language].lastMonth}</SelectItem>
                          <SelectItem value="thisYear">{t[language].thisYear}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Expenses Table */}
                    {expenses && expenses.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].expenseDate}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].expenseType}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].expenseValue}</th>
                              <th className="text-left p-4 font-medium text-gray-600">{t[language].description}</th>
                              <th className="text-left p-4 font-medium text-gray-600">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses
                              .filter(expense => {
                                // Apply filters
                                if (expenseSearchTerm && !expense.description?.toLowerCase().includes(expenseSearchTerm.toLowerCase())) {
                                  return false;
                                }
                                if (expenseTypeFilter !== 'all' && expense.category !== expenseTypeFilter) {
                                  return false;
                                }
                                
                                // Date filter
                                if (expenseDateFilter !== 'all') {
                                  const expenseDate = new Date(expense.expense_date || expense.date);
                                  const now = new Date();
                                  
                                  if (expenseDateFilter === 'thisMonth') {
                                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                                    if (expenseDate < startOfMonth) return false;
                                  } else if (expenseDateFilter === 'lastMonth') {
                                    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
                                    if (expenseDate < startOfLastMonth || expenseDate > endOfLastMonth) return false;
                                  } else if (expenseDateFilter === 'thisYear') {
                                    const startOfYear = new Date(now.getFullYear(), 0, 1);
                                    if (expenseDate < startOfYear) return false;
                                  }
                                }
                                
                                return true;
                              })
                              .map((expense) => (
                                <tr key={expense.id} className="border-b hover:bg-gray-50">
                                  <td className="p-4">
                                    {new Date(expense.expense_date || expense.date).toLocaleDateString('pt-PT')}
                                  </td>
                                  <td className="p-4">
                                    <Badge className="bg-blue-100 text-blue-800">
                                      {t[language][expense.category] || expense.category}
                                    </Badge>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-semibold">€{expense.amount.toFixed(2)}</span>
                                  </td>
                                  <td className="p-4">
                                    <p className="text-sm text-gray-600 truncate max-w-xs">
                                      {expense.description || '-'}
                                    </p>
                                  </td>
                                  <td className="p-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteExpense(expense.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600">{t[language].noExpenses}</p>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Financial Statistics - Only for Admin */}
        {isAdmin() && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="card-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {t[language].monthlyRevenue}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      €{enhancedStats.monthlyRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500">
                    <DollarSign size={24} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {t[language].monthlyExpenses}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      €{enhancedStats.monthlyExpenses.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {t[language].netRevenue}
                    </p>
                    <p className={`text-2xl font-bold ${enhancedStats.netRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{enhancedStats.netRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${enhancedStats.netRevenue >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                <SelectValue placeholder={t[language].status} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].status}</SelectItem>
                <SelectItem value="paid">{t[language].paid}</SelectItem>
                <SelectItem value="pending">{t[language].pending}</SelectItem>
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
            
            <Select value={modalityFilter} onValueChange={setModalityFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].modalities} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].modalities}</SelectItem>
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions - Only for Admin */}
      {isAdmin() && (
        <Card className="card-shadow border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 mb-1">Administração</h3>
                <p className="text-sm text-gray-600">Ações administrativas - Usar com cuidado</p>
              </div>
              <Button
                onClick={handleResetFinancialData}
                variant="destructive"
                size="sm"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2" size={16} />
                Resetar Dados Financeiros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CreditCard className="mr-2" />
            {t[language].recentPayments} ({payments.length})
          </CardTitle>
          <Button 
            variant="outline" 
            onClick={exportPayments}
            className="btn-hover"
            data-testid="export-payments-btn"
          >
            <Download className="mr-2" size={16} />
            {t[language].export}
          </Button>
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
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].member}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].amount}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].paymentMethod}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].paymentDate}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].status}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      {t[language].description}
                    </th>
                    <th className="text-left p-4 font-medium text-gray-600">
                      Ações
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
                            <p className="font-medium">{payment.member?.name || 'Membro eliminado'}</p>
                            <p className="text-sm text-gray-500">{payment.member?.membership_type || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <DollarSign size={16} className="text-gray-400 mr-1" />
                          <span className="font-semibold">€{payment.amount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getPaymentMethodColor(payment.payment_method)}>
                          {t[language][payment.payment_method]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Calendar size={16} className="text-gray-400 mr-2" />
                          {new Date(payment.payment_date).toLocaleDateString('pt-PT')}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(payment.status)}>
                          {t[language][payment.status]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {payment.description || '-'}
                        </p>
                      </td>
                      <td className="p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePayment(payment.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t[language].noPayments}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
