import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from './ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui/button';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MemberAttendanceCalendar = ({ memberId, language = 'pt' }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendance, setAttendance] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  const t = {
    pt: {
      attendanceCalendar: 'Calendário de Presenças',
      noAttendance: 'Nenhuma presença registada',
      attendanceOn: 'Presença em',
      activity: 'Modalidade',
      time: 'Hora'
    },
    en: {
      attendanceCalendar: 'Attendance Calendar',
      noAttendance: 'No attendance recorded',
      attendanceOn: 'Attendance on',
      activity: 'Activity',
      time: 'Time'
    }
  };

  useEffect(() => {
    if (memberId) {
      fetchActivities();
      fetchAttendance();
    }
  }, [memberId, selectedDate]);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth() + 1;
      
      const response = await axios.get(
        `${API}/members/${memberId}/attendance?month=${month}&year=${year}`
      );
      setAttendance(response.data);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityColor = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.color : '#gray';
  };

  const getActivityName = (activityId) => {
    const activity = activities.find(a => a.id === activityId);
    return activity ? activity.name : 'Unknown';
  };

  const getAttendanceForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return attendance.filter(att => att.check_in_date === dateStr);
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

  // Create modifiers for the calendar
  const attendanceDates = attendance.reduce((acc, att) => {
    const date = new Date(att.check_in_date + 'T00:00:00');
    const activityColor = getActivityColor(att.activity_id);
    acc[att.check_in_date] = { date, color: activityColor };
    return acc;
  }, {});

  const modifiers = {
    hasAttendance: Object.values(attendanceDates).map(item => item.date)
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <CalendarIcon className="mr-2" size={20} />
            {t[language].attendanceCalendar}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handlePreviousMonth}
              size="sm"
            >
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {selectedDate.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
            </span>
            <Button 
              variant="outline" 
              onClick={handleNextMonth}
              size="sm"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={selectedDate}
              className="rounded-md border w-full"
              modifiers={modifiers}
              components={{
                Day: ({ date, modifiers }) => {
                  const attendanceForDate = getAttendanceForDate(date);
                  const hasAttendance = attendanceForDate.length > 0;
                  
                  return (
                    <div className="relative w-full h-full">
                      <div className={`w-full h-full flex items-center justify-center text-sm ${
                        modifiers.selected ? 'bg-blue-600 text-white rounded-md' :
                        modifiers.today ? 'bg-blue-100 text-blue-900 rounded-md' : ''
                      }`}>
                        {date.getDate()}
                        {hasAttendance && (
                          <div 
                            className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
                            style={{ backgroundColor: getActivityColor(attendanceForDate[0].activity_id) }}
                            title={`${getActivityName(attendanceForDate[0].activity_id)} - ${new Date(attendanceForDate[0].check_in_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                }
              }}
            />
            
            {/* Selected Date Details */}
            {selectedDate && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium mb-3">
                  {t[language].attendanceOn} {selectedDate.toLocaleDateString('pt-PT')}
                </h4>
                
                {(() => {
                  const dayAttendance = getAttendanceForDate(selectedDate);
                  
                  if (dayAttendance.length === 0) {
                    return (
                      <p className="text-gray-500 text-sm italic">
                        {t[language].noAttendance}
                      </p>
                    );
                  }
                  
                  return (
                    <div className="space-y-2">
                      {dayAttendance.map((att) => (
                        <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: getActivityColor(att.activity_id) }}
                            />
                            <div>
                              <p className="font-medium text-sm">{getActivityName(att.activity_id)}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(att.check_in_time).toLocaleTimeString('pt-PT', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {att.method}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MemberAttendanceCalendar;