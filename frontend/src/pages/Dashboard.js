import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Plus,
  Search,
  QrCode,
  Edit3,
  FileText,
  Heart,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import ActivitySelector from '../components/ActivitySelector';
import SimpleMemberCalendar from '../components/SimpleMemberCalendar';

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
  const [lastCheckedInMember, setLastCheckedInMember] = useState(null);
  const [memberNotes, setMemberNotes] = useState('');
  const [memberMedicalNotes, setMemberMedicalNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingMedical, setEditingMedical] = useState(false);
  const [attendanceByModality, setAttendanceByModality] = useState({});
  const [totalAttendanceCount, setTotalAttendanceCount] = useState(0);

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
      checkin: 'Check-in',
      memberNotFound: 'Membro não encontrado',
      checkinSuccess: 'Check-in realizado com sucesso!',
      selectActivity: 'Selecionar modalidade',
      memberDetails: 'Detalhes do Membro',
      memberStatus: 'Status',
      subscriptionPlan: 'Plano de Subscrição',
      notes: 'Notas',
      medicalNotes: 'Quadro Clínico',
      editNotes: 'Editar Notas',
      saveNotes: 'Guardar',
      attendanceCalendar: 'Calendário de Presenças',
      cancelLastCheckin: 'Cancelar Último Check-in',
      checkinCancelled: 'Check-in cancelado com sucesso!',
      confirmCancelCheckin: 'Tem certeza que deseja cancelar o último check-in?'
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
      recentMembers: 'Recent Members',
      todayAttendanceList: "Today's Attendance",
      noAttendance: 'No attendance recorded today',
      qrCheckin: 'QR Check-in',
      manualCheckin: 'Manual Check-in',
      selectMember: 'Select member',
      checkin: 'Check-in',
      memberNotFound: 'Member not found',
      checkinSuccess: 'Check-in successful!',
      selectActivity: 'Select activity',
      memberDetails: 'Member Details',
      memberStatus: 'Status',
      subscriptionPlan: 'Subscription Plan',
      notes: 'Notes',
      medicalNotes: 'Medical Notes',
      editNotes: 'Edit Notes',
      saveNotes: 'Save',
      attendanceCalendar: 'Attendance Calendar',
      cancelLastCheckin: 'Cancel Last Check-in',
      checkinCancelled: 'Check-in cancelled successfully!',
      confirmCancelCheckin: 'Are you sure you want to cancel the last check-in?'
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
            
            // Get activity details if activity_id exists
            let activityName = memberResponse.data.activity || 'Sem modalidade';
            if (att.activity_id) {
              try {
                const activityResponse = await axios.get(`${API}/activities/${att.activity_id}`);
                activityName = activityResponse.data.name;
              } catch (activityError) {
                console.warn(`Activity ${att.activity_id} not found`);
              }
            }
            
            return {
              ...att,
              member: {
                ...memberResponse.data,
                activity: activityName
              }
            };
          } catch (error) {
            console.warn(`Member ${att.member_id} not found, likely deleted`);
            return {
              ...att,
              member: { 
                name: 'Membro eliminado', 
                id: att.member_id,
                member_number: 'N/A',
                phone: 'N/A',
                activity: 'N/A'
              }
            };
          }
        })
      );
      
      setTodayAttendance(attendanceWithMembers);
      
      // Calculate attendance by modality using member's activity
      const modalityStats = {};
      let totalCount = 0;
      
      for (const att of attendanceWithMembers) {
        const memberModality = att.member?.activity || 'Sem modalidade';
        modalityStats[memberModality] = (modalityStats[memberModality] || 0) + 1;
        totalCount++;
      }
      
      setAttendanceByModality(modalityStats);
      setTotalAttendanceCount(totalCount);
      
      console.log('Dashboard stats:', statsResponse.data);
      console.log('Dashboard today attendance:', attendanceWithMembers);
      console.log('🎯 Selected Activity State:', selectedActivity, 'Type:', typeof selectedActivity);
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

  const handleCancelLastCheckin = async () => {
    if (!lastCheckedInMember) return;
    
    if (window.confirm(t[language].confirmCancelCheckin)) {
      try {
        console.log('🚫 Cancelling last check-in for member:', lastCheckedInMember.id);
        
        // Get today's attendance for this member
        const today = new Date().toISOString().split('T')[0];
        const attendanceResponse = await axios.get(
          `${API}/attendance?member_id=${lastCheckedInMember.id}&date=${today}`
        );
        
        if (attendanceResponse.data.length > 0) {
          // Delete the most recent attendance record
          const lastAttendance = attendanceResponse.data[attendanceResponse.data.length - 1];
          await axios.delete(`${API}/attendance/${lastAttendance.id}`);
          
          console.log('✅ Last check-in cancelled successfully');
          toast.success(t[language].checkinCancelled);
          
          // Clear the member panel and refresh data
          setLastCheckedInMember(null);
          fetchDashboardData();
        } else {
          toast.error('Nenhum check-in encontrado para cancelar hoje.');
        }
        
      } catch (error) {
        console.error('❌ Error cancelling check-in:', error);
        toast.error('Erro ao cancelar check-in: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleSaveMemberNotes = async () => {
    if (!lastCheckedInMember) return;
    
    try {
      await axios.put(`${API}/members/${lastCheckedInMember.id}`, {
        notes: memberNotes,
        medical_notes: memberMedicalNotes
      });
      
      setEditingNotes(false);
      setEditingMedical(false);
      toast.success('Notas guardadas com sucesso!');
      
      // Update the member object with new notes
      setLastCheckedInMember({
        ...lastCheckedInMember,
        notes: memberNotes,
        medical_notes: memberMedicalNotes
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Erro ao guardar notas');
    }
  };

  const handleDeleteAttendance = async (attendanceId) => {
    if (window.confirm('Tem certeza que deseja eliminar esta presença?')) {
      try {
        await axios.delete(`${API}/attendance/${attendanceId}`);
        toast.success('Presença eliminada com sucesso');
        fetchDashboardData();
      } catch (error) {
        console.error('Error deleting attendance:', error);
        toast.error('Erro ao eliminar presença');
      }
    }
  };

  const handleQuickCheckin = useCallback(async (memberId) => {
    console.log('🔍 Check-in initiated for member ID:', memberId);
    console.log('🔍 Selected activity:', selectedActivity);
    
    if (!selectedActivity) {
      console.log('❌ No activity selected');
      toast.error('Por favor seleciona uma modalidade');
      return;
    }
    
    try {
      console.log('📡 Fetching member details...');
      // First get member details
      const memberResponse = await axios.get(`${API}/members/${memberId}`);
      const member = memberResponse.data;
      console.log('✅ Member details fetched:', member.name);
      
      // Get member's attendance history for the calendar
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      console.log('📡 Fetching attendance history for', year, month);
      const attendanceResponse = await axios.get(
        `${API}/members/${memberId}/attendance?month=${month}&year=${year}`
      );
      console.log('✅ Attendance history fetched:', attendanceResponse.data.length, 'records');
      
      // Perform check-in
      console.log('📡 Performing check-in API call...');
      const checkinPayload = {
        member_id: memberId,
        activity_id: selectedActivity,
        method: 'manual'
      };
      console.log('📤 Check-in payload:', checkinPayload);
      
      await axios.post(`${API}/attendance`, checkinPayload);
      console.log('✅ Check-in API call successful');
      
      // Set the member details for the panel
      setLastCheckedInMember({
        ...member,
        attendanceDates: attendanceResponse.data.map(att => att.check_in_date)
      });
      setMemberNotes(member.notes || '');
      setMemberMedicalNotes(member.medical_notes || '');
      
      console.log('✅ Member panel state set');
      toast.success(t[language].checkinSuccess);
      setCheckinMemberId('');
      setSearchTerm('');
      setFilteredMembers([]);
      setSelectedActivity('');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('❌ Error during check-in:', error);
      console.error('❌ Error details:', error.response?.data);
      if (error.response?.status === 404) {
        toast.error(t[language].memberNotFound);
      } else {
        toast.error('Erro ao realizar check-in: ' + (error.response?.data?.detail || error.message));
      }
    }
  }, [selectedActivity, API, t, language]);

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
      <div className="p-6 space-y-6 bg-gradient-to-br from-white/80 to-orange-50/80 dark:from-neutral-800/80 dark:to-neutral-900/80 backdrop-blur-sm min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-orange-200/50 dark:bg-orange-700/50 rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-orange-200/50 dark:bg-orange-700/50 rounded"></div>
          <div className="h-32 bg-orange-200/50 dark:bg-orange-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 fade-in bg-gradient-to-br from-white/80 to-orange-50/80 dark:from-neutral-800/80 dark:to-neutral-900/80 backdrop-blur-sm min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-orange-100 mb-2">
            {t[language].dashboard}
          </h1>
          <p className="text-gray-600 dark:text-orange-200">
            {new Date().toLocaleDateString('pt-PT', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Attendance Count */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2" />
              Número Total de Presenças
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{totalAttendanceCount}</div>
              <p className="text-sm text-gray-500">presenças hoje</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance by Modality */}
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2" />
              Presenças por Modalidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(attendanceByModality).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(attendanceByModality).map(([modality, count]) => (
                  <div key={modality} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{modality}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {count} {count === 1 ? 'presença' : 'presenças'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">Nenhuma modalidade registada hoje</p>
            )}
          </CardContent>
        </Card>
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
                  onChange={(value) => {
                    console.log('🏃‍♂️ Activity selected:', value);
                    setSelectedActivity(value);
                  }}
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
                          onClick={() => {
                            console.log('🖱️ Button clicked for member:', member.id);
                            console.log('🖱️ Selected activity at click:', selectedActivity);
                            handleQuickCheckin(member.id);
                          }}
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

      {/* Today's Attendance - moved up as requested */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2" />
            {t[language].todayAttendanceList}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium text-gray-600 text-sm">Nome</th>
                    <th className="text-left p-2 font-medium text-gray-600 text-sm">Status</th>
                    <th className="text-left p-2 font-medium text-gray-600 text-sm">Modalidade</th>
                    <th className="text-left p-2 font-medium text-gray-600 text-sm">Hora do Check in</th>
                    <th className="text-left p-2 font-medium text-gray-600 text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {todayAttendance.map((attendance) => {
                    const member = attendance.member;
                    const memberStatus = member?.status || 'inactive';
                    const isActive = memberStatus === 'active';
                    
                    return (
                      <tr key={attendance.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          <p className="font-medium text-sm">{member?.name || 'Membro eliminado'}</p>
                        </td>
                        <td className="p-2">
                          <Badge className={isActive ? "bg-green-100 text-green-800 text-xs" : "bg-red-100 text-red-800 text-xs"}>
                            {isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            {member?.activity || 'N/A'}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <p className="text-sm text-gray-600">
                            {new Date(attendance.check_in_time).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAttendance(attendance.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              {t[language].noAttendance}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Member Details Panel - shown after check-in */}
      {lastCheckedInMember && (
        <Card className="card-shadow border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2" />
              {t[language].memberDetails}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Top Row - Member Info */}
              <div className="text-center pb-4 border-b">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <UserCheck size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-semibold">{lastCheckedInMember.name}</h3>
                <p className="text-sm text-gray-500 mb-2">#{lastCheckedInMember.member_number}</p>
                
                <div className="flex justify-center space-x-6 mt-3">
                  <div className="text-center">
                    <label className="text-xs font-medium text-gray-500">{t[language].memberStatus}</label>
                    <p className="text-sm font-medium text-green-600 capitalize">{lastCheckedInMember.status}</p>
                  </div>
                  
                  <div className="text-center">
                    <label className="text-xs font-medium text-gray-500">{t[language].subscriptionPlan}</label>
                    <p className="text-sm font-medium capitalize">{lastCheckedInMember.membership_type}</p>
                  </div>
                </div>
                
                {/* Cancel Check-in Button */}
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelLastCheckin}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    ❌ {t[language].cancelLastCheckin}
                  </Button>
                </div>
              </div>
              
              {/* Calendar and Notes Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Calendar */}
                <div className="flex flex-col items-center">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">{t[language].attendanceCalendar}</h4>
                  <SimpleMemberCalendar 
                    attendanceDates={lastCheckedInMember.attendanceDates || []}
                    currentMonth={new Date()}
                  />
                </div>
                
                {/* Notes Section */}
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-gray-500">{t[language].notes}</label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingNotes(!editingNotes)}
                    >
                      <Edit3 size={14} />
                    </Button>
                  </div>
                  
                  <div className="bg-white rounded-lg p-3 border border-gray-200 flex-1" style={{minHeight: '160px'}}>
                    {editingNotes ? (
                      <div className="h-full flex flex-col">
                        <Textarea
                          value={memberNotes}
                          onChange={(e) => setMemberNotes(e.target.value)}
                          placeholder="Adicionar notas..."
                          className="flex-1 resize-none text-sm"
                          style={{minHeight: '120px'}}
                        />
                        <Button size="sm" onClick={handleSaveMemberNotes} className="mt-2">
                          <Save size={14} className="mr-1" />
                          {t[language].saveNotes}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 h-full overflow-y-auto">
                        {memberNotes || 'Sem notas...'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Medical Notes Section as Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">{t[language].medicalNotes}</label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingMedical(!editingMedical)}
                  >
                    <Heart size={14} />
                  </Button>
                </div>
                
                {editingMedical ? (
                  <div className="space-y-2">
                    <Textarea
                      value={memberMedicalNotes}
                      onChange={(e) => setMemberMedicalNotes(e.target.value)}
                      placeholder="Informações médicas..."
                      rows={3}
                    />
                    <Button size="sm" onClick={handleSaveMemberNotes}>
                      <Save size={14} className="mr-1" />
                      {t[language].saveNotes}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 bg-red-50 p-2 rounded border border-red-200">
                    {memberMedicalNotes || 'Sem informações médicas...'}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
