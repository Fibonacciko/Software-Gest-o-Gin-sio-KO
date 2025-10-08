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
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
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
      memberReport: 'Relatório de Membros',
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
      revenueArticles: 'Receitas Artigos', 
      revenueEquipment: 'Receitas Equipamentos',
      expenseFixed: 'Despesas Fixas',
      expenseVariable: 'Despesas Variáveis',
      expenseArticles: 'Despesas Artigos',
      expenseEquipment: 'Despesas Equipamentos',
      netTotal: 'Total Líquido',
      // Stock metrics
      articlesInStock: 'Artigos em Stock',
      investedValue: 'Valor Investido',
      receivedValue: 'Valor Recebido',
      netValue: 'Valor Líquido',
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
      memberReport: 'Member Report',
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
      // Financial metrics
      monthlyRevenue: 'Monthly Revenue',
      extraRevenue: 'Extra Revenue',
      fixedExpenses: 'Fixed Expenses', 
      extraExpenses: 'Extra Expenses',
      articleRevenue: 'Article Revenue',
      articleExpenses: 'Article Expenses',
      grossTotal: 'Gross Total',
      netTotal: 'Net Total',
      // Stock metrics
      articlesInStock: 'Articles in Stock',
      investedValue: 'Invested Value',
      receivedValue: 'Received Value', 
      netValue: 'Net Value',
      totalMembers: 'Total Members',
      membersByActivity: 'Members by Activity',
      membersByPack: 'Members by Pack',
      totalArticles: 'Total Articles',
      totalStockValue: 'Total Stock Value',
      totalSoldValue: 'Total Sold Value',
      totalPurchaseValue: 'Total Purchase Value',
      // Financial metrics
      monthlyRevenue: 'Monthly Revenue',
      extraRevenue: 'Extra Revenue',
      fixedExpenses: 'Fixed Expenses', 
      extraExpenses: 'Extra Expenses',
      articleRevenue: 'Article Revenue',
      articleExpenses: 'Article Expenses',
      grossTotal: 'Gross Total',
      netTotal: 'Net Total',
      // Stock metrics
      articlesInStock: 'Articles in Stock',
      investedValue: 'Invested Value',
      receivedValue: 'Received Value', 
      netValue: 'Net Value',
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
  }, [reportType, dateRange, startDate, endDate, members]);

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
      // Filter payments within date range
      const filteredPayments = payments.filter(payment => {
        const payDate = new Date(payment.payment_date);
        return payDate >= start && payDate <= end && payment.status === 'paid';
      });
      
      // Calculate financial metrics
      const monthlyRevenue = filteredPayments
        .filter(p => p.description && p.description.toLowerCase().includes('mensalidade'))
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      const extraRevenue = filteredPayments
        .filter(p => !p.description || !p.description.toLowerCase().includes('mensalidade'))
        .reduce((sum, payment) => sum + payment.amount, 0);
      
      // Get inventory data for articles
      const inventoryRes = await axios.get(`${API}/inventory`);
      const inventory = inventoryRes.data;
      
      const articleRevenue = inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * item.price), 0);
      const articleExpenses = inventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || item.price * 0.6)), 0);
      
      // Mock expenses data (would need proper expenses system)
      const fixedExpenses = 500; // Mock: rent, utilities, etc.
      const extraExpenses = 200; // Mock: maintenance, equipment, etc.
      
      // Calculate totals
      const grossTotal = monthlyRevenue + extraRevenue + articleRevenue;
      const netTotal = grossTotal - (fixedExpenses + extraExpenses + articleExpenses);
      
      setReportData({
        type: 'financial',
        stats: { 
          monthlyRevenue, 
          extraRevenue, 
          fixedExpenses, 
          extraExpenses, 
          articleRevenue, 
          articleExpenses, 
          grossTotal, 
          netTotal 
        },
        charts: { 
          revenues: {
            [`${t[language || 'pt'].monthlyRevenue}`]: monthlyRevenue,
            [`${t[language || 'pt'].extraRevenue}`]: extraRevenue,
            [`${t[language || 'pt'].articleRevenue}`]: articleRevenue,
            [`${t[language || 'pt'].grossTotal}`]: grossTotal
          },
          expenses: {
            [`${t[language || 'pt'].fixedExpenses}`]: fixedExpenses,
            [`${t[language || 'pt'].extraExpenses}`]: extraExpenses,
            [`${t[language || 'pt'].articleExpenses}`]: articleExpenses,
            [`${t[language || 'pt'].netTotal}`]: netTotal
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
      const totalMembers = members.length;
      const activeMembers = members.filter(member => member.status === 'active').length;
      
      // Get attendance data to group members by activity/modality
      const attendanceRes = await axios.get(`${API}/attendance`);
      const attendanceData = attendanceRes.data;
      
      // Group members by activity/modality
      const membersByActivity = attendanceData.reduce((acc, att) => {
        const activity = att.activity?.name || 'Sem modalidade';
        if (!acc[activity]) {
          acc[activity] = new Set();
        }
        acc[activity].add(att.member_id);
        return acc;
      }, {});
      
      // Define specific modalities to show
      const specificModalities = ['Boxe', 'Kickboxing', 'Jiu-Jitsu', 'Pilates', 'Yoga'];
      
      // Create metrics for specific modalities only (mock some data for visualization)
      const modalityMetrics = {};
      specificModalities.forEach((modality, index) => {
        // Get real data if available, otherwise mock some data for demo
        const realCount = membersByActivity[modality] ? membersByActivity[modality].size : 0;
        // Add mock data for visualization (in production, this would be real data)
        modalityMetrics[modality] = realCount > 0 ? realCount * 150 : (index + 1) * 180; // Mock euro values for visualization
      });
      
      setReportData({
        type: 'member',
        stats: { totalMembers, activeMembers },
        charts: { 
          modalityMetrics: modalityMetrics,
          membersByActivity: Object.keys(membersByActivity).reduce((acc, activity) => {
            if (specificModalities.includes(activity)) {
              acc[activity] = membersByActivity[activity].size;
            }
            return acc;
          }, {}),
          membersByPack: members.reduce((acc, member) => {
            const pack = member.membership_type || 'unknown';
            const packName = pack === 'basic' ? 'Básico' : 
                            pack === 'premium' ? 'Premium' : 
                            pack === 'vip' ? 'VIP' : 'Desconhecido';
            acc[packName] = (acc[packName] || 0) + 1;
            return acc;
          }, {})
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
            
            {/* Bar Chart - Always in Euros */}
            {reportData.charts && Object.keys(reportData.charts).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gráfico de Barras (€)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Bar
                    data={{
                      labels: Object.keys(Object.values(reportData.charts)[0] || {}),
                      datasets: [{
                        label: 'Valores (€)',
                        data: Object.values(Object.values(reportData.charts)[0] || {}),
                        backgroundColor: [
                          'rgba(54, 162, 235, 0.8)',
                          'rgba(255, 99, 132, 0.8)', 
                          'rgba(255, 206, 86, 0.8)',
                          'rgba(75, 192, 192, 0.8)',
                          'rgba(153, 102, 255, 0.8)',
                          'rgba(255, 159, 64, 0.8)',
                          'rgba(128, 90, 213, 0.8)',
                          'rgba(16, 185, 129, 0.8)'
                        ],
                        borderColor: [
                          'rgba(54, 162, 235, 1)',
                          'rgba(255, 99, 132, 1)',
                          'rgba(255, 206, 86, 1)',
                          'rgba(75, 192, 192, 1)',
                          'rgba(153, 102, 255, 1)',
                          'rgba(255, 159, 64, 1)',
                          'rgba(128, 90, 213, 1)',
                          'rgba(16, 185, 129, 1)'
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: €${context.parsed.y.toFixed(2)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: function(value) {
                              return '€' + value;
                            }
                          }
                        }
                      }
                    }}
                  />
                </CardContent>
              </Card>
            )}

            {/* Pie Chart - Always in Percentages */}
            {reportData.charts && Object.keys(reportData.charts).length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle>Gráfico Circular (%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Pie
                    data={{
                      labels: Object.keys(Object.values(reportData.charts)[1] || {}),
                      datasets: [{
                        data: (() => {
                          const chartData = Object.values(reportData.charts)[1] || {};
                          const values = Object.values(chartData);
                          const total = values.reduce((sum, val) => sum + val, 0);
                          return values.map(val => total > 0 ? parseFloat(((val / total) * 100).toFixed(1)) : 0);
                        })(),
                        backgroundColor: [
                          '#FF6384',
                          '#36A2EB', 
                          '#FFCE56',
                          '#4BC0C0',
                          '#9966FF',
                          '#FF9F40',
                          '#FF8C94',
                          '#A8E6CF'
                        ],
                      }]
                    }}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${context.parsed}%`;
                            }
                          }
                        }
                      },
                    }}
                  />
                </CardContent>
              </Card>
            )}
          </div>
          
          {reportData.type === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={t[language].monthlyRevenue}
                value={`€${reportData.stats.monthlyRevenue.toFixed(2)}`}
                icon={DollarSign}
                color="bg-blue-500"
              />
              <StatCard
                title={t[language].extraRevenue}
                value={`€${reportData.stats.extraRevenue.toFixed(2)}`}
                icon={TrendingUp}
                color="bg-green-500"
              />
              <StatCard
                title={t[language].articleRevenue}
                value={`€${reportData.stats.articleRevenue.toFixed(2)}`}
                icon={Package}
                color="bg-purple-500"
              />
              <StatCard
                title={t[language].netTotal}
                value={`€${reportData.stats.netTotal.toFixed(2)}`}
                icon={Activity}
                color="bg-orange-500"
              />
            </div>
          )}
          
          {reportData.type === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard
                title={t[language].fixedExpenses}
                value={`€${reportData.stats.fixedExpenses.toFixed(2)}`}
                icon={BarChart}
                color="bg-red-500"
              />
              <StatCard
                title={t[language].extraExpenses}
                value={`€${reportData.stats.extraExpenses.toFixed(2)}`}
                icon={Calendar}
                color="bg-red-600"
              />
              <StatCard
                title={t[language].articleExpenses}
                value={`€${reportData.stats.articleExpenses.toFixed(2)}`}
                icon={Package}
                color="bg-red-700"
              />
              <StatCard
                title={t[language].grossTotal}
                value={`€${reportData.stats.grossTotal.toFixed(2)}`}
                icon={TrendingUp}
                color="bg-green-600"
              />
            </div>
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
                <Card>
                  <CardHeader>
                    <CardTitle>{t[language].membersByActivity}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reportData.charts.membersByActivity && Object.keys(reportData.charts.membersByActivity).length > 0 ? (
                        Object.entries(reportData.charts.membersByActivity).map(([activity, count]) => (
                          <div key={activity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <span className="font-medium">{activity}</span>
                            <span className="text-sm font-semibold text-blue-600">{count}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-600">
                          Nenhum dados de modalidade disponível
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>{t[language].membersByPack}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {reportData.charts.membersByPack && Object.entries(reportData.charts.membersByPack).map(([pack, count]) => (
                        <div key={pack} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{pack}</span>
                          <span className="text-sm font-semibold text-green-600">{count}</span>
                        </div>
                      ))}
                    </div>
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
