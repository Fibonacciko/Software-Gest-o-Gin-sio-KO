import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Clock,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import ActivitySelector from '../components/ActivitySelector';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Attendance = ({ language, translations }) => {
  const [attendance, setAttendance] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // list or calendar
  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [activityFilter, setActivityFilter] = useState('all');

  const t = {
    pt: {
      attendance: 'Gestão de Presenças',
      attendanceList: 'Lista de Presenças',
      attendanceCalendar: 'Calendário de Presenças',
      todayAttendance: 'Presenças de Hoje',
      monthlyView: 'Vista Mensal',
      listView: 'Lista',
      calendarView: 'Calendário',
      selectDate: 'Selecionar Data',
      allMembers: 'Todos os Membros',
      searchMembers: 'Procurar membros...',
      memberName: 'Nome do Membro',
      checkInTime: 'Hora de Check-in',
      method: 'Método',
      date: 'Data',
      noAttendance: 'Nenhuma presença registada',
      manual: 'Manual',
      qrCode: 'QR Code',
      export: 'Exportar',
      attendanceStats: 'Estatísticas de Presença',
      totalAttendance: 'Total de Presenças',
      uniqueMembers: 'Membros Únicos',
      averageDaily: 'Média Diária',
      previousMonth: 'Mês Anterior',
      nextMonth: 'Próximo Mês',
      attendanceMarked: 'Presença com check-in'
    },
    en: {
      attendance: 'Attendance Management',
      attendanceList: 'Attendance List',
      attendanceCalendar: 'Attendance Calendar',
      todayAttendance: "Today's Attendance",
      monthlyView: 'Monthly View',
      listView: 'List',
      calendarView: 'Calendar',
      selectDate: 'Select Date',
      allMembers: 'All Members',
      searchMembers: 'Search members...',
      memberName: 'Member Name',
      checkInTime: 'Check-in Time',
      method: 'Method',
      date: 'Date',
      noAttendance: 'No attendance recorded',
      manual: 'Manual',
      qrCode: 'QR Code',
      export: 'Export',
      attendanceStats: 'Attendance Statistics',
      totalAttendance: 'Total Attendance',
      uniqueMembers: 'Unique Members',
      averageDaily: 'Daily Average',
      previousMonth: 'Previous Month',
      nextMonth: 'Next Month',
      attendanceMarked: 'Attendance marked'
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchAttendance();
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedMember]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchMonthlyAttendance();
    }
  }, [selectedDate, viewMode]);

  const fetchMembers = async () => {
    try {
      const response = await axios.get(`${API}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (viewMode === 'list') {
        const dateStr = selectedDate.toISOString().split('T')[0];
        params.append('start_date', dateStr);
        params.append('end_date', dateStr);
      }
      
      if (selectedMember !== 'all') {
        params.append('member_id', selectedMember);
      }
      
      if (activityFilter !== 'all') {
        params.append('activity_id', activityFilter);
      }
      
      const response = await axios.get(`${API}/attendance?${params}`);
      let attendanceData = response.data;
      
      // Get member details for each attendance
      const attendanceWithMembers = await Promise.all(
        attendanceData.map(async (att) => {
          try {
            const memberResponse = await axios.get(`${API}/members/${att.member_id}`);
            return {
              ...att,
              member: memberResponse.data
            };
          } catch (error) {
            return {
              ...att,
              member: { name: 'Membro não encontrado', id: att.member_id }
            };
          }
        })
      );
      
      // Filter by search term if provided
      if (searchTerm) {
        attendanceWithMembers = attendanceWithMembers.filter(att => 
          att.member.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setAttendance(attendanceWithMembers);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      toast.error('Erro ao carregar presenças');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      
      const response = await axios.get(`${API}/attendance?start_date=${year}-${month.toString().padStart(2, '0')}-01&end_date=${year}-${month.toString().padStart(2, '0')}-31`);
      
      // Group by date
      const grouped = response.data.reduce((acc, att) => {
        const date = att.check_in_date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(att);
        return acc;
      }, {});
      
      setMonthlyAttendance(grouped);
    } catch (error) {
      console.error('Error fetching monthly attendance:', error);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const exportAttendance = () => {
    const csvContent = [
      ['Data', 'Membro', 'Hora', 'Método'],
      ...attendance.map(att => [
        att.check_in_date,
        att.member.name,
        new Date(att.check_in_time).toLocaleTimeString('pt-PT'),
        att.method
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presencas_${selectedDate.toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const uniqueMembers = new Set(attendance.map(att => att.member_id)).size;
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const average = (total / daysInMonth).toFixed(1);
    
    return { total, uniqueMembers, average };
  };

  const stats = getAttendanceStats();

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].attendance}
        </h1>
        
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
            className="btn-hover"
            data-testid="list-view-btn"
          >
            {t[language].listView}
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'outline'}
            onClick={() => setViewMode('calendar')}
            className="btn-hover"
            data-testid="calendar-view-btn"
          >
            {t[language].calendarView}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].totalAttendance}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Users size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].uniqueMembers}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueMembers}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <CalendarIcon size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].averageDaily}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.average}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500">
                <Clock size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {viewMode === 'list' && (
              <div>
                <Input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  data-testid="date-selector"
                />
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t[language].searchMembers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="attendance-search"
              />
            </div>
            
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

      {/* Content */}
      {viewMode === 'list' ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2" />
              {t[language].attendanceList} - {selectedDate.toLocaleDateString('pt-PT')}
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={exportAttendance}
              className="btn-hover"
              data-testid="export-btn"
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
            ) : attendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium text-gray-600">
                        {t[language].memberName}
                      </th>
                      <th className="text-left p-4 font-medium text-gray-600">
                        {t[language].checkInTime}
                      </th>
                      <th className="text-left p-4 font-medium text-gray-600">
                        {t[language].method}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((att) => (
                      <tr key={att.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{att.member.name}</p>
                              <p className="text-sm text-gray-500">{att.member.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center">
                            <Clock size={16} className="text-gray-400 mr-2" />
                            {new Date(att.check_in_time).toLocaleTimeString('pt-PT', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant={att.method === 'manual' ? 'secondary' : 'default'}>
                            {t[language][att.method] || att.method}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarIcon size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">{t[language].noAttendance}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2" />
              {t[language].attendanceCalendar}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={handlePreviousMonth}
                size="sm"
                data-testid="prev-month-btn"
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="text-sm font-medium px-4">
                {selectedDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </span>
              <Button 
                variant="outline" 
                onClick={handleNextMonth}
                size="sm"
                data-testid="next-month-btn"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="attendance-calendar">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                className="rounded-md border w-full"
                modifiers={{
                  hasAttendance: (date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    return monthlyAttendance[dateStr] && monthlyAttendance[dateStr].length > 0;
                  }
                }}
                modifiersStyles={{
                  hasAttendance: {
                    backgroundColor: '#10b981',
                    color: 'white',
                    fontWeight: 'bold'
                  }
                }}
              />
            </div>
            
            {selectedDate && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">
                  {t[language].attendanceMarked} - {selectedDate.toLocaleDateString('pt-PT')}
                </h4>
                {monthlyAttendance[selectedDate.toISOString().split('T')[0]] ? (
                  <div className="space-y-2">
                    {monthlyAttendance[selectedDate.toISOString().split('T')[0]].map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="font-medium">{att.member?.name || 'Carregando...'}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(att.check_in_time).toLocaleTimeString('pt-PT')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    {t[language].noAttendance}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Attendance;
