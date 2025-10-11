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
  
  // Comparison states
  const [enableComparison, setEnableComparison] = useState(false);
  const [comparisonYear, setComparisonYear] = useState(new Date().getFullYear() - 1);
  const [comparisonData, setComparisonData] = useState(null);

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
      // Comparison
      compareHomologous: 'Comparar com período homólogo',
      comparisonYear: 'Ano de comparação',
      currentPeriod: 'Período Atual',
      previousPeriod: 'Período Anterior',
      variation: 'Variação',
      growthRate: 'Taxa de Crescimento',
      increase: 'Aumento',
      decrease: 'Diminuição',
      stable: 'Estável',
      vsLastYear: 'vs ano anterior',
      alert: 'Alerta',
      significantGrowth: 'Crescimento significativo',
      significantDecline: 'Queda significativa',
      bestMonth: 'Melhor mês',
      projection: 'Projeção',
      nextPeriod: 'Próximo Período',
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
      // Comparison
      compareHomologous: 'Compare with homologous period',
      comparisonYear: 'Comparison year',
      currentPeriod: 'Current Period',
      previousPeriod: 'Previous Period',
      variation: 'Variation',
      growthRate: 'Growth Rate',
      increase: 'Increase',
      decrease: 'Decrease',
      stable: 'Stable',
      vsLastYear: 'vs last year',
      alert: 'Alert',
      significantGrowth: 'Significant growth',
      significantDecline: 'Significant decline',
      bestMonth: 'Best month',
      projection: 'Projection',
      nextPeriod: 'Next Period',
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
  }, [reportType, dateRange, startDate, endDate, members, expenses, revenues, enableComparison, comparisonYear]);

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

  // Helper function to calculate comparison metrics
  const calculateComparison = (current, previous) => {
    if (!previous || previous === 0) {
      return {
        absolute: current,
        percentage: current > 0 ? 100 : 0,
        trend: current > 0 ? 'increase' : 'stable'
      };
    }
    
    const absolute = current - previous;
    const percentage = ((absolute / previous) * 100);
    let trend = 'stable';
    
    if (percentage > 5) trend = 'increase';
    else if (percentage < -5) trend = 'decrease';
    
    return { absolute, percentage, trend };
  };

  // Helper function to generate alerts
  const generateAlerts = (comparison, metric) => {
    const alerts = [];
    
    if (comparison.percentage > 20) {
      alerts.push({
        type: 'success',
        message: `${t[language].significantGrowth}: ${metric} +${comparison.percentage.toFixed(1)}%`
      });
    } else if (comparison.percentage < -20) {
      alerts.push({
        type: 'warning',
        message: `${t[language].significantDecline}: ${metric} ${comparison.percentage.toFixed(1)}%`
      });
    }
    
    return alerts;
  };

  // Helper function to calculate projection
  const calculateProjection = (current, previous) => {
    if (!previous || previous === 0) return current;
    const growthRate = (current - previous) / previous;
    return current * (1 + growthRate);
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

  // Helper function to calculate financial data for a specific period
  const calculateFinancialData = (start, end, paymentsData, revenuesData, expensesData) => {
    const filteredPayments = paymentsData.filter(payment => {
      const payDate = new Date(payment.payment_date);
      return payDate >= start && payDate <= end && payment.status === 'paid';
    });

    const filteredRevenues = revenuesData.filter(revenue => {
      const revDate = new Date(revenue.revenue_date || revenue.date);
      return revDate >= start && revDate <= end;
    });

    const filteredExpenses = expensesData.filter(expense => {
      const expDate = new Date(expense.expense_date || expense.date);
      return expDate >= start && expDate <= end;
    });
    
    // Calculate REVENUES
    const revenuePayments = filteredPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const revenueExtras = filteredRevenues.filter(r => r.category === 'revenueExtras').reduce((sum, revenue) => sum + revenue.amount, 0);
    const revenueArticles = filteredRevenues.filter(r => r.category === 'textil').reduce((sum, revenue) => sum + revenue.amount, 0);
    const revenueEquipment = filteredRevenues.filter(r => r.category === 'equipment').reduce((sum, revenue) => sum + revenue.amount, 0);
    const totalRevenue = revenuePayments + revenueExtras + revenueArticles + revenueEquipment;
    
    // Calculate EXPENSES
    const expenseFixed = filteredExpenses.filter(e => ['rent', 'energy'].includes(e.category)).reduce((sum, expense) => sum + expense.amount, 0);
    const expenseVariable = filteredExpenses.filter(e => ['maintenance', 'teachers', 'collaborators', 'extras'].includes(e.category)).reduce((sum, expense) => sum + expense.amount, 0);
    const expenseArticles = filteredExpenses.filter(e => e.category === 'textil').reduce((sum, expense) => sum + expense.amount, 0);
    const expenseEquipment = filteredExpenses.filter(e => e.category === 'equipment').reduce((sum, expense) => sum + expense.amount, 0);
    const totalExpense = expenseFixed + expenseVariable + expenseArticles + expenseEquipment;
    
    const netTotal = totalRevenue - totalExpense;
    
    return {
      revenuePayments,
      revenueExtras,
      revenueArticles,
      revenueEquipment,
      totalRevenue,
      expenseFixed,
      expenseVariable,
      expenseArticles,
      expenseEquipment,
      totalExpense,
      netTotal
    };
  };

  const generateFinancialReport = async (start, end) => {
    try {
      // Calculate current period data
      const currentData = calculateFinancialData(start, end, payments, revenues, expenses);
      
      // Calculate comparison data if enabled
      let comparisonDataResult = null;
      let comparisons = null;
      let alerts = [];
      
      if (enableComparison) {
        const yearDiff = new Date().getFullYear() - comparisonYear;
        const compStart = new Date(start);
        compStart.setFullYear(compStart.getFullYear() - yearDiff);
        const compEnd = new Date(end);
        compEnd.setFullYear(compEnd.getFullYear() - yearDiff);
        
        comparisonDataResult = calculateFinancialData(compStart, compEnd, payments, revenues, expenses);
        
        // Calculate comparisons for each metric
        comparisons = {
          totalRevenue: calculateComparison(currentData.totalRevenue, comparisonDataResult.totalRevenue),
          totalExpense: calculateComparison(currentData.totalExpense, comparisonDataResult.totalExpense),
          netTotal: calculateComparison(currentData.netTotal, comparisonDataResult.netTotal),
          revenuePayments: calculateComparison(currentData.revenuePayments, comparisonDataResult.revenuePayments)
        };
        
        // Generate alerts
        alerts = [
          ...generateAlerts(comparisons.totalRevenue, t[language].totalRevenue),
          ...generateAlerts(comparisons.netTotal, t[language].netRevenue)
        ];
        
        // Calculate projection
        comparisons.projection = {
          totalRevenue: calculateProjection(currentData.totalRevenue, comparisonDataResult.totalRevenue),
          netTotal: calculateProjection(currentData.netTotal, comparisonDataResult.netTotal)
        };
      }
      
      setReportData({
        type: 'financial',
        stats: { 
          ...currentData,
          totalRevenues: currentData.totalRevenue,
          totalExpenses: currentData.totalExpense
        },
        comparison: enableComparison ? {
          data: comparisonDataResult,
          comparisons,
          alerts
        } : null,
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
      
      // Get all payments
      const paymentsRes = await axios.get(`${API}/payments`);
      // Filter membership payments (payment_method = 'membership')
      const membershipPayments = paymentsRes.data.filter(p => 
        p.payment_method === 'membership' && p.status === 'paid'
      );
      
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
      
      // Separate by category
      const textilItems = inventory.filter(item => item.category === 'textil' || item.category === 'clothing');
      const equipmentItems = inventory.filter(item => item.category === 'equipment');
      
      // Prepare data for Textil chart
      const textilChartData = textilItems.map(item => ({
        name: item.name,
        units: item.quantity || 0,
        stock: (item.quantity || 0) * (item.purchase_price || 0), // Value in stock
        revenue: (item.sold_quantity || 0) * (item.sale_price || item.price || 0)
      }));
      
      // Prepare data for Equipment chart
      const equipmentChartData = equipmentItems.map(item => ({
        name: item.name,
        units: item.quantity || 0,
        stock: (item.quantity || 0) * (item.purchase_price || 0), // Value in stock
        revenue: (item.sold_quantity || 0) * (item.sale_price || item.price || 0)
      }));
      
      // Calculate overall metrics
      const articlesInStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const investedValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.purchase_price || 0)), 0);
      const receivedValue = inventory.reduce((sum, item) => sum + ((item.sold_quantity || 0) * (item.sale_price || item.price || 0)), 0);
      const netValue = receivedValue - investedValue;
      
      setReportData({
        type: 'stock',
        stats: { 
          articlesInStock, 
          investedValue, 
          receivedValue, 
          netValue,
          textilItemsCount: textilItems.length,
          equipmentItemsCount: equipmentItems.length
        },
        charts: { 
          textilData: textilChartData,
          equipmentData: equipmentChartData
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
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="enable-comparison"
                checked={enableComparison}
                onChange={(e) => setEnableComparison(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enable-comparison" className="text-sm font-medium text-gray-700">
                {t[language].compareHomologous}
              </label>
            </div>
          </div>
          
          {/* Comparison Year Selector */}
          {enableComparison && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t[language].comparisonYear}
              </label>
              <Select value={comparisonYear.toString()} onValueChange={(val) => setComparisonYear(parseInt(val))}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - i - 1;
                    return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Custom Date Range */}
          {dateRange === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          
          {/* Comparison Cards - Show alerts and key metrics */}
          {reportData.comparison && reportData.comparison.alerts && reportData.comparison.alerts.length > 0 && (
            <div className="space-y-3">
              {reportData.comparison.alerts.map((alert, idx) => (
                <Card key={idx} className={alert.type === 'success' ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {alert.type === 'success' ? (
                        <span className="text-2xl">📈</span>
                      ) : (
                        <span className="text-2xl">⚠️</span>
                      )}
                      <span className="font-medium">{alert.message}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          
          {/* Comparison Summary Cards */}
          {reportData.comparison && reportData.type === 'financial' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Revenue Card */}
              <Card className="border-green-200">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">{t[language].totalRevenue}</div>
                  <div className="text-2xl font-bold text-green-600">
                    €{reportData.stats.totalRevenue?.toFixed(2) || '0.00'}
                  </div>
                  {reportData.comparison.comparisons.totalRevenue && (
                    <div className={`text-sm font-medium mt-2 flex items-center gap-1 ${
                      reportData.comparison.comparisons.totalRevenue.trend === 'increase' ? 'text-green-600' :
                      reportData.comparison.comparisons.totalRevenue.trend === 'decrease' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {reportData.comparison.comparisons.totalRevenue.trend === 'increase' ? '↑' :
                       reportData.comparison.comparisons.totalRevenue.trend === 'decrease' ? '↓' : '→'}
                      <span>
                        {reportData.comparison.comparisons.totalRevenue.percentage > 0 ? '+' : ''}
                        {reportData.comparison.comparisons.totalRevenue.percentage.toFixed(1)}% 
                      </span>
                      <span className="text-gray-500">{t[language].vsLastYear}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Total Expense Card */}
              <Card className="border-red-200">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">{t[language].totalExpense}</div>
                  <div className="text-2xl font-bold text-red-600">
                    €{reportData.stats.totalExpense?.toFixed(2) || '0.00'}
                  </div>
                  {reportData.comparison.comparisons.totalExpense && (
                    <div className={`text-sm font-medium mt-2 flex items-center gap-1 ${
                      reportData.comparison.comparisons.totalExpense.trend === 'increase' ? 'text-red-600' :
                      reportData.comparison.comparisons.totalExpense.trend === 'decrease' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {reportData.comparison.comparisons.totalExpense.trend === 'increase' ? '↑' :
                       reportData.comparison.comparisons.totalExpense.trend === 'decrease' ? '↓' : '→'}
                      <span>
                        {reportData.comparison.comparisons.totalExpense.percentage > 0 ? '+' : ''}
                        {reportData.comparison.comparisons.totalExpense.percentage.toFixed(1)}%
                      </span>
                      <span className="text-gray-500">{t[language].vsLastYear}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Net Total Card */}
              <Card className="border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm text-gray-600 mb-1">{t[language].netRevenue}</div>
                  <div className={`text-2xl font-bold ${reportData.stats.netTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    €{reportData.stats.netTotal?.toFixed(2) || '0.00'}
                  </div>
                  {reportData.comparison.comparisons.netTotal && (
                    <div className={`text-sm font-medium mt-2 flex items-center gap-1 ${
                      reportData.comparison.comparisons.netTotal.trend === 'increase' ? 'text-green-600' :
                      reportData.comparison.comparisons.netTotal.trend === 'decrease' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {reportData.comparison.comparisons.netTotal.trend === 'increase' ? '↑' :
                       reportData.comparison.comparisons.netTotal.trend === 'decrease' ? '↓' : '→'}
                      <span>
                        {reportData.comparison.comparisons.netTotal.percentage > 0 ? '+' : ''}
                        {reportData.comparison.comparisons.netTotal.percentage.toFixed(1)}%
                      </span>
                      <span className="text-gray-500">{t[language].vsLastYear}</span>
                    </div>
                  )}
                  {reportData.comparison.comparisons.projection && (
                    <div className="text-xs text-gray-500 mt-1">
                      {t[language].projection}: €{reportData.comparison.comparisons.projection.netTotal?.toFixed(2)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Bar Chart - Receita, Despesa, Total Líquido - APENAS RELATÓRIO FINANCEIRO */}
            {reportData.type === 'financial' && reportData.stats && (
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

            {/* Pie Chart - Análise Financeira Detalhada - APENAS RELATÓRIO FINANCEIRO */}
            {reportData.type === 'financial' && reportData.stats && (
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
              
              {/* Gráficos de Modalidades */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Barras - Receitas por Modalidade */}
                <Card>
                  <CardHeader>
                    <CardTitle>Análise Financeira Completa - Receitas de Mensalidades (€)</CardTitle>
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
                              backgroundColor: [
                                'rgba(239, 68, 68, 0.8)',   // Boxe - vermelho
                                'rgba(251, 146, 60, 0.8)',  // Kickboxing - laranja
                                'rgba(168, 85, 247, 0.8)',  // Jiu-Jitsu - roxo
                                'rgba(59, 130, 246, 0.8)',  // Musculação - azul
                                'rgba(34, 197, 94, 0.8)'    // Receita Total - verde
                              ],
                              borderColor: [
                                'rgba(239, 68, 68, 1)',
                                'rgba(251, 146, 60, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(59, 130, 246, 1)',
                                'rgba(34, 197, 94, 1)'
                              ],
                              borderWidth: 2
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

                {/* Gráfico Circular - Distribuição de Receitas por Modalidade */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição de Receitas de Mensalidades por Modalidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reportData.charts.revenueByModality && Object.keys(reportData.charts.revenueByModality).length > 0 ? (
                      <div className="h-80">
                        <Pie
                          data={{
                            labels: Object.keys(reportData.charts.revenueByModality).filter(k => k !== 'Receita Total'),
                            datasets: [{
                              data: Object.entries(reportData.charts.revenueByModality)
                                .filter(([key]) => key !== 'Receita Total')
                                .map(([_, value]) => value),
                              backgroundColor: [
                                'rgba(239, 68, 68, 0.8)',   // Boxe - vermelho
                                'rgba(251, 146, 60, 0.8)',  // Kickboxing - laranja
                                'rgba(168, 85, 247, 0.8)',  // Jiu-Jitsu - roxo
                                'rgba(59, 130, 246, 0.8)'   // Musculação - azul
                              ],
                              borderColor: [
                                'rgba(239, 68, 68, 1)',
                                'rgba(251, 146, 60, 1)',
                                'rgba(168, 85, 247, 1)',
                                'rgba(59, 130, 246, 1)'
                              ],
                              borderWidth: 2
                            }]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { padding: 15 }
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const label = context.label || '';
                                    const value = context.parsed || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                    return `${label}: €${value.toFixed(2)} (${percentage}%)`;
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
              
              {/* Card de Atletas Ativos por Modalidade */}
              <Card>
                <CardHeader>
                  <CardTitle>Atletas Ativos por Modalidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {reportData.charts.activeMembersByModality && Object.keys(reportData.charts.activeMembersByModality).length > 0 ? (
                      Object.entries(reportData.charts.activeMembersByModality).map(([activity, count]) => (
                        <div key={activity} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{activity}</span>
                          <span className="text-sm font-semibold text-blue-600">{count} atletas</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-600">
                        Nenhum dado de modalidade disponível
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
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

          {/* Stock Charts - Textil and Equipment */}
          {reportData.type === 'stock' && reportData.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Textil Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Artigos Textil - Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.charts.textilData && reportData.charts.textilData.length > 0 ? (
                    <div className="h-96">
                      <Bar
                        data={{
                          labels: reportData.charts.textilData.map(item => item.name),
                          datasets: [
                            {
                              label: 'Nº Unidades',
                              data: reportData.charts.textilData.map(item => item.units),
                              backgroundColor: 'rgba(59, 130, 246, 0.8)',
                              borderColor: 'rgba(59, 130, 246, 1)',
                              borderWidth: 1,
                              yAxisID: 'y'
                            },
                            {
                              label: 'Valor Stock (€)',
                              data: reportData.charts.textilData.map(item => item.stock),
                              backgroundColor: 'rgba(251, 146, 60, 0.8)',
                              borderColor: 'rgba(251, 146, 60, 1)',
                              borderWidth: 1,
                              yAxisID: 'y1'
                            },
                            {
                              label: 'Receita (€)',
                              data: reportData.charts.textilData.map(item => item.revenue),
                              backgroundColor: 'rgba(34, 197, 94, 0.8)',
                              borderColor: 'rgba(34, 197, 94, 1)',
                              borderWidth: 1,
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false
                          },
                          plugins: {
                            legend: {
                              position: 'top'
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  let label = context.dataset.label || '';
                                  if (label) {
                                    label += ': ';
                                  }
                                  if (context.parsed.y !== null) {
                                    if (label.includes('€')) {
                                      label += '€' + context.parsed.y.toFixed(2);
                                    } else {
                                      label += context.parsed.y;
                                    }
                                  }
                                  return label;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Unidades'
                              },
                              beginAtZero: true
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: {
                                display: true,
                                text: 'Valor (€)'
                              },
                              beginAtZero: true,
                              grid: {
                                drawOnChartArea: false
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-600">
                      Nenhum artigo textil disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Equipment Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Artigos Equipamento - Análise Detalhada</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.charts.equipmentData && reportData.charts.equipmentData.length > 0 ? (
                    <div className="h-96">
                      <Bar
                        data={{
                          labels: reportData.charts.equipmentData.map(item => item.name),
                          datasets: [
                            {
                              label: 'Nº Unidades',
                              data: reportData.charts.equipmentData.map(item => item.units),
                              backgroundColor: 'rgba(59, 130, 246, 0.8)',
                              borderColor: 'rgba(59, 130, 246, 1)',
                              borderWidth: 1,
                              yAxisID: 'y'
                            },
                            {
                              label: 'Valor Stock (€)',
                              data: reportData.charts.equipmentData.map(item => item.stock),
                              backgroundColor: 'rgba(251, 146, 60, 0.8)',
                              borderColor: 'rgba(251, 146, 60, 1)',
                              borderWidth: 1,
                              yAxisID: 'y1'
                            },
                            {
                              label: 'Receita (€)',
                              data: reportData.charts.equipmentData.map(item => item.revenue),
                              backgroundColor: 'rgba(34, 197, 94, 0.8)',
                              borderColor: 'rgba(34, 197, 94, 1)',
                              borderWidth: 1,
                              yAxisID: 'y1'
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false
                          },
                          plugins: {
                            legend: {
                              position: 'top'
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  let label = context.dataset.label || '';
                                  if (label) {
                                    label += ': ';
                                  }
                                  if (context.parsed.y !== null) {
                                    if (label.includes('€')) {
                                      label += '€' + context.parsed.y.toFixed(2);
                                    } else {
                                      label += context.parsed.y;
                                    }
                                  }
                                  return label;
                                }
                              }
                            }
                          },
                          scales: {
                            y: {
                              type: 'linear',
                              display: true,
                              position: 'left',
                              title: {
                                display: true,
                                text: 'Unidades'
                              },
                              beginAtZero: true
                            },
                            y1: {
                              type: 'linear',
                              display: true,
                              position: 'right',
                              title: {
                                display: true,
                                text: 'Valor (€)'
                              },
                              beginAtZero: true,
                              grid: {
                                drawOnChartArea: false
                              }
                            }
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-600">
                      Nenhum artigo de equipamento disponível
                    </div>
                  )}
                </CardContent>
              </Card>
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
