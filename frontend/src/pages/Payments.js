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
  Users
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
    description: ''
  });

  const [expenseFormData, setExpenseFormData] = useState({
    category: 'fixed',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const t = {
    pt: {
      finances: 'Finanças',
      registerPayments: 'Registar os Pagamentos',
      registerExpenses: 'Registar Despesas',
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
      selectCategory: 'Selecionar categoria...'
    },
    en: {
      finances: 'Finance',
      registerPayments: 'Register Payments',
      registerExpenses: 'Register Expenses',
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
      paymentDescription: 'Payment description...'
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchPayments();
    fetchExpenses(); // Staff can now access expenses too
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
      
      // Sort by date (most recent first)
      filteredPayments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
      
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
    try {
      await axios.post(`${API}/payments`, {
        ...formData,
        amount: parseFloat(formData.amount)
      });
      
      toast.success(t[language].paymentAdded);
      setShowAddDialog(false);
      resetForm();
      fetchPayments();
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error('Erro ao registar pagamento');
    }
  };

  const resetForm = () => {
    setFormData({
      member_id: '',
      amount: '',
      payment_method: 'cash',
      description: ''
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

  // Function to handle expense submission
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/expenses`, {
        ...expenseFormData,
        created_by: user.id
      });
      
      toast.success(t[language].expenseAdded);
      setShowExpenseDialog(false);
      setExpenseFormData({
        category: 'fixed',
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

      {/* Main Action Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Register Payments Bar */}
        <Card className="bg-neutral-800/80 dark:bg-neutral-900/80 text-white border-orange-200/30">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold mb-4 text-white">
              {t[language].registerPayments}
            </h2>
            
            {/* Member Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t[language].searchMembers}
                value={memberSearchTerm}
                onChange={(e) => handleMemberSearch(e.target.value)}
                className="pl-10 bg-white text-black"
              />
            </div>
            
            {/* Member Results */}
            {filteredMembers.length > 0 && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {filteredMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-neutral-700 p-3 rounded-lg flex justify-between items-center"
                  >
                    <div className="text-white">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-300">#{member.member_number}</p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => setFormData({...formData, member_id: member.id})}
                        >
                          <CreditCard className="mr-2" size={14} />
                          {t[language].addPayment}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{t[language].addPayment} - {member.name}</DialogTitle>
                        </DialogHeader>
                        
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div>
                            <Label htmlFor="amount">{t[language].amount} *</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              value={formData.amount}
                              onChange={(e) => setFormData({...formData, amount: e.target.value})}
                              required
                              placeholder={t[language].enterAmount}
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor="payment_method">{t[language].paymentMethod} *</Label>
                            <Select 
                              value={formData.payment_method} 
                              onValueChange={(value) => setFormData({...formData, payment_method: value})}
                            >
                              <SelectTrigger>
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
                            />
                          </div>
                          
                          <div className="flex justify-end gap-3 pt-4">
                            <Button type="button" variant="outline">
                              {t[language].cancel}
                            </Button>
                            <Button type="submit">
                              {t[language].save}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Register Expenses Bar */}
        <Card className="bg-neutral-800/80 dark:bg-neutral-900/80 text-white border-orange-200/30">
          <CardContent className="p-4">
            <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
              <DialogTrigger asChild>
                <h2 className="text-lg font-bold text-white cursor-pointer hover:text-gray-300 transition-colors">
                  {t[language].registerExpenses}
                </h2>
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
                        <SelectItem value="fixed">{t[language].fixedExpenses}</SelectItem>
                        <SelectItem value="variable">{t[language].variableExpenses}</SelectItem>
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
                      onClick={() => setShowExpenseDialog(false)}
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
          </CardContent>
        </Card>
      </div>

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
