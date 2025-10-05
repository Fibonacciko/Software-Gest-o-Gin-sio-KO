import React from 'react';

const SimpleMemberCalendar = ({ attendanceDates = [], currentMonth = new Date() }) => {
  // Generate calendar days for the current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hasAttendance = attendanceDates.includes(dateStr);
      const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
      days.push({ day, hasAttendance, dateStr, isToday });
    }
    
    return days;
  };

  const days = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('pt-PT', { 
    month: 'long', 
    year: 'numeric' 
  });

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <h4 className="text-sm font-medium text-gray-700 mb-3 text-center">
        {monthName}
      </h4>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-xs text-gray-500 text-center font-medium py-1">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((dayInfo, index) => (
          <div
            key={index}
            className="aspect-square flex items-center justify-center relative p-1"
          >
            {dayInfo ? (
              <div className="relative w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                <span className={`text-xs z-10 relative ${
                  dayInfo.isToday ? 'font-bold text-blue-600' : 'text-gray-700'
                }`}>
                  {dayInfo.day}
                </span>
                {dayInfo.hasAttendance && (
                  <div className="absolute inset-0 bg-yellow-400 rounded-full opacity-60 border-2 border-yellow-500"></div>
                )}
              </div>
            ) : (
              <div className="w-7 h-7"></div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-2 border-t border-gray-200">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2 border border-yellow-500"></div>
          Presença registada
        </div>
      </div>
    </div>
  );
};

export default SimpleMemberCalendar;