import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import MemberAttendanceCalendar from '../components/MemberAttendanceCalendar';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  DollarSign, 
  TrendingUp,
  Plus,
  Search,
  QrCode,
  Activity,
  StickyNote,
  Save,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

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
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberNotes, setMemberNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [checkinChoiceMember, setCheckinChoiceMember] = useState(null);
  const [experimentalAberta, setExperimentalAberta] = useState(false);
  const [aRegistarExperimental, setARegistarExperimental] = useState(false);
  const [experimentaisHoje, setExperimentaisHoje] = useState(0);
  const [presencasMes, setPresencasMes] = useState({ total: 0, media: '0.0' });
  const [loading, setLoading] = useState(true);
  const [checkinMemberId, setCheckinMemberId] = useState('');
  const [qrMode, setQrMode] = useState(false);
  const [nfcMode, setNfcMode] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [cardReaderValue, setCardReaderValue] = useState('');
  const cardReaderInputRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [unrecognizedTag, setUnrecognizedTag] = useState('');
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState({ birthdays_today: [], birthdays_upcoming: [], insurance_due_today: [], insurance_upcoming: [] });

  const t = {
    pt: {
      dashboard: 'Painel Principal',
      overview: 'Visão Geral',
      totalMembers: 'Total de Membros',
      activeMembers: 'Membros Ativos',
      todayAttendance: 'Presenças Hoje',
      monthAttendance: 'Presenças do Mês',
      dailyAverage: 'Média Diária',
      monthlyRevenue: 'Receita Mensal',
      attendanceByModality: 'Presenças por Modalidade',
      quickCheckin: 'Check-in Rápido',
      searchMember: 'Procurar membro...',
      checkinSuccess: 'Check-in realizado com sucesso!',
      memberNotFound: 'Membro não encontrado',
      todayAttendanceList: 'Presenças de Hoje',
      selectMemberHint: 'Seleciona uma presença para veres o calendário e as notas do membro',
      backToAttendance: 'Voltar às presenças',
      trialClass: 'Aula Experimental',
      trialHint: 'Escolhe a modalidade que a pessoa veio experimentar. Fica contada nos relatórios.',
      trialToday: 'aula experimental hoje',
      trialsToday: 'aulas experimentais hoje',
      memberNotes: 'Notas do Membro',
      notesPlaceholder: 'Escreve aqui as notas deste membro...',
      saveNotes: 'Guardar Notas',
      notesSaved: 'Notas guardadas com sucesso!',
      notesError: 'Erro ao guardar as notas',
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
      monthAttendance: 'Attendance This Month',
      dailyAverage: 'Daily Average',
      monthlyRevenue: 'Monthly Revenue',
      attendanceByModality: 'Attendance by Modality',
      quickCheckin: 'Quick Check-in',
      searchMember: 'Search member...',
      checkinSuccess: 'Check-in successful!',
      memberNotFound: 'Member not found',
      todayAttendanceList: "Today's Attendance",
      selectMemberHint: "Select an attendance to see the member's calendar and notes",
      backToAttendance: 'Back to attendance',
      trialClass: 'Trial Class',
      trialHint: 'Pick the activity the visitor came to try. It is counted in the reports.',
      trialToday: 'trial class today',
      trialsToday: 'trial classes today',
      memberNotes: 'Member Notes',
      notesPlaceholder: "Write this member's notes here...",
      saveNotes: 'Save Notes',
      notesSaved: 'Notes saved successfully!',
      notesError: 'Error saving notes',
      noAttendance: 'No attendance recorded today',
      qrCheckin: 'QR Check-in',
      manualCheckin: 'Manual Check-in',
      selectMember: 'Select member',
      checkin: 'Check-in'
    }
  };

  useEffect(() => {
    fetchDashboardData();
    carregarExperimentaisHoje();
    carregarPresencasDoMes();
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get(`${API}/dashboard/alerts`);
        setAlerts(response.data);
      } catch (error) {
        console.error('Error fetching dashboard alerts:', error);
      }
    };
    fetchAlerts();
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

      // Fetch activities (for modality breakdown)
      const activitiesResponse = await axios.get(`${API}/activities`);
      setActivities(activitiesResponse.data);
      
      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      // Use tomorrow as the upper bound because check_in_date is stored as a full
      // ISO datetime (YYYY-MM-DDT00:00:00+00:00); comparing with end_date=today as a
      // plain date string would exclude every record via string comparison.
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];
      // Um pedido para as presenças e outro para os sócios, em vez de um
      // pedido por cada presença
      const [attendanceResponse, membrosResponse] = await Promise.all([
        axios.get(`${API}/attendance?start_date=${today}&end_date=${tomorrow}`),
        axios.get(`${API}/members`)
      ]);

      const porId = new Map(membrosResponse.data.map((m) => [m.id, m]));

      const attendanceWithMembers = attendanceResponse.data.map((att) => ({
        ...att,
        member: porId.get(att.member_id) || {
          name: 'Membro eliminado',
          id: att.member_id,
          member_number: 'N/A',
          phone: 'N/A'
        }
      }));
      
      setTodayAttendance(attendanceWithMembers);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do painel');
    } finally {
      setLoading(false);
    }
  };

  const carregarPresencasDoMes = async () => {
    try {
      const hoje = new Date();
      const iso = (d) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      // Primeiro dia do mes seguinte: evita datas invalidas como 31 de setembro
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);

      const response = await axios.get(`${API}/attendance?start_date=${iso(inicio)}&end_date=${iso(fim)}`);
      const diasDoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      setPresencasMes({
        total: response.data.length,
        media: (response.data.length / diasDoMes).toFixed(1)
      });
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
    }
  };

  const carregarExperimentaisHoje = async () => {
    try {
      const hoje = new Date();
      const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      const response = await axios.get(`${API}/trials?start_date=${iso}&end_date=${iso}`);
      setExperimentaisHoje(response.data.length);
    } catch (error) {
      console.error('Error fetching trials:', error);
    }
  };

  const registarExperimental = async (activity) => {
    try {
      setARegistarExperimental(true);
      await axios.post(`${API}/trials`, { activity_id: activity.id });
      toast.success(`Aula experimental de ${activity.name} registada!`);
      carregarExperimentaisHoje();
    } catch (error) {
      console.error('Error registering trial:', error);
      toast.error(error.response?.data?.detail || 'Erro ao registar a aula experimental');
    } finally {
      setARegistarExperimental(false);
    }
  };

  const loadMemberProfile = async (memberId) => {
    try {
      // Fetch the full record so the notes shown are always the stored ones
      const response = await axios.get(`${API}/members/${memberId}`);
      setSelectedMember(response.data);
      setMemberNotes(response.data.notes || '');
    } catch (error) {
      console.error('Error fetching member:', error);
      toast.error('Erro ao carregar dados do membro');
    }
  };

  const handleSelectAttendanceMember = async (member) => {
    if (!member?.id || member.name === 'Membro eliminado') return;
    if (selectedMember?.id === member.id) {
      setSelectedMember(null);
      setMemberNotes('');
      return;
    }
    await loadMemberProfile(member.id);
  };

  const handleSaveNotes = async () => {
    if (!selectedMember) return;
    try {
      setSavingNotes(true);
      // The API replaces the whole member payload, so resend every field
      await axios.put(`${API}/members/${selectedMember.id}`, {
        name: selectedMember.name,
        email: selectedMember.email || null,
        phone: selectedMember.phone,
        date_of_birth: selectedMember.date_of_birth,
        nationality: selectedMember.nationality,
        profession: selectedMember.profession,
        address: selectedMember.address,
        membership_type: selectedMember.membership_type,
        photo_url: selectedMember.photo_url || null,
        activity_id: selectedMember.activity_id || null,
        activity_ids: selectedMember.activity_ids || [],
        notes: memberNotes
      });
      setSelectedMember({ ...selectedMember, notes: memberNotes });
      toast.success(t[language].notesSaved);
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error(t[language].notesError);
    } finally {
      setSavingNotes(false);
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

  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      toast.error('Leitura NFC nao suportada neste dispositivo/navegador. Usa um telemovel Android com Chrome, ou aguarda a App Movel.');
      return;
    }
    try {
      setNfcScanning(true);
      const ndef = new window.NDEFReader();
      await ndef.scan();
      ndef.onreading = async (event) => {
        const tagId = event.serialNumber;
        setNfcScanning(false);
        handleCardCheckin(tagId);
      };
      ndef.onreadingerror = () => {
        toast.error('Erro ao ler o cartao NFC. Tenta novamente.');
        setNfcScanning(false);
      };
    } catch (error) {
      console.error('Error starting NFC scan:', error);
      toast.error('Nao foi possivel iniciar a leitura NFC');
      setNfcScanning(false);
    }
  };

  const handleCardCheckin = async (tagId) => {
    const cleanTagId = (tagId || '').trim();
    if (!cleanTagId) return;
    try {
      const response = await axios.post(`${API}/checkin/nfc`, { tag_id: cleanTagId });
      toast.success('Check-in por cartao realizado com sucesso!');
      setUnrecognizedTag('');

      if (response.data?.member?.id) {
        await loadMemberProfile(response.data.member.id);
      }

      fetchDashboardData();
    } catch (error) {
      console.error('Error on card checkin:', error);
      if (error.response?.status === 404) {
        setUnrecognizedTag(cleanTagId);
        toast.error('Cartao nao reconhecido. Associa-o a um membro abaixo.');
      } else {
        toast.error(error.response?.data?.detail || 'Erro no check-in por cartao');
      }
    } finally {
      setCardReaderValue('');
      if (cardReaderInputRef.current) {
        cardReaderInputRef.current.focus();
      }
    }
  };

  const handleCardReaderKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCardCheckin(cardReaderValue);
    }
  };

  const handleAssignAndCheckin = async (memberId) => {
    if (!unrecognizedTag) return;
    try {
      await axios.put(`${API}/members/${memberId}/nfc`, { nfc_tag_id: unrecognizedTag });
      const response = await axios.post(`${API}/checkin/nfc`, { tag_id: unrecognizedTag });
      toast.success('Cartao associado e check-in realizado com sucesso!');
      if (response.data?.member?.id) {
        await loadMemberProfile(response.data.member.id);
      }
      setUnrecognizedTag('');
      setSearchTerm('');
      setFilteredMembers([]);
      fetchDashboardData();
    } catch (error) {
      console.error('Error assigning tag:', error);
      toast.error(error.response?.data?.detail || 'Erro ao associar cartao');
    }
  };

  const estadoQuota = (member) => {
    const estado = member?.membership_status || member?.status;
    const ate = member?.membership_valid_until
      ? new Date(member.membership_valid_until).toLocaleDateString('pt-PT')
      : null;
    if (estado === 'suspended') return { texto: 'SUSPENSO', cor: '#dc2626', detalhe: null };
    if (estado === 'inactive') {
      return { texto: 'INATIVO', cor: '#dc2626', detalhe: ate ? `Quota expirou em ${ate}` : 'Sem quota registada' };
    }
    return { texto: 'ATIVO', cor: '#16a34a', detalhe: ate ? `Quota paga até ${ate}` : null };
  };

  const getMemberActivityIds = (member) => {
    if (member?.activity_ids?.length) return member.activity_ids;
    return member?.activity_id ? [member.activity_id] : [];
  };

  const handleQuickCheckin = async (member, activityId = null) => {
    const memberActivities = getMemberActivityIds(member);

    if (!member || memberActivities.length === 0) {
      toast.error('Este membro nao tem modalidade definida. Edita a ficha do membro em Membros.');
      return;
    }

    // With several modalities subscribed, the staff picks the one being attended
    if (!activityId && memberActivities.length > 1) {
      setCheckinChoiceMember(member);
      return;
    }

    const chosenActivity = activityId || memberActivities[0];

    try {
      await axios.post(`${API}/attendance`, {
        member_id: member.id,
        activity_id: chosenActivity,
        method: 'manual'
      });

      setCheckinChoiceMember(null);

      toast.success(t[language].checkinSuccess);
      setCheckinMemberId('');
      setSearchTerm('');
      setFilteredMembers([]);

      // Show the profile of whoever just checked in, in place of the list
      await loadMemberProfile(member.id);

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

  const getAttendanceByModality = () => {
    const counts = {};
    todayAttendance.forEach((att) => {
      const id = att.activity_id;
      if (!id) return;
      counts[id] = (counts[id] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => {
        const activity = activities.find((a) => a.id === id);
        return {
          id,
          name: activity ? activity.name : 'Outra',
          color: activity ? activity.color : '#9CA3AF',
          count
        };
      })
      .sort((a, b) => b.count - a.count);
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card 
      className="transition-all duration-200 hover:transform hover:-translate-y-1"
      style={{ 
        background: 'var(--gradient-card-bg)',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border-light)'
      }}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{title}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
            {trend && (
              <div className="flex items-center mt-2">
                <TrendingUp size={16} className="mr-1" style={{ color: 'var(--ko-success)' }} />
                <span className="text-sm" style={{ color: 'var(--ko-success)' }}>+{trend}%</span>
              </div>
            )}
          </div>
          <div 
            className="p-3 rounded-full"
            style={{ background: color === 'ko-primary' ? 'var(--gradient-primary)' : 
                      color === 'ko-success' ? 'var(--ko-success)' :
                      color === 'ko-golden' ? 'var(--gradient-golden)' :
                      color === 'ko-amber' ? 'var(--gradient-golden)' :
                      'var(--gradient-primary)' }}
          >
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
    <div className="min-h-screen">
      <div className="p-6 space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 ko-text-primary">
              {t[language].dashboard}
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
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
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isAdmin() ? 'xl:grid-cols-6' : 'xl:grid-cols-5'} gap-6`}>
        <StatCard
          title={t[language].totalMembers}
          value={stats.total_members}
          icon={Users}
          color="ko-primary"
        />
        <StatCard
          title={t[language].activeMembers}
          value={stats.active_members}
          icon={UserCheck}
          color="ko-success"
        />
        <StatCard
          title={t[language].todayAttendance}
          value={todayAttendance.length}
          icon={Calendar}
          color="ko-golden"
        />
        <StatCard
          title={t[language].monthAttendance}
          value={presencasMes.total}
          icon={Activity}
          color="ko-primary"
        />
        <StatCard
          title={t[language].dailyAverage}
          value={presencasMes.media}
          icon={TrendingUp}
          color="ko-amber"
        />
        {isAdmin() && (
        <Card
          className="transition-all duration-200 hover:transform hover:-translate-y-1"
          style={{
            background: 'var(--gradient-card-bg)',
            boxShadow: 'var(--shadow-md)',
            border: '1px solid var(--border-light)'
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t[language].attendanceByModality}</p>
              <div className="p-2 rounded-full" style={{ background: 'var(--gradient-golden)' }}>
                <Activity size={16} className="text-white" />
              </div>
            </div>
            {getAttendanceByModality().length > 0 ? (
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {getAttendanceByModality().map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <span style={{ color: 'var(--text-primary)' }}>{m.name}</span>
                    </div>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{m.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t[language].noAttendance}</p>
            )}
          </CardContent>
        </Card>
      )}
      </div>

      {(alerts.birthdays_today.length > 0 || alerts.insurance_due_today.length > 0 || alerts.birthdays_upcoming.length > 0 || alerts.insurance_upcoming.length > 0) && (
        <div className="space-y-3">
          {alerts.birthdays_today.length > 0 && (
            <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fdba74' }}>
              <span className="text-2xl">🎂</span>
              <div>
                <p className="font-semibold" style={{ color: '#c2410c' }}>Aniversário hoje!</p>
                <p className="text-sm" style={{ color: '#9a3412' }}>
                  {alerts.birthdays_today.map((b) => `${b.name} (${b.age} anos)`).join(', ')}
                </p>
              </div>
            </div>
          )}
          {alerts.insurance_due_today.length > 0 && (
            <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #fff7ed, #ffedd5)', border: '1px solid #fb923c' }}>
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="font-semibold" style={{ color: '#c2410c' }}>Renovação de seguro necessária</p>
                <p className="text-sm" style={{ color: '#9a3412' }}>
                  {alerts.insurance_due_today.map((i) => {
                    if (i.expired) {
                      const dias = Math.abs(i.days_until);
                      return `${i.name}: seguro expirado há ${dias} dia(s)`;
                    }
                    if (i.paid) return `${i.name}: seguro termina hoje`;
                    return `${i.name} completa ${i.years} ano(s) de inscrição hoje`;
                  }).join(', ')}
                </p>
              </div>
            </div>
          )}
          {alerts.birthdays_upcoming.length > 0 && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--gradient-card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
              🎈 Próximos aniversários: {alerts.birthdays_upcoming.map((b) => `${b.name} (${new Date(b.date).toLocaleDateString('pt-PT')})`).join(', ')}
            </div>
          )}
          {alerts.insurance_upcoming.length > 0 && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'var(--gradient-card-bg)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
              📋 Seguros a renovar em breve: {alerts.insurance_upcoming.map((i) => `${i.name} (${new Date(i.date).toLocaleDateString('pt-PT')})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Quick Check-in Section */}
      <Card 
        style={{ 
          background: 'var(--gradient-card-bg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)'
        }}
      >
        <CardHeader>
          <CardTitle className="flex items-center" style={{ color: 'var(--text-primary)' }}>
            <UserCheck className="mr-2 ko-text-primary" />
            {t[language].quickCheckin}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant={!qrMode ? "default" : "outline"}
              onClick={() => { setQrMode(false); setNfcMode(false); }}
              className="ko-hover-primary transition-all duration-200"
              style={{ 
                backgroundColor: !qrMode ? 'var(--button-primary-bg)' : 'transparent',
                borderColor: 'var(--ko-primary-orange)',
                color: !qrMode ? 'white' : 'var(--ko-primary-orange)'
              }}
              data-testid="manual-checkin-btn"
            >
              <Users className="mr-2" size={16} />
              {t[language].manualCheckin}
            </Button>
            <Button
              variant={qrMode ? "default" : "outline"}
              onClick={() => { setQrMode(true); setNfcMode(false); }}
              className="ko-hover-primary transition-all duration-200"
              style={{ 
                backgroundColor: qrMode ? 'var(--button-primary-bg)' : 'transparent',
                borderColor: 'var(--ko-primary-orange)',
                color: qrMode ? 'white' : 'var(--ko-primary-orange)'
              }}
              data-testid="qr-checkin-btn"
            >
              <QrCode className="mr-2" size={16} />
              {t[language].qrCheckin}
            </Button>
          <Button
            variant={nfcMode ? "default" : "outline"}
            onClick={() => { setNfcMode(true); }}
            className="ko-hover-primary transition-all duration-200"
            style={{
              backgroundColor: nfcMode ? 'var(--button-primary-bg)' : 'transparent',
              borderColor: 'var(--ko-primary-orange)',
              color: nfcMode ? 'white' : 'var(--ko-primary-orange)'
            }}
            data-testid="nfc-checkin-btn"
          >
            <Activity className="mr-2" size={16} />
            Check-in NFC
          </Button>

          <Button
            variant="outline"
            onClick={() => setExperimentalAberta(!experimentalAberta)}
            className="transition-all duration-200"
            style={{
              backgroundColor: experimentalAberta ? '#7c3aed' : 'transparent',
              borderColor: '#7c3aed',
              color: experimentalAberta ? 'white' : '#7c3aed'
            }}
            data-testid="aula-experimental-btn"
          >
            <Sparkles className="mr-2" size={16} />
            {t[language].trialClass}
          </Button>
          </div>

          {/* Aula experimental: um clique na modalidade e fica contada */}
          {experimentalAberta && (
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'var(--background-elevated)', border: '1px solid #7c3aed' }}
            >
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t[language].trialHint}
              </p>
              <div className="flex flex-wrap gap-2">
                {activities.map((a) => (
                  <Button
                    key={a.id}
                    variant="outline"
                    disabled={aRegistarExperimental}
                    onClick={() => registarExperimental(a)}
                    style={{ borderColor: a.color, color: a.color }}
                    data-testid={`trial-${a.id}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: a.color }}
                    />
                    {a.name}
                  </Button>
                ))}
              </div>
              {experimentaisHoje > 0 && (
                <p className="text-sm font-medium" style={{ color: '#7c3aed' }}>
                  {experimentaisHoje} {experimentaisHoje === 1 ? t[language].trialToday : t[language].trialsToday}
                </p>
              )}
            </div>
          )}

        {nfcMode ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
            <Activity className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={48} />
            <p style={{ color: 'var(--text-secondary)' }}>
              {nfcScanning ? 'A aguardar leitura do cartao NFC...' : 'Aproxime o cartao/pulseira NFC do membro'}
            </p>
            <div className="max-w-xs mx-auto text-left">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Leitor Bluetooth/USB (emulacao de teclado)
              </label>
              <Input
                ref={cardReaderInputRef}
                type="text"
                autoFocus
                value={cardReaderValue}
                onChange={(e) => setCardReaderValue(e.target.value)}
                onKeyDown={handleCardReaderKeyDown}
                placeholder="Clique aqui e aproxime o cartao"
                style={{
                  background: 'var(--gradient-input)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Funciona com leitores NFC/RFID Bluetooth ou USB em modo teclado (HID). Clica no campo e aproxima o cartao.
              </p>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ou</p>
            <Button onClick={handleNfcScan} disabled={nfcScanning}>
              {nfcScanning ? 'A ler...' : 'Usar NFC do telemovel (Android + Chrome)'}
            </Button>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Requer telemovel/tablet Android com NFC e Chrome, ou leitor USB compativel. Funcionalidade completa chegara com a App Movel.
            </p>

            {unrecognizedTag && (
              <div className="max-w-xs mx-auto text-left rounded-lg p-3 space-y-2" style={{ border: '1px dashed var(--border-medium)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Cartao desconhecido. Associar a um membro:
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                  <Input
                    placeholder="Procurar por nome, telefone ou numero de socio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {filteredMembers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded" style={{ border: '1px solid var(--border-light)' }}>
                    {filteredMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-2 border-b last:border-b-0" style={{ borderColor: 'var(--border-light)' }}>
                        <span className="text-sm">{member.name}</span>
                        <Button size="sm" onClick={() => handleAssignAndCheckin(member.id)}>Associar</Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => { setUnrecognizedTag(''); setSearchTerm(''); setFilteredMembers([]); }}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        ) : !qrMode ? (
            <div className="space-y-4">
              
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                <Input
                  placeholder="Procurar por nome, telefone ou nº sócio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 transition-all duration-200"
                  style={{
                    background: 'var(--gradient-input)',
                    borderColor: 'var(--border-medium)',
                    color: 'var(--text-primary)'
                  }}
                  data-testid="member-search"
                />
              </div>
              
              {filteredMembers.length > 0 && (
                <div 
                  className="rounded-lg max-h-64 overflow-y-auto"
                  style={{ 
                    border: '1px solid var(--border-medium)',
                    background: 'var(--background-elevated)'
                  }}
                >
                  {filteredMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border-b last:border-b-0 transition-all duration-200 cursor-pointer"
                      style={{ borderColor: 'var(--border-light)' }}
                      onMouseEnter={(e) => e.target.style.background = 'var(--gradient-hover)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{member.name}</p>
                          <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                            #{member.member_number}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{member.phone}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          style={{ borderColor: estadoQuota(member).cor, color: estadoQuota(member).cor }}
                          title={estadoQuota(member).detalhe || ''}
                        >
                          {estadoQuota(member).texto}
                        </Badge>
                        <Button
                          size="sm"
                          onClick={() => handleQuickCheckin(member)}
                          className="btn-hover"
                          data-testid={`checkin-${member.id}`}
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
            <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <QrCode size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">Funcionalidade QR em desenvolvimento</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Será implementada na app móvel</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modality picker, shown when the member subscribes to more than one */}
      {checkinChoiceMember && (
        <Card className="card-shadow" style={{ border: '1px solid var(--ko-primary-orange)' }}>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <Activity className="mr-2" size={18} />
              Modalidade do check-in — {checkinChoiceMember.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Este membro tem varias modalidades. Escolhe a modalidade desta presenca:
            </p>
            <div className="flex flex-wrap gap-2">
              {getMemberActivityIds(checkinChoiceMember).map((id) => {
                const activity = activities.find((a) => a.id === id);
                return (
                  <Button
                    key={id}
                    variant="outline"
                    onClick={() => handleQuickCheckin(checkinChoiceMember, id)}
                    style={{ borderColor: activity?.color, color: activity?.color }}
                    data-testid={`checkin-activity-${id}`}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: activity?.color || '#9CA3AF' }}
                    />
                    {activity ? activity.name : 'Modalidade'}
                  </Button>
                );
              })}
              <Button variant="ghost" onClick={() => setCheckinChoiceMember(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's attendance, replaced by the member profile once one is picked */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="mr-2" />
              {selectedMember ? `Perfil de ${selectedMember.name}` : t[language].todayAttendanceList}
            </span>
            {selectedMember && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedMember(null); setMemberNotes(''); }}
                data-testid="back-to-attendance"
              >
                <ArrowLeft className="mr-2" size={16} />
                {t[language].backToAttendance}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedMember ? (
            <div className="space-y-6">
              {/* Short profile summary */}
              <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg" style={{ background: 'var(--background-elevated)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}>
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedMember.name}</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      N.º {selectedMember.member_number} · {selectedMember.phone}
                    </p>
                    {estadoQuota(selectedMember).detalhe && (
                      <p className="text-sm font-medium" style={{ color: estadoQuota(selectedMember).cor }}>
                        {estadoQuota(selectedMember).detalhe}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="text-sm px-3 py-1"
                    variant="outline"
                    style={{ borderColor: estadoQuota(selectedMember).cor, color: estadoQuota(selectedMember).cor }}
                  >
                    {estadoQuota(selectedMember).texto}
                  </Badge>
                  <Badge variant="outline">{selectedMember.membership_type}</Badge>
                  {getMemberActivityIds(selectedMember).map((id) => {
                    const activity = activities.find((a) => a.id === id);
                    if (!activity) return null;
                    return (
                      <Badge key={id} variant="outline" style={{ borderColor: activity.color, color: activity.color }}>
                        {activity.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MemberAttendanceCalendar
                  memberId={selectedMember.id}
                  language={language}
                />

                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <StickyNote className="mr-2" size={18} />
                      {t[language].memberNotes}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Textarea
                      value={memberNotes}
                      onChange={(e) => setMemberNotes(e.target.value)}
                      placeholder={t[language].notesPlaceholder}
                      rows={10}
                      data-testid="dashboard-member-notes"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                        className="btn-hover"
                        style={{ backgroundColor: 'var(--button-primary-bg)', color: 'white' }}
                        data-testid="save-member-notes"
                      >
                        <Save className="mr-2" size={16} />
                        {t[language].saveNotes}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : todayAttendance.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {[...todayAttendance]
                .sort((a, b) => new Date(b.check_in_time) - new Date(a.check_in_time))
                .map((attendance) => {
                const activity = activities.find((a) => a.id === attendance.activity_id);
                return (
                  <button
                    key={attendance.id}
                    type="button"
                    onClick={() => handleSelectAttendanceMember(attendance.member)}
                    className="flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200 hover:opacity-80"
                    style={{
                      background: 'var(--background-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-light)'
                    }}
                    data-testid={`attendance-${attendance.id}`}
                  >
                    <div>
                      <p className="font-medium">{attendance.member?.name}</p>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(attendance.check_in_time).toLocaleTimeString('pt-PT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        {activity ? ` · ${activity.name}` : ''}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: estadoQuota(attendance.member).cor,
                        color: estadoQuota(attendance.member).cor
                      }}
                      title={estadoQuota(attendance.member).detalhe || ''}
                    >
                      {estadoQuota(attendance.member).texto}
                    </Badge>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-6">
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
