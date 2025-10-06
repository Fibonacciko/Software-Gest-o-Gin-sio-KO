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
    <div className="bg-white rounded-lg p-3 border border-gray-200" style={{minHeight: '160px', width: '100%'}}>
      <h4 className="text-xs font-medium text-gray-700 mb-2 text-center">
        {monthName}
      </h4>
      
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
          <div key={day} className="text-xs text-gray-500 text-center font-medium py-0.5">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((dayInfo, index) => (
          <div
            key={index}
            className="w-5 h-5 flex items-center justify-center relative"
          >
            {dayInfo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                {dayInfo.hasAttendance && (
                  <div className="absolute inset-0 w-full h-full rounded-full bg-yellow-400"></div>
                )}
                <span className={`text-xs z-10 relative font-bold ${
                  dayInfo.hasAttendance ? 'text-black' : 
                  dayInfo.isToday ? 'font-bold text-gray-800' : 'text-gray-700'
                }`}>
                  {dayInfo.day}
                </span>
              </div>
            ) : (
              <div className="w-full h-full"></div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-2 pt-1 border-t border-gray-200">
        <div className="flex items-center justify-center text-xs text-gray-500">
          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></div>
          Presença
        </div>
      </div>
    </div>
  );
};

export default SimpleMemberCalendar;