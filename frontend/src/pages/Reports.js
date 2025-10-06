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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Reports = ({ language, translations }) => {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('attendance');
  const [dateRange, setDateRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [members, setMembers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const t = {
    pt: {
      reports: 'Relatórios',
      generateReport: 'Gerar Relatório',
      reportType: 'Tipo de Relatório',
      financialReport: 'Relatório Financeiro',
      attendanceReport: 'Relatório de Presenças',
      memberReport: 'Relatório de Membros',
      stockReport: 'Relatório de Stock',
      dateRange: 'Período',
      thisMonth: 'Este Mês',
      lastMonth: 'Mês Passado',
      thisYear: 'Este Ano',
      lastYear: 'Ano Passado',
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
      attendanceReport: 'Attendance Report',
      paymentReport: 'Payment Report',
      memberReport: 'Member Report',
      inventoryReport: 'Inventory Report',
      dateRange: 'Date Range',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      thisYear: 'This Year',
      lastYear: 'Last Year',
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
      const [membersRes, paymentsRes, attendanceRes] = await Promise.all([
        axios.get(`${API}/members`),
        axios.get(`${API}/payments`),
        axios.get(`${API}/attendance`)
      ]);
      
      setMembers(membersRes.data);
      setPayments(paymentsRes.data);
      setAttendance(attendanceRes.data);
      
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
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date();
        end = endDate ? new Date(endDate) : new Date();
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date();
    }
    
    return { start, end };
  };

  const generateReport = () => {
    const { start, end } = getDateRange();
    
    switch (reportType) {
      case 'attendance':
        generateAttendanceReport(start, end);
        break;
      case 'payment':
        generatePaymentReport(start, end);
        break;
      case 'member':
        generateMemberReport();
        break;
      case 'inventory':
        generateInventoryReport();
        break;
      default:
        generateAttendanceReport(start, end);
    }
  };

  const generateAttendanceReport = (start, end) => {
    const filteredAttendance = attendance.filter(att => {
      const attDate = new Date(att.check_in_date);
      return attDate >= start && attDate <= end;
    });
    
    const totalAttendance = filteredAttendance.length;
    const uniqueVisitors = new Set(filteredAttendance.map(att => att.member_id)).size;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
    const dailyAverage = (totalAttendance / days).toFixed(1);
    
    // Group by date
    const attendanceByDay = filteredAttendance.reduce((acc, att) => {
      const date = att.check_in_date;
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    // Top members by attendance
    const memberAttendance = filteredAttendance.reduce((acc, att) => {
      acc[att.member_id] = (acc[att.member_id] || 0) + 1;
      return acc;
    }, {});
    
    const topMembers = Object.entries(memberAttendance)
      .map(([memberId, count]) => {
        const member = members.find(m => m.id === memberId);
        return { member: member?.name || 'Desconhecido', count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    setReportData({
      type: 'attendance',
      stats: { totalAttendance, uniqueVisitors, dailyAverage },
      charts: { attendanceByDay, topMembers }
    });
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

  const generateMemberReport = () => {
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active').length;
    
    // Members by type
    const membersByType = members.reduce((acc, member) => {
      acc[member.membership_type] = (acc[member.membership_type] || 0) + 1;
      return acc;
    }, {});
    
    // Members by status
    const membersByStatus = members.reduce((acc, member) => {
      acc[member.status] = (acc[member.status] || 0) + 1;
      return acc;
    }, {});
    
    setReportData({
      type: 'member',
      stats: { totalMembers, activeMembers },
      charts: { membersByType, membersByStatus }
    });
  };

  const generateInventoryReport = async () => {
    try {
      const inventoryRes = await axios.get(`${API}/inventory`);
      const inventory = inventoryRes.data;
      
      const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
      const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length;
      
      // Items by category
      const itemsByCategory = inventory.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + item.quantity;
        return acc;
      }, {});
      
      setReportData({
        type: 'inventory',
        stats: { totalItems, totalValue, lowStockItems },
        charts: { itemsByCategory }
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
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
                  <SelectItem value="attendance">{t[language].attendanceReport}</SelectItem>
                  <SelectItem value="payment">{t[language].paymentReport}</SelectItem>
                  <SelectItem value="member">{t[language].memberReport}</SelectItem>
                  <SelectItem value="inventory">{t[language].inventoryReport}</SelectItem>
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
                  <SelectItem value="lastMonth">{t[language].lastMonth}</SelectItem>
                  <SelectItem value="thisYear">{t[language].thisYear}</SelectItem>
                  <SelectItem value="lastYear">{t[language].lastYear}</SelectItem>
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
          {/* Statistics */}
          {reportData.type === 'attendance' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title={t[language].totalAttendance}
                  value={reportData.stats.totalAttendance}
                  icon={Activity}
                  color="bg-blue-500"
                />
                <StatCard
                  title={t[language].uniqueVisitors}
                  value={reportData.stats.uniqueVisitors}
                  icon={Users}
                  color="bg-green-500"
                />
                <StatCard
                  title={t[language].dailyAverage}
                  value={reportData.stats.dailyAverage}
                  icon={Calendar}
                  color="bg-purple-500"
                />
              </div>
              
              {/* Top Members */}
              <Card>
                <CardHeader>
                  <CardTitle>{t[language].topMembers}</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.charts.topMembers.length > 0 ? (
                    <div className="space-y-3">
                      {reportData.charts.topMembers.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{member.member}</span>
                          <span className="text-sm font-semibold text-blue-600">
                            {member.count} presenças
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">{t[language].noData}</p>
                  )}
                </CardContent>
              </Card>
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
                  value={reportData.stats.activeMembers}
                  icon={Activity}
                  color="bg-green-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{t[language].membersByType}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(reportData.charts.membersByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{t[language][type] || type}</span>
                          <span className="text-sm font-semibold text-blue-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Membros por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(reportData.charts.membersByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium">{t[language][status] || status}</span>
                          <span className="text-sm font-semibold text-green-600">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
          
          {reportData.type === 'inventory' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title={t[language].totalItems}
                  value={reportData.stats.totalItems}
                  icon={Package}
                  color="bg-blue-500"
                />
                <StatCard
                  title={t[language].totalValue}
                  value={`€${reportData.stats.totalValue.toFixed(2)}`}
                  icon={DollarSign}
                  color="bg-green-500"
                />
                <StatCard
                  title={t[language].lowStockItems}
                  value={reportData.stats.lowStockItems}
                  icon={Activity}
                  color="bg-orange-500"
                />
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Items por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(reportData.charts.itemsByCategory).map(([category, count]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{t[language][category] || category}</span>
                        <span className="text-sm font-semibold text-blue-600">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
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
