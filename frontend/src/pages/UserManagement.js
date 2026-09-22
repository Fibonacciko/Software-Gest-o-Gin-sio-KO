import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Users, Plus, Search, Shield, User, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const UserManagement = ({ language = 'pt' }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '', email: '', full_name: '', password: '', role: 'staff'
  });

  const t = {
    pt: {
      userManagement: 'Gestão de Utilizadores',
      addUser: 'Novo Utilizador',
      editUser: 'Editar Utilizador',
      searchUsers: 'Pesquisar utilizadores...',
      username: 'Utilizador',
      email: 'Email',
      fullName: 'Nome Completo',
      password: 'Palavra-passe',
      passwordHint: 'Deixe em branco para manter a palavra-passe atual',
      role: 'Perfil',
      admin: 'Administrador',
      staff: 'Colaborador',
      active: 'Ativo',
      inactive: 'Inativo',
      noUsers: 'Nenhum utilizador encontrado',
      save: 'Guardar',
      cancel: 'Cancelar',
      activate: 'Ativar',
      deactivate: 'Desativar',
      confirmDelete: 'Tem a certeza que deseja eliminar este utilizador?',
      userCreated: 'Utilizador criado com sucesso',
      userUpdated: 'Utilizador atualizado com sucesso',
      userDeleted: 'Utilizador eliminado com sucesso',
      statusUpdated: 'Estado do utilizador atualizado',
      errorLoad: 'Erro ao carregar utilizadores',
      errorSave: 'Erro ao guardar utilizador',
      errorDelete: 'Erro ao eliminar utilizador',
      errorStatus: 'Erro ao atualizar estado do utilizador',
    },
    en: {
      userManagement: 'User Management',
      addUser: 'New User',
      editUser: 'Edit User',
      searchUsers: 'Search users...',
      username: 'Username',
      email: 'Email',
      fullName: 'Full Name',
      password: 'Password',
      passwordHint: 'Leave blank to keep current password',
      role: 'Role',
      admin: 'Administrator',
      staff: 'Staff',
      active: 'Active',
      inactive: 'Inactive',
      noUsers: 'No users found',
      save: 'Save',
      cancel: 'Cancel',
      activate: 'Activate',
      deactivate: 'Deactivate',
      confirmDelete: 'Are you sure you want to delete this user?',
      userCreated: 'User created successfully',
      userUpdated: 'User updated successfully',
      userDeleted: 'User deleted successfully',
      statusUpdated: 'User status updated',
      errorLoad: 'Error loading users',
      errorSave: 'Error saving user',
      errorDelete: 'Error deleting user',
      errorStatus: 'Error updating user status',
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
      toast.error(t[language].errorLoad);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ username: '', email: '', full_name: '', password: '', role: 'staff' });
  };

  const getErrorMessage = (error, fallback) => {
    const detail = error?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
    return fallback;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`${API}/users/${editingUser.id}`, formData);
        toast.success(t[language].userUpdated);
      } else {
        await axios.post(`${API}/users`, formData);
        toast.success(t[language].userCreated);
      }
      setShowAddDialog(false);
      setEditingUser(null);
      resetForm();
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, t[language].errorSave));
    }
  };

  const handleEdit = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      full_name: u.full_name,
      password: '',
      role: u.role
    });
    setShowAddDialog(true);
  };

  const handleToggleStatus = async (u) => {
    try {
      await axios.put(`${API}/users/${u.id}/toggle-status`);
      toast.success(t[language].statusUpdated);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, t[language].errorStatus));
    }
  };

  const handleDelete = async (u) => {
    if (!window.confirm(t[language].confirmDelete)) return;
    try {
      await axios.delete(`${API}/users/${u.id}`);
      toast.success(t[language].userDeleted);
      fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error, t[language].errorDelete));
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--background-primary)' }}>
      <div className="p-6 space-y-6 fade-in">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-3xl font-bold mb-4 lg:mb-0 ko-text-primary">
            {t[language].userManagement}
          </h1>

          <Dialog open={showAddDialog} onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) {
              setEditingUser(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button
                className="ko-hover-primary transition-all duration-200"
                style={{ backgroundColor: 'var(--button-primary-bg)', color: 'white' }}
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
            <DialogContent
              className="max-w-lg max-h-[90vh] overflow-y-auto"
              style={{ background: 'var(--gradient-card-bg)', color: 'var(--text-primary)' }}
            >
              <DialogHeader>
                <DialogTitle style={{ color: 'var(--text-primary)' }}>
                  {editingUser ? t[language].editUser : t[language].addUser}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name" style={{ color: 'var(--text-primary)' }}>{t[language].fullName} *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    style={{ background: 'var(--gradient-input)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    data-testid="user-fullname"
                  />
                </div>

                <div>
                  <Label htmlFor="username" style={{ color: 'var(--text-primary)' }}>{t[language].username} *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    style={{ background: 'var(--gradient-input)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    data-testid="user-username"
                  />
                </div>

                <div>
                  <Label htmlFor="email" style={{ color: 'var(--text-primary)' }}>{t[language].email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ background: 'var(--gradient-input)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    data-testid="user-email"
                  />
                </div>

                <div>
                  <Label htmlFor="password" style={{ color: 'var(--text-primary)' }}>
                    {t[language].password} {!editingUser && '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    style={{ background: 'var(--gradient-input)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    data-testid="user-password"
                  />
                  {editingUser && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      {t[language].passwordHint}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="role" style={{ color: 'var(--text-primary)' }}>{t[language].role} *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger
                      data-testid="user-role"
                      style={{ background: 'var(--gradient-input)', borderColor: 'var(--border-medium)', color: 'var(--text-primary)' }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">{t[language].staff}</SelectItem>
                      <SelectItem value="admin">{t[language].admin}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddDialog(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                  >
                    {t[language].cancel}
                  </Button>
                  <Button
                    type="submit"
                    style={{ backgroundColor: 'var(--button-primary-bg)', color: 'white' }}
                    data-testid="save-user-btn"
                  >
                    {t[language].save}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

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
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-4 rounded-lg transition-all duration-200"
                    style={{ border: '1px solid var(--border-light)' }}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>
                        {u.role === 'admin' ? (
                          <Shield size={16} className="ko-text-primary" />
                        ) : (
                          <User size={16} style={{ color: 'var(--text-secondary)' }} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {u.full_name}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {u.username} · {u.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge className={u.role === 'admin' ? 'ko-badge-primary' : 'ko-badge-golden'}>
                        {t[language][u.role] || u.role}
                      </Badge>
                      <Badge
                        variant={u.is_active ? 'default' : 'secondary'}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(u)}
                        title={u.is_active ? t[language].deactivate : t[language].activate}
                      >
                        {u.is_active ? t[language].active : t[language].inactive}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(u)}
                        data-testid={`edit-user-${u.id}`}
                      >
                        <Edit size={16} />
                      </Button>
                      {u.role !== 'admin' && u.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(u)}
                          data-testid={`delete-user-${u.id}`}
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
                <p style={{ color: 'var(--text-secondary)' }}>{loading ? '...' : t[language].noUsers}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserManagement;
