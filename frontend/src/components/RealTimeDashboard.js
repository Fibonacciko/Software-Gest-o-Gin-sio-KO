import React, { useEffect, useState } from 'react';
import useWebSocket from '../hooks/useWebSocket';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  Users, 
  UserCheck, 
  Radio, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

const RealTimeDashboard = ({ language, translations }) => {
  const { 
    isConnected, 
    dashboardStats, 
    attendanceEvents, 
    systemAlerts 
  } = useWebSocket();

  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (dashboardStats) {
      setLastUpdate(new Date());
    }
  }, [dashboardStats]);

  const formatTime = (date) => {
    return date ? date.toLocaleTimeString('pt-PT') : '--:--';
  };

  const formatCurrency = (amount) => {
    return `€${amount?.toFixed(2) || '0.00'}`;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-orange-100">
          Dashboard em Tempo Real
        </h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600 dark:text-orange-300">
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-500 dark:text-orange-400">
              Última atualização: {formatTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* Real-time Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-orange-200/30 dark:border-orange-700/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-orange-300">
                  Total de Membros
                </CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-orange-100">
                {dashboardStats.total_members}
              </div>
              <Badge variant="secondary" className="mt-1">
                Ativos
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-orange-200/30 dark:border-orange-700/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-orange-300">
                  Presenças Hoje
                </CardTitle>
                <UserCheck className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-orange-100">
                {dashboardStats.attendance_today}
              </div>
              <Badge variant="secondary" className="mt-1">
                Check-ins
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-orange-200/30 dark:border-orange-700/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-orange-300">
                  Ocupação Atual
                </CardTitle>
                <Radio className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-orange-100">
                {dashboardStats.current_occupancy}
              </div>
              <Badge 
                variant={dashboardStats.current_occupancy > 60 ? "destructive" : "secondary"} 
                className="mt-1"
              >
                {dashboardStats.current_occupancy > 60 ? 'Alto' : 'Normal'}
              </Badge>
            </CardContent>
          </Card>

          <Card className="border-orange-200/30 dark:border-orange-700/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-orange-300">
                  Receita Hoje
                </CardTitle>
                <DollarSign className="h-4 w-4 text-orange-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-orange-100">
                {formatCurrency(dashboardStats.revenue_today)}
              </div>
              <Badge variant="secondary" className="mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Hoje
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time Attendance Feed */}
        <Card className="border-orange-200/30 dark:border-orange-700/30">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-orange-100">
              <UserCheck className="h-5 w-5 mr-2 text-green-500" />
              Feed de Presenças ao Vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {attendanceEvents.length > 0 ? (
                attendanceEvents.map((event, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 bg-green-50/50 dark:bg-green-900/20 rounded-lg border border-green-200/30 dark:border-green-700/30"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-orange-100">
                          {event.member?.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-orange-300">
                          {event.activity?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">
                        Check-in
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-orange-400">
                        {new Date(event.timestamp).toLocaleTimeString('pt-PT')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-orange-400">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Aguardando presenças...</p>
                  {!isConnected && (
                    <p className="text-xs mt-1">Conecte-se para ver atualizações ao vivo</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Alerts */}
        <Card className="border-orange-200/30 dark:border-orange-700/30">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-orange-100">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Alertas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {systemAlerts.length > 0 ? (
                systemAlerts.map((alert, index) => {
                  const AlertIcon = alert.level === 'error' ? AlertTriangle : 
                                  alert.level === 'success' ? CheckCircle : 
                                  Clock;
                  const alertColor = alert.level === 'error' ? 'red' :
                                   alert.level === 'success' ? 'green' :
                                   'yellow';

                  return (
                    <div 
                      key={index}
                      className={`p-3 bg-${alertColor}-50/50 dark:bg-${alertColor}-900/20 rounded-lg border border-${alertColor}-200/30 dark:border-${alertColor}-700/30`}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertIcon className={`h-5 w-5 text-${alertColor}-500 mt-0.5`} />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-orange-100">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-orange-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString('pt-PT')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-orange-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Tudo funcionando normalmente</p>
                  <p className="text-xs mt-1">Nenhum alerta no momento</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status Debug (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-orange-200/30 dark:border-orange-700/30">
          <CardHeader>
            <CardTitle className="text-sm text-gray-600 dark:text-orange-300">
              Debug: Estado da Conexão WebSocket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs space-y-1 text-gray-500 dark:text-orange-400">
              <p>Conectado: {isConnected ? '✅' : '❌'}</p>
              <p>Última atualização: {lastUpdate ? lastUpdate.toLocaleString() : 'Nenhuma'}</p>
              <p>Eventos de presença: {attendanceEvents.length}</p>
              <p>Alertas do sistema: {systemAlerts.length}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RealTimeDashboard;