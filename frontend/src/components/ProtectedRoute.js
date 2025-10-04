import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading, hasAccess } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (requiredRole && !hasAccess(requiredRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">
            Não tens permissão para aceder a esta área.
          </p>
          <p className="text-sm text-gray-500">
            Contacta o administrador se precisas de acesso.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;