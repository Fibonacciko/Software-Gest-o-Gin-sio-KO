import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Badge } from './ui/badge';
import { Loader2, Check } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MultiActivitySelector = ({ value = [], onChange }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${API}/activities`);
      setActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActivity = (activityId) => {
    if (value.includes(activityId)) {
      onChange(value.filter((id) => id !== activityId));
    } else {
      onChange([...value, activityId]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">A carregar modalidades...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="multi-activity-selector">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {activities.map((activity) => {
          const selected = value.includes(activity.id);
          return (
            <button
              key={activity.id}
              type="button"
              onClick={() => toggleActivity(activity.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition-all duration-200 ${
                selected ? 'font-medium' : 'hover:opacity-80'
              }`}
              style={{
                borderColor: selected ? activity.color : 'var(--border-light, #e5e7eb)',
                backgroundColor: selected ? `${activity.color}33` : 'transparent',
                color: 'var(--text-primary)'
              }}
              data-testid={`activity-option-${activity.id}`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: activity.color }}
              />
              <span className="flex-1 truncate">{activity.name}</span>
              {selected && <Check size={14} style={{ color: activity.color }} />}
            </button>
          );
        })}
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {value.map((id) => {
            const activity = activities.find((a) => a.id === id);
            if (!activity) return null;
            return (
              <Badge
                key={id}
                variant="outline"
                style={{ borderColor: activity.color, color: activity.color }}
              >
                {activity.name}
                {/* The first one is the modality used by NFC and quick check-in */}
                {id === value[0] && ' (principal)'}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiActivitySelector;
