import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Users, 
  Plus, 
  Search, 
  Shield,
  User
} from 'lucide-react';
import { Badge } from '../components/ui/badge';

const UserManagement = ({ language = 'pt' }) => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const t = {
    pt: {
      userManagement: 'Gestão de Utilizadores',
      addUser: 'Adicionar Utilizador',
      searchUsers: 'Procurar utilizadores...',
      admin: 'Administrador',
      staff: 'Staff',
      active: 'Ativo',
      inactive: 'Inativo',
      noUsers: 'Nenhum utilizador encontrado'
    }
  };

  const mockUsers = [
    { id: 1, username: 'admin', email: 'admin@kogym.com', role: 'admin', is_active: true },
    { id: 2, username: 'staff1', email: 'staff@kogym.com', role: 'staff', is_active: true }
  ];

  useEffect(() => {
    setUsers(mockUsers);
  }, []);

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-primary)' }}>
      <div className="p-6 space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-3xl font-bold mb-4 lg:mb-0 ko-text-primary">
            {t[language].userManagement}
          </h1>
          
          <Button 
            className="ko-hover-primary transition-all duration-200"
            style={{ backgroundColor: 'var(--button-primary-bg)', color: 'white' }}
            data-testid="add-user-btn"
          >
            <Plus className="mr-2" size={16} />
            {t[language].addUser}
          </Button>
        </div>

        {/* Search */}
        <Card style={{ 
          background: 'var(--gradient-card-bg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)'
        }}>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
              <Input
                placeholder={t[language].searchUsers}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 transition-all duration-200"
                style={{
                  background: 'var(--gradient-input)',
                  borderColor: 'var(--border-medium)',
                  color: 'var(--text-primary)'
                }}
                data-testid="users-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card style={{ 
          background: 'var(--gradient-card-bg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center" style={{ color: 'var(--text-primary)' }}>
              <Users className="mr-2 ko-text-primary" />
              {t[language].userManagement} ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                    style={{ border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>
                        {user.role === 'admin' ? 
                          <Shield size={16} className="ko-text-primary" /> : 
                          <User size={16} style={{ color: 'var(--text-secondary)' }} />}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {user.username}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={user.role === 'admin' ? 'ko-badge-primary' : 'ko-badge-golden'}
                      >
                        {t[language][user.role]}
                      </Badge>
                      
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? t[language].active : t[language].inactive}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>{t[language].noUsers}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;