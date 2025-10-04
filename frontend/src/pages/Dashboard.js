import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Plus,
  Search,
  QrCode
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import ActivitySelector from '../components/ActivitySelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ language, translations }) => {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState({
    total_members: 0,
    active_members: 0,
    today_attendance: 0,
    monthly_revenue: 0
  });
  const [recentMembers, setRecentMembers] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkinMemberId, setCheckinMemberId] = useState('');
  const [qrMode, setQrMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');

  const t = {
    pt: {
      dashboard: 'Painel Principal',
      overview: 'Visão Geral',
      totalMembers: 'Total de Membros',
      activeMembers: 'Membros Ativos',
      todayAttendance: 'Presenças Hoje',
      monthlyRevenue: 'Receita Mensal',
      quickCheckin: 'Check-in Rápido',
      searchMember: 'Procurar membro...',
      checkinSuccess: 'Check-in realizado com sucesso!',
      memberNotFound: 'Membro não encontrado',
      recentMembers: 'Membros Recentes',
      todayAttendanceList: 'Presenças de Hoje',
      noAttendance: 'Nenhuma presença registada hoje',
      qrCheckin: 'Check-in QR',
      manualCheckin: 'Check-in Manual',
      selectMember: 'Selecionar membro',
      checkin: 'Check-in'
    },
    en: {
      dashboard: 'Dashboard',
      overview: 'Overview',
      totalMembers: 'Total Members',
      activeMembers: 'Active Members',
      todayAttendance: "Today's Attendance",
      monthlyRevenue: 'Monthly Revenue',
      quickCheckin: 'Quick Check-in',
      searchMember: 'Search member...',
      checkinSuccess: 'Check-in successful!',
      memberNotFound: 'Member not found',
      recentMembers: 'Recent Members',
      todayAttendanceList: "Today's Attendance",
      noAttendance: 'No attendance recorded today',
      qrCheckin: 'QR Check-in',
      manualCheckin: 'Manual Check-in',
      selectMember: 'Select member',
      checkin: 'Check-in'
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      fetchFilteredMembers();
    } else {
      setFilteredMembers([]);
    }
  }, [searchTerm]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const statsResponse = await axios.get(`${API}/dashboard`);
      setStats(statsResponse.data);
      
      // Fetch recent members
      const membersResponse = await axios.get(`${API}/members?limit=5`);
      setRecentMembers(membersResponse.data.slice(0, 5));
      
      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attendanceResponse = await axios.get(`${API}/attendance?start_date=${today}&end_date=${today}`);
      
      // Get member details for each attendance with better error handling
      const attendanceWithMembers = await Promise.all(
        attendanceResponse.data.map(async (att) => {
          try {
            const memberResponse = await axios.get(`${API}/members/${att.member_id}`);
            return {
              ...att,
              member: memberResponse.data
            };
          } catch (error) {
            console.warn(`Member ${att.member_id} not found, likely deleted`);
            return {
              ...att,
              member: { 
                name: 'Membro eliminado', 
                id: att.member_id,
                member_number: 'N/A',
                phone: 'N/A'
              }
            };
          }
        })
      );
      
      setTodayAttendance(attendanceWithMembers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredMembers = async () => {
    try {
      const response = await axios.get(`${API}/members?search=${searchTerm}`);
      setFilteredMembers(response.data.slice(0, 5));
    } catch (error) {
      console.error('Error searching members:', error);
    }
  };

  const handleQuickCheckin = async (memberId) => {
    if (!selectedActivity) {
      toast.error('Por favor seleciona uma modalidade');
      return;
    }
    
    try {
      await axios.post(`${API}/attendance`, {
        member_id: memberId,
        activity_id: selectedActivity,
        method: 'manual'
      });
      
      toast.success(t[language].checkinSuccess);
      setCheckinMemberId('');
      setSearchTerm('');
      setFilteredMembers([]);
      setSelectedActivity('');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error during check-in:', error);
      if (error.response?.status === 404) {
        toast.error(t[language].memberNotFound);
      } else {
        toast.error('Erro ao realizar check-in');
      }
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card className="card-shadow hover:shadow-lg transition-all duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp size={16} className="text-green-500 mr-1" />
                <span className="text-sm text-green-600">+{trend}%</span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${color}`}>
            <Icon size={24} className="text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t[language].dashboard}
          </h1>
          <p className="text-gray-600">
            {new Date().toLocaleDateString('pt-PT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin() ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard
          title={t[language].totalMembers}
          value={stats.total_members}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title={t[language].activeMembers}
          value={stats.active_members}
          icon={UserCheck}
          color="bg-green-500"
        />
        <StatCard
          title={t[language].todayAttendance}
          value={stats.today_attendance}
          icon={Calendar}
          color="bg-purple-500"
        />
        {isAdmin() && (
          <StatCard
            title={t[language].monthlyRevenue}
            value={`€${(stats.monthly_revenue || 0).toFixed(2)}`}
            icon={DollarSign}
            color="bg-orange-500"
          />
        )}
      </div>

      {/* Quick Check-in Section */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2" />
            {t[language].quickCheckin}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={!qrMode ? "default" : "outline"}
              onClick={() => setQrMode(false)}
              className="btn-hover"
              data-testid="manual-checkin-btn"
            >
              <Users className="mr-2" size={16} />
              {t[language].manualCheckin}
            </Button>
            <Button
              variant={qrMode ? "default" : "outline"}
              onClick={() => setQrMode(true)}
              className="btn-hover"
              data-testid="qr-checkin-btn"
            >
              <QrCode className="mr-2" size={16} />
              {t[language].qrCheckin}
            </Button>
          </div>

          {!qrMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modalidade *
                </label>
                <ActivitySelector
                  value={selectedActivity}
                  onChange={setSelectedActivity}
                  placeholder="Selecionar modalidade"
                />
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Procurar por nome, telefone ou nº sócio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="member-search"
                />
              </div>
              
              {filteredMembers.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{member.name}</p>
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                            #{member.member_number}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{member.phone}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={member.status === 'active' ? 'default' : 'secondary'}
                        >
                          {member.status}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleQuickCheckin(member.id)}
                          className="btn-hover"
                          data-testid={`checkin-${member.id}`}
                          disabled={!selectedActivity}
                        >
                          {t[language].checkin}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
              <QrCode size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Funcionalidade QR em desenvolvimento</p>
              <p className="text-sm text-gray-500">Será implementada na app móvel</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Members */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2" />
              {t[language].recentMembers}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMembers.length > 0 ? (
              <div className="space-y-3">
                {recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-gray-500">{member.membership_type}</p>
                    </div>
                    <Badge 
                      variant={member.status === 'active' ? 'default' : 'secondary'}
                    >
                      {member.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Nenhum membro registado</p>
            )}
          </CardContent>
        </Card>

        {/* Today's Attendance */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2" />
              {t[language].todayAttendanceList}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAttendance.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {todayAttendance.map((attendance) => (
                  <div key={attendance.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{attendance.member?.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(attendance.check_in_time).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {attendance.method}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                {t[language].noAttendance}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
