import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  BarChart, 
  Download, 
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Package,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = ({ language, translations }) => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('financial');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);

  const t = {
    pt: {
      reports: 'Relatórios',
      generateReport: 'Gerar Relatório',
      reportType: 'Tipo de Relatório',
      financialReport: 'Relatório Financeiro',
      memberReport: 'Relatório de Modalidades',
      stockReport: 'Relatório de Stock',
      dateRange: 'Período',
      thisMonth: 'Este Mês',
      lastQuarter: 'Últimos Trimestre',
      lastSemester: 'Último Semestre', 
      thisYear: 'Este Ano',
      lastThreeYears: 'Últimos 3 Anos',
      custom: 'Personalizado',
      startDate: 'Data Início',
      endDate: 'Data Fim',
      export: 'Exportar',
      totalMembers: 'Total de Membros',
      activeMembers: 'Membros Ativos',
      totalRevenue: 'Receita Total',
      averageAttendance: 'Presença Média',
      attendanceStats: 'Estatísticas de Presença',
      paymentStats: 'Estatísticas de Pagamentos',
      memberStats: 'Estatísticas de Membros',
      inventoryStats: 'Estatísticas de Stock',
      totalAttendance: 'Total de Presenças',
      uniqueVisitors: 'Visitantes Únicos',
      dailyAverage: 'Média Diária',
      totalPayments: 'Total de Pagamentos',
      averagePayment: 'Pagamento Médio',
      pendingPayments: 'Pagamentos Pendentes',
      totalItems: 'Total de Items',
      totalValue: 'Valor Total',
      lowStockItems: 'Items com Stock Baixo',
      membersByType: 'Membros por Tipo',
      revenueByMonth: 'Receita por Mês',
      attendanceByDay: 'Presenças por Dia',
      topMembers: 'Membros Mais Ativos',
      noData: 'Nenhum dado disponível para o período selecionado',
      // Financial metrics - New structure
      revenuePayments: 'Receitas Pagamentos',
      revenueExtras: 'Receitas Extras',
      revenueArticles: 'Receitas Textil', 
      revenueEquipment: 'Receitas Equipamentos',
      expenseFixed: 'Despesas Fixas',
      expenseVariable: 'Despesas Variáveis',
      expenseArticles: 'Despesas Textil',
      expenseEquipment: 'Despesas Equipamentos',
      netTotal: 'Total Líquido',
      // Stock metrics
      articlesInStock: 'Artigos em Stock',
      investedValue: 'Despesa Total',
      receivedValue: 'Receita Total',
      netValue: 'Total Líquido',
      totalMembers: 'Membros Totais',
      membersByActivity: 'Membros por Modalidade',
      membersByPack: 'Membros por Pack',
      totalArticles: 'Total de Artigos',
      totalStockValue: 'Valor Total em Stock',
      totalSoldValue: 'Valor Total Vendido',
      totalPurchaseValue: 'Valor Total de Compra',
      basic: 'Básico',
      premium: 'Premium',
      vip: 'VIP',
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso'
    },
    en: {
      reports: 'Reports',
      generateReport: 'Generate Report',
      reportType: 'Report Type',
      financialReport: 'Financial Report',
      memberReport: 'Modalities Report',
      stockReport: 'Stock Report',
      dateRange: 'Date Range',
      thisMonth: 'This Month',
      lastQuarter: 'Last Quarter',
      lastSemester: 'Last Semester',
      thisYear: 'This Year', 
      lastThreeYears: 'Last 3 Years',
      custom: 'Custom',
      startDate: 'Start Date',
      endDate: 'End Date',
      export: 'Export',
      totalMembers: 'Total Members',
      activeMembers: 'Active Members',
      totalRevenue: 'Total Revenue',
      averageAttendance: 'Average Attendance',
      attendanceStats: 'Attendance Statistics',
      paymentStats: 'Payment Statistics',
      memberStats: 'Member Statistics',
      inventoryStats: 'Inventory Statistics',
      totalAttendance: 'Total Attendance',
      uniqueVisitors: 'Unique Visitors',
      dailyAverage: 'Daily Average',
      totalPayments: 'Total Payments',
      averagePayment: 'Average Payment',
      pendingPayments: 'Pending Payments',
      totalItems: 'Total Items',
      totalValue: 'Total Value',
      lowStockItems: 'Low Stock Items',
      membersByType: 'Members by Type',
      revenueByMonth: 'Revenue by Month',
      attendanceByDay: 'Attendance by Day',
      topMembers: 'Most Active Members',
      noData: 'No data available for the selected period',
      // Financial metrics - New structure  
      revenuePayments: 'Revenue Payments',
      revenueExtras: 'Revenue Extras',
      revenueArticles: 'Revenue Textil',
      revenueEquipment: 'Revenue Equipment', 
      expenseFixed: 'Fixed Expenses',
      expenseVariable: 'Variable Expenses',
      expenseArticles: 'Textil Expenses',
      expenseEquipment: 'Equipment Expenses',
      netTotal: 'Net Total',
      // Stock metrics
      articlesInStock: 'Articles in Stock',
      investedValue: 'Total Expense',
      receivedValue: 'Total Revenue', 
      netValue: 'Net Total',
      totalMembers: 'Total Members',
      membersByActivity: 'Members by Activity',
      membersByPack: 'Members by Pack',
      totalArticles: 'Total Articles',
      totalStockValue: 'Total Stock Value',
      totalSoldValue: 'Total Sold Value',
      totalPurchaseValue: 'Total Purchase Value',
      // Financial metrics - New structure  
      revenuePayments: 'Revenue Payments',
      revenueExtras: 'Revenue Extras',
      revenueArticles: 'Revenue Textil',
      revenueEquipment: 'Revenue Equipment', 
      expenseFixed: 'Fixed Expenses',
      expenseVariable: 'Variable Expenses',
      expenseArticles: 'Textil Expenses',
      expenseEquipment: 'Equipment Expenses',
      netTotal: 'Net Total',
      // Stock metrics
      articlesInStock: 'Articles in Stock',
      investedValue: 'Total Expense',
      receivedValue: 'Total Revenue', 
      netValue: 'Net Total',
      totalMembers: 'Total Members',
      membersByActivity: 'Members by Activity',
      membersByPack: 'Members by Pack',
      totalArticles: 'Total Articles',
      totalStockValue: 'Total Stock Value',
      totalSoldValue: 'Total Sold Value',
      totalPurchaseValue: 'Total Purchase Value',
      basic: 'Basic',
      premium: 'Premium',
      vip: 'VIP',
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended'
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      generateReport();
    }
  }, [reportType, dateRange, startDate, endDate, members, expenses, revenues]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data
      const [membersRes, paymentsRes, attendanceRes, expensesRes, revenuesRes] = await Promise.all([
        axios.get(`${API}/members`),
        axios.get(`${API}/payments`),
        axios.get(`${API}/attendance`),
        axios.get(`${API}/expenses`),
        axios.get(`${API}/revenues`)
      ]);
      
      setMembers(membersRes.data);
      setPayments(paymentsRes.data);
      setAttendance(attendanceRes.data);
      setExpenses(expensesRes.data);
      setRevenues(revenuesRes.data);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let start, end;
    
    switch (dateRange) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'lastQuarter':
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
        start = new Date(now.getFullYear(), quarterStartMonth, 1);
        end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
        break;
      case 'lastSemester':
        const semesterStartMonth = Math.floor(now.getMonth() / 6) * 6 - 6;
        start = new Date(now.getFullYear(), semesterStartMonth, 1);
        end = new Date(now.getFullYear(), semesterStartMonth + 6, 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'lastThreeYears':
        start = new Date(now.getFullYear() - 3, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(now.getFullYear(), 0, 1);
        end = endDate ? new Date(endDate) : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    return { start, end };
  };

  const generateReport = () => {
    const { start, end } = getDateRange();
    
    switch (reportType) {
      case 'financial':
        generateFinancialReport(start, end);
        break;
      case 'member':
        generateMemberReport();
        break;
      case 'stock':
        generateStockReport();
        break;
      default:
        generateFinancialReport(start, end);
    }
  };

  const generateAttendanceReport = (start, end) => {
    const filteredAttendance = attendance.filter(att => {
      const attDate = new Date(att.check_in_date);
      return attDate >= start && attDate <= end;
    });
    
    // Group by date for chart
    const attendanceByDay = filteredAttendance.reduce((acc, att) => {
      const date = att.check_in_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    // Group by activity/modality for chart
    const attendanceByActivity = filteredAttendance.reduce((acc, att) => {
      const activity = att.activity?.name || 'Sem modalidade';
      acc[activity] = (acc[activity] || 0) + 1;
      return acc;
    }, {});
    
    setReportData({
      type: 'attendance',
      stats: {},
      charts: { attendanceByDay, attendanceByActivity }
    });
  };

  const generateFinancialReport = async (start, end) => {
    try {
      // Filter data within date range
      const filteredPayments = payments.filter(payment => {
        const payDate = new Date(payment.payment_date);
        return payDate >= start && payDate <= end && payment.status === 'paid';
      });

      const filteredRevenues = revenues.filter(revenue => {
        const revDate = new Date(revenue.revenue_date || revenue.date);
        return revDate >= start && revDate <= end;
      });

      const filteredExpenses = expenses.filter(expense => {
        const expDate = new Date(expense.expense_date || expense.date);
        return expDate >= start && expDate <= end;
      });
      
      // Calculate REVENUES according to new structure
      const revenuePayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
      
      const revenueExtras = filteredRevenues
        .filter(r => r.category === 'revenueExtras')
        .reduce((sum, revenue) => sum + revenue.amount, 0);
      
      const revenueArticles = filteredRevenues
        .filter(r => r.category === 'textil' || r.category === 'articles')
        .reduce((sum, revenue) => sum + revenue.amount, 0);
        
      const revenueEquipment = filteredRevenues
        .filter(r => r.category === 'equipment')
        .reduce((sum, revenue) => sum + revenue.amount, 0);
      
      // Calculate EXPENSES according to new structure  
      // Despesa Fixa: Renda, Energia, Professores, Colaboradores
      const expenseFixed = filteredExpenses
        .filter(e => ['rent', 'energy', 'teachers', 'collaborators'].includes(e.category))
        .reduce((sum, expense) => sum + expense.amount, 0);
        
      // Despesa Variável: Textil, Equipamentos, Manutenção, Extras
      const expenseVariable = filteredExpenses
        .filter(e => ['textil', 'articles', 'equipment', 'maintenance', 'extras'].includes(e.category))
        .reduce((sum, expense) => sum + expense.amount, 0);
        
      // Despesa Textil (subset of variable for detailed view)
      const expenseArticles = filteredExpenses
        .filter(e => e.category === 'textil' || e.category === 'articles')
        .reduce((sum, expense) => sum + expense.amount, 0);
        
      // Despesa Equipamentos (subset of variable for detailed view)
      const expenseEquipment = filteredExpenses
        .filter(e => e.category === 'equipment')
        .reduce((sum, expense) => sum + expense.amount, 0);
      
      // Calculate totals
      const totalRevenues = revenuePayments + revenueExtras + revenueArticles + revenueEquipment;
      const totalExpenses = expenseFixed + expenseVariable + expenseArticles + expenseEquipment;
      const netTotal = totalRevenues - totalExpenses;
      
      setReportData({
        type: 'financial',
        stats: { 
          revenuePayments,
          revenueExtras,
          revenueArticles,
          revenueEquipment,
          expenseFixed,
          expenseVariable,
          expenseArticles,
          expenseEquipment,
          totalRevenues,
          totalExpenses,
          netTotal 
        },
        charts: { 
          revenues: {
            [`${t[language || 'pt'].revenuePayments}`]: revenuePayments,
            [`${t[language || 'pt'].revenueExtras}`]: revenueExtras,
            [`${t[language || 'pt'].revenueArticles}`]: revenueArticles,
            [`${t[language || 'pt'].revenueEquipment}`]: revenueEquipment
          },
          expenses: {
            [`${t[language || 'pt'].expenseFixed}`]: expenseFixed,
            [`${t[language || 'pt'].expenseVariable}`]: expenseVariable,
            [`${t[language || 'pt'].expenseArticles}`]: expenseArticles,
            [`${t[language || 'pt'].expenseEquipment}`]: expenseEquipment
          }
        }
      });
    } catch (error) {
      console.error('Error generating financial report:', error);
    }
  };

  const generatePaymentReport = (start, end) => {
    const filteredPayments = payments.filter(payment => {
      const payDate = new Date(payment.payment_date);
      return payDate >= start && payDate <= end;
    });
    
    const totalPayments = filteredPayments.length;
    const totalRevenue = filteredPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);
    const averagePayment = totalRevenue / (totalPayments || 1);
    const pendingPayments = filteredPayments.filter(p => p.status === 'pending').length;
    
    // Revenue by month
    const revenueByMonth = filteredPayments
      .filter(p => p.status === 'paid')
      .reduce((acc, payment) => {
        const month = new Date(payment.payment_date).toLocaleDateString('pt-PT', { month: 'short' });
        acc[month] = (acc[month] || 0) + payment.amount;
        return acc;
      }, {});
    
    setReportData({
      type: 'payment',
      stats: { totalPayments, totalRevenue, averagePayment, pendingPayments },
      charts: { revenueByMonth }
    });
  };

  const generateMemberReport = async () => {
    try {
      // Get all activities/modalities
      const activitiesRes = await axios.get(`${API}/activities`);
      const activities = activitiesRes.data;
      
      // Define specific modalities to show
      const specificModalities = ['Boxe', 'Kickboxing', 'Jiu-Jitsu', 'Musculação'];
      
      // Count active members per modality
      const activeMembersByModality = {};
      const activeMembers = members.filter(m => m.status === 'active');
      
      specificModalities.forEach(modalityName => {
        const activity = activities.find(a => a.name === modalityName);
        if (activity) {
          const count = activeMembers.filter(m => m.activity_id === activity.id).length;
          activeMembersByModality[modalityName] = count;
        } else {
          activeMembersByModality[modalityName] = 0;
        }
      });
      
      // Calculate revenue from membership payments per modality
      const revenueByModality = {};
      let totalRevenue = 0;
      
      // Get membership payments
      const paymentsRes = await axios.get(`${API}/payments`);
      const membershipPayments = paymentsRes.data.filter(p => p.payment_type === 'membership');
      
      // Initialize all specific modalities with 0
      specificModalities.forEach(modalityName => {
        revenueByModality[modalityName] = 0;
      });
      
      // For each payment, find the member and their modality
      for (const payment of membershipPayments) {
        const member = members.find(m => m.id === payment.member_id);
        if (member && member.activity_id) {
          // Find activity name
          const activity = activities.find(a => a.id === member.activity_id);
          const modalityName = activity ? activity.name : null;
          
          // Only count if it's one of the specific modalities
          if (modalityName && specificModalities.includes(modalityName)) {
            revenueByModality[modalityName] = (revenueByModality[modalityName] || 0) + payment.amount;
            totalRevenue += payment.amount;
          }
        }
      }
      
      // Add Receita Total
      revenueByModality['Receita Total'] = totalRevenue;
      
      const totalMembers = members.length;
      const totalActiveMembers = activeMembers.length;
      
      setReportData({
        type: 'member',
        stats: { 
          totalMembers, 
          activeMembers: totalActiveMembers,
          totalRevenue
        },
        charts: { 
          activeMembersByModality,
          revenueByModality
        }
      });
    } catch (error) {
      console.error('Error generating member report:', error);
    }
  };

  const generateStockReport = async () => {
    try {
      const response = await axios.get(`${API}/inventory`);
      const inventory = response.data;
      
      // Calculate the 4 specific stock metrics
      const articlesInStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const investedValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || item.price * 0.6)), 0);
      const receivedValue = inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * item.price), 0);
      const netValue = receivedValue - investedValue;
      
      setReportData({
        type: 'stock',
        stats: { articlesInStock, investedValue, receivedValue, netValue },
        charts: { 
          stockMetrics: {
            [`${t[language || 'pt'].articlesInStock}`]: articlesInStock * 25, // Convert to euro equivalent for chart
            [`${t[language || 'pt'].investedValue}`]: investedValue,
            [`${t[language || 'pt'].receivedValue}`]: receivedValue,
            [`${t[language || 'pt'].netValue}`]: netValue
          },
          valueBreakdown: {
            [`${t[language || 'pt'].investedValue}`]: investedValue,
            [`${t[language || 'pt'].receivedValue}`]: receivedValue,
            [`${t[language || 'pt'].netValue}`]: netValue > 0 ? netValue : 0,
            'Margem': receivedValue > 0 ? ((netValue / receivedValue) * 100) : 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  const exportReport = () => {
    if (!reportData) return;
    
    let csvContent = '';
    
    switch (reportData.type) {
      case 'attendance':
        csvContent = [
          ['Estatísticas de Presença'],
          ['Total de Presenças', reportData.stats.totalAttendance],
          ['Visitantes Únicos', reportData.stats.uniqueVisitors],
          ['Média Diária', reportData.stats.dailyAverage],
          [''],
          ['Membros Mais Ativos'],
          ['Membro', 'Presenças'],
          ...reportData.charts.topMembers.map(m => [m.member, m.count])
        ].map(row => row.join(',')).join('\n');
        break;
      case 'payment':
        csvContent = [
          ['Estatísticas de Pagamentos'],
          ['Total de Pagamentos', reportData.stats.totalPayments],
          ['Receita Total', reportData.stats.totalRevenue.toFixed(2)],
          ['Pagamento Médio', reportData.stats.averagePayment.toFixed(2)],
          ['Pagamentos Pendentes', reportData.stats.pendingPayments]
        ].map(row => row.join(',')).join('\n');
        break;
      case 'stock':
        csvContent = [
          ['Relatório de Stock'],
          ['Total de Artigos', reportData.stats.totalArticles],
          ['Valor Total em Stock', reportData.stats.totalStockValue.toFixed(2)],
          ['Valor Total Vendido', reportData.stats.totalSoldValue.toFixed(2)],
          ['Valor Total de Compra', reportData.stats.totalPurchaseValue.toFixed(2)],
          ['Receita Líquida', reportData.stats.netRevenue.toFixed(2)]
        ].map(row => row.join(',')).join('\n');
        break;
      default:
        csvContent = 'Relatório não suportado para exportação';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_${reportType}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card className="card-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].reports}
        </h1>
        
        {reportData && (
          <Button 
            onClick={exportReport}
            className="btn-hover"
            data-testid="export-report-btn"
          >
            <Download className="mr-2" size={16} />
            {t[language].export}
          </Button>
        )}
      </div>

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>{t[language].generateReport}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t[language].reportType}
              </label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financial">{t[language].financialReport}</SelectItem>
                  <SelectItem value="member">{t[language].memberReport}</SelectItem>
                  <SelectItem value="stock">{t[language].stockReport}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t[language].dateRange}
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger data-testid="date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">{t[language].thisMonth}</SelectItem>
                  <SelectItem value="lastQuarter">{t[language].lastQuarter}</SelectItem>
                  <SelectItem value="lastSemester">{t[language].lastSemester}</SelectItem>
                  <SelectItem value="thisYear">{t[language].thisYear}</SelectItem>
                  <SelectItem value="lastThreeYears">{t[language].lastThreeYears}</SelectItem>
                  <SelectItem value="custom">{t[language].custom}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].startDate}
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    data-testid="start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t[language].endDate}
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    data-testid="end-date"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {loading ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">A carregar dados...</p>
          </CardContent>
        </Card>
      ) : reportData ? (
        <div className="space-y-6">
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bar Chart - Receita, Despesa, Total Líquido */}
            {reportData.stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise Financeira Completa (€)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar
                    data={{
                      labels: ['Receita Total', 'Despesa Total', 'Total Líquido'],
                      datasets: [{
                        label: 'Valores (€)',
                        data: [
                          reportData.stats.totalRevenues || 0,
                          reportData.stats.totalExpenses || 0,
                          reportData.stats.netTotal || 0
                        ],
                        backgroundColor: [
                          'rgba(34, 197, 94, 0.8)',   // Green for revenues
                          'rgba(239, 68, 68, 0.8)',   // Red for expenses
                          reportData.stats.netTotal >= 0 
                            ? 'rgba(59, 130, 246, 0.8)'  // Blue for positive net
                            : 'rgba(249, 115, 22, 0.8)'  // Orange for negative net
                        ],
                        borderColor: [
                          'rgba(34, 197, 94, 1)',
                          'rgba(239, 68, 68, 1)',
                          reportData.stats.netTotal >= 0 
                            ? 'rgba(59, 130, 246, 1)'
                            : 'rgba(249, 115, 22, 1)'
                        ],
                        borderWidth: 2
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          display: false,
                        },
                        title: {
                          display: true,
                          text: 'Visão Geral Financeira'
                        },
                        datalabels: {
                          display: true,
                          color: '#000',
                          font: {
                            weight: 'bold',
                            size: 14
                          },
                          formatter: function(value) {
                            return '€' + value.toFixed(2);
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '€' + value.toFixed(2);
                            }
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Pie Chart - Análise Financeira Detalhada */}
            {reportData.stats && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição Financeira Completa</CardTitle>
                </CardHeader>
                <CardContent>
                  <Pie
                    data={{
                      labels: [
                        'Despesa Total',
                        'Despesa Extra', 
                        'Despesa Textil',
                        'Despesa Equipamentos',
                        'Receita Textil',
                        'Receita Equipamentos',
                        'Receita Mensalidades',
                        'Receita Extras',
                        'Total Líquido'
                      ],
                      datasets: [{
                        data: [
                          reportData.stats.totalExpenses || 0,
                          reportData.stats.expenseVariable || 0,
                          reportData.stats.expenseArticles || 0,
                          reportData.stats.expenseEquipment || 0,
                          reportData.stats.revenueArticles || 0,
                          reportData.stats.revenueEquipment || 0,
                          reportData.stats.revenuePayments || 0,
                          reportData.stats.revenueExtras || 0,
                          Math.abs(reportData.stats.netTotal || 0)
                        ],
                        backgroundColor: [
                          '#DC2626', // Red for total expenses
                          '#EF4444', // Light red for extra expenses
                          '#F87171', // Pink for article expenses
                          '#FCA5A5', // Light pink for equipment expenses
                          '#34D399', // Green for article revenue
                          '#6EE7B7', // Light green for equipment revenue
                          '#10B981', // Dark green for membership revenue
                          '#A7F3D0', // Very light green for extra revenue
                          reportData.stats.netTotal >= 0 ? '#3B82F6' : '#F97316' // Blue for positive, orange for negative net
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            boxWidth: 12,
                            font: {
                              size: 10
                            }
                          }
                        },
                        datalabels: {
                          display: true,
                          color: '#000',
                          font: {
                            weight: 'bold',
                            size: 10
                          },
                          formatter: function(value, context) {
                            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return value > 0 ? percentage + '%' : '';
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const label = context.label;
                              const value = context.parsed;
                              const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                              return `${label}: €${value.toFixed(2)} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
          
          {reportData.type === 'financial' && (
            <>
              {/* RECEITAS Section */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">RECEITAS</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard
                    title={t[language].revenuePayments}
                    value={`€${reportData.stats.revenuePayments.toFixed(2)}`}
                    icon={DollarSign}
                    color="bg-green-500"
                  />
                  <StatCard
                    title={t[language].revenueExtras}
                    value={`€${reportData.stats.revenueExtras.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-green-600"
                  />
                  <StatCard
                    title={t[language].revenueArticles}
                    value={`€${reportData.stats.revenueArticles.toFixed(2)}`}
                    icon={Package}
                    color="bg-green-700"
                  />
                  <StatCard
                    title={t[language].revenueEquipment}
                    value={`€${reportData.stats.revenueEquipment.toFixed(2)}`}
                    icon={Activity}
                    color="bg-green-800"
                  />
                </div>
              </div>

              {/* DESPESAS Section */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">DESPESAS</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard
                    title={t[language].expenseFixed}
                    value={`€${reportData.stats.expenseFixed.toFixed(2)}`}
                    icon={BarChart}
                    color="bg-red-500"
                  />
                  <StatCard
                    title={t[language].expenseVariable}
                    value={`€${reportData.stats.expenseVariable.toFixed(2)}`}
                    icon={Calendar}
                    color="bg-red-600"
                  />
                  <StatCard
                    title={t[language].expenseArticles}
                    value={`€${reportData.stats.expenseArticles.toFixed(2)}`}
                    icon={Package}
                    color="bg-red-700"
                  />
                  <StatCard
                    title={t[language].expenseEquipment}
                    value={`€${reportData.stats.expenseEquipment.toFixed(2)}`}
                    icon={Activity}
                    color="bg-red-800"
                  />
                </div>
              </div>

              {/* TOTAL LÍQUIDO Section */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">RESULTADO</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard
                    title="Receita Total"
                    value={`€${reportData.stats.totalRevenues.toFixed(2)}`}
                    icon={TrendingUp}
                    color="bg-green-600"
                  />
                  <StatCard
                    title="Despesa Total"
                    value={`€${reportData.stats.totalExpenses.toFixed(2)}`}
                    icon={BarChart}
                    color="bg-red-600"
                  />
                  <StatCard
                    title={t[language].netTotal}
                    value={`€${reportData.stats.netTotal.toFixed(2)}`}
                    icon={DollarSign}
                    color={reportData.stats.netTotal >= 0 ? "bg-green-800" : "bg-red-800"}
                  />
                </div>
              </div>
            </>
          )}
          
          {reportData.type === 'payment' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={t[language].totalPayments}
                value={reportData.stats.totalPayments}
                icon={DollarSign}
                color="bg-blue-500"
              />
              <StatCard
                title={t[language].totalRevenue}
                value={`€${reportData.stats.totalRevenue.toFixed(2)}`}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatCard
                title={t[language].averagePayment}
                value={`€${reportData.stats.averagePayment.toFixed(2)}`}
                icon={BarChart}
                color="bg-purple-500"
              />
              <StatCard
                title={t[language].pendingPayments}
                value={reportData.stats.pendingPayments}
                icon={Calendar}
                color="bg-orange-500"
              />
            </div>
          )}
          
          {reportData.type === 'member' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard
                  title={t[language].totalMembers}
                  value={reportData.stats.totalMembers}
                  icon={Users}
                  color="bg-blue-500"
                />
                <StatCard
                  title={t[language].activeMembers}
                  value={reportData.stats.activeMembers || 0}
                  icon={Activity}
                  color="bg-green-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Atletas Ativos por Modalidade */}
                <Card>
                  <CardHeader>
                    <CardTitle>Atletas Ativos por Modalidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.charts.activeMembersByModality && Object.keys(reportData.charts.activeMembersByModality).length > 0 ? (
                      <div className="h-80">
                        <Bar
                          data={{
                            labels: Object.keys(reportData.charts.activeMembersByModality),
                            datasets: [{
                              label: 'Nº de Atletas Ativos',
                              data: Object.values(reportData.charts.activeMembersByModality),
                              backgroundColor: 'rgba(59, 130, 246, 0.8)',
                              borderColor: 'rgba(59, 130, 246, 1)',
                              borderWidth: 1
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Atletas: ${context.parsed.y}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: { stepSize: 1 }
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-600">
                        Nenhum dado de modalidade disponível
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Receita de Mensalidades por Modalidade */}
                <Card>
                  <CardHeader>
                    <CardTitle>Receita de Mensalidades por Modalidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.charts.revenueByModality && Object.keys(reportData.charts.revenueByModality).length > 0 ? (
                      <div className="h-80">
                        <Bar
                          data={{
                            labels: Object.keys(reportData.charts.revenueByModality),
                            datasets: [{
                              label: 'Receita (€)',
                              data: Object.values(reportData.charts.revenueByModality),
                              backgroundColor: 'rgba(34, 197, 94, 0.8)',
                              borderColor: 'rgba(34, 197, 94, 1)',
                              borderWidth: 1
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    return `Receita: €${context.parsed.y.toFixed(2)}`;
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                ticks: {
                                  callback: function(value) {
                                    return '€' + value.toFixed(0);
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-600">
                        Nenhuma receita de mensalidades disponível
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          
          {reportData.type === 'stock' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={t[language].articlesInStock}
                value={reportData.stats.articlesInStock}
                icon={Package}
                color="bg-blue-500"
              />
              <StatCard
                title={t[language].investedValue}
                value={`€${reportData.stats.investedValue.toFixed(2)}`}
                icon={DollarSign}
                color="bg-red-500"
              />
              <StatCard
                title={t[language].receivedValue}
                value={`€${reportData.stats.receivedValue.toFixed(2)}`}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatCard
                title={t[language].netValue}
                value={`€${reportData.stats.netValue.toFixed(2)}`}
                icon={Activity}
                color="bg-purple-500"
              />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Selecione um tipo de relatório para começar</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
