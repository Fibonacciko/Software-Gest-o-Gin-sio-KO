import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Eye, 
  EyeOff,
  UserCheck,
  UserX,
  Shield,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = ({ language = 'pt' }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user: currentUser } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    role: 'staff'
  });

  const t = {
    pt: {
      userManagement: 'Gestão de Utilizadores',
      addUser: 'Adicionar Utilizador',
      searchUsers: 'Procurar utilizadores...',
      username: 'Nome de Utilizador',
      email: 'Email',
      fullName: 'Nome Completo',
      password: 'Password',
      role: 'Função',
      admin: 'Administrador',
      staff: 'Staff',
      status: 'Status',
      active: 'Ativo',
      inactive: 'Inativo',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      activate: 'Ativar',
      deactivate: 'Desativar',
      confirmDelete: 'Tem certeza que deseja eliminar este utilizador?',
      userAdded: 'Utilizador adicionado com sucesso!',
      userUpdated: 'Utilizador atualizado com sucesso!',
      userDeleted: 'Utilizador eliminado com sucesso!',
      userActivated: 'Utilizador ativado com sucesso!',
      userDeactivated: 'Utilizador desativado com sucesso!',
      noUsers: 'Nenhum utilizador encontrado',
      createdAt: 'Criado em',
      lastLogin: 'Último Login',
      actions: 'Ações',
      totalUsers: 'Total de Utilizadores',
      activeUsers: 'Utilizadores Ativos',
      adminUsers: 'Administradores'
    },
    en: {
      userManagement: 'User Management',
      addUser: 'Add User',
      searchUsers: 'Search users...',
      username: 'Username',
      email: 'Email',
      fullName: 'Full Name',
      password: 'Password',
      role: 'Role',
      admin: 'Administrator',
      staff: 'Staff',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      activate: 'Activate',
      deactivate: 'Deactivate',
      confirmDelete: 'Are you sure you want to delete this user?',
      userAdded: 'User added successfully!',
      userUpdated: 'User updated successfully!',
      userDeleted: 'User deleted successfully!',
      userActivated: 'User activated successfully!',
      userDeactivated: 'User deactivated successfully!',
      noUsers: 'No users found',
      createdAt: 'Created At',
      lastLogin: 'Last Login',
      actions: 'Actions',
      totalUsers: 'Total Users',
      activeUsers: 'Active Users',
      adminUsers: 'Administrators'
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar utilizadores');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser.id}`, formData);
        toast.success(t[language].userUpdated);
      } else {
        await axios.post(`${API}/users`, formData);
        toast.success(t[language].userAdded);
      }
      
      setShowAddDialog(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const message = error.response?.data?.detail || 'Erro ao guardar utilizador';
      toast.error(message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      full_name: user.full_name || '',
      password: '', // Don't populate password for editing
      role: user.role || 'staff'
    });
    setShowAddDialog(true);
  };

  const handleToggleStatus = async (userId) => {
    try {
      const response = await axios.put(`${API}/users/${userId}/toggle-status`);
      toast.success(response.data.message);
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      const message = error.response?.data?.detail || 'Erro ao alterar status do utilizador';
      toast.error(message);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm(t[language].confirmDelete)) {
      try {
        await axios.delete(`${API}/users/${userId}`);
        toast.success(t[language].userDeleted);
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        const message = error.response?.data?.detail || 'Erro ao eliminar utilizador';
        toast.error(message);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      full_name: '',
      password: '',
      role: 'staff'
    });
  };

  const getRoleIcon = (role) => {
    return role === 'admin' ? 
      <Shield size={16} className="text-red-600" /> : 
      <User size={16} className="text-blue-600" />;
  };

  const getStatusVariant = (isActive) => {
    return isActive ? 'default' : 'secondary';
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserStats = () => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    
    return { totalUsers, activeUsers, adminUsers };
  };

  const stats = getUserStats();

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].userManagement}
        </h1>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="btn-hover"
              onClick={() => {
                setEditingUser(null);
                resetForm();
              }}
              data-testid="add-user-btn"
            >
              <Plus className="mr-2" size={16} />
              {t[language].addUser}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? t[language].edit : t[language].addUser}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">{t[language].username} *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  required
                  data-testid="user-username"
                />
              </div>
              
              <div>
                <Label htmlFor="email">{t[language].email} *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="user-email"
                />
              </div>
              
              <div>
                <Label htmlFor="full_name">{t[language].fullName} *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  data-testid="user-fullname"
                />
              </div>
              
              <div>
                <Label htmlFor="password">
                  {t[language].password} {editingUser ? '(deixar vazio para manter)' : '*'}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required={!editingUser}
                    className="pr-10"
                    data-testid="user-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="role">{t[language].role} *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => setFormData({...formData, role: value})}
                >
                  <SelectTrigger data-testid="user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">{t[language].staff}</SelectItem>
                    <SelectItem value="admin">{t[language].admin}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                >
                  {t[language].cancel}
                </Button>
                <Button type="submit" data-testid="save-user-btn">
                  {t[language].save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].totalUsers}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
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
                  {t[language].activeUsers}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <UserCheck size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].adminUsers}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.adminUsers}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <Shield size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t[language].searchUsers}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="users-search"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2" />
            {t[language].userManagement} ({filteredUsers.length})
          </CardTitle>
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
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].username}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].fullName}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].email}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].role}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].status}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].createdAt}</th>
                    <th className="text-right p-4 font-medium text-gray-600">{t[language].actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            {getRoleIcon(user.role)}
                          </div>
                          <span className="font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="p-4">{user.full_name}</td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'default'}>
                          {t[language][user.role]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={getStatusVariant(user.is_active)}>
                          {user.is_active ? t[language].active : t[language].inactive}
                        </Badge>
                      </td>
                      <td className="p-4">
                        {new Date(user.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(user)}
                            data-testid={`edit-user-${user.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          
                          {user.id !== currentUser?.id && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleStatus(user.id)}
                                className={user.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                                data-testid={`toggle-user-${user.id}`}
                              >
                                {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                              </Button>
                              
                              {user.role !== 'admin' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDelete(user.id)}
                                  className="text-red-600 hover:text-red-700"
                                  data-testid={`delete-user-${user.id}`}
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t[language].noUsers}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;