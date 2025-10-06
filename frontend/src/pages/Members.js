import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye, 
  QrCode,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import MemberAttendanceCalendar from '../components/MemberAttendanceCalendar';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Members = ({ language, translations }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editingMember, setEditingMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [membershipFilter, setMembershipFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    nationality: '',
    profession: '',
    address: '',
    membership_type: 'basic',
    photo_url: '',
    notes: ''
  });

  const t = {
    pt: {
      members: 'Gestão de Membros',
      addMember: 'Adicionar Membro',
      searchMembers: 'Procurar membros...',
      allStatuses: 'Todos os Status',
      active: 'Ativo',
      inactive: 'Inativo',
      suspended: 'Suspenso',
      allMemberships: 'Tipos de Planos',
      basic: 'Básico',
      premium: 'Premium',
      vip: 'Ilimitado',
      name: 'Nome',
      email: 'Email',
      phone: 'Telefone',
      dateOfBirth: 'Data de Nascimento',
      nationality: 'Nacionalidade',
      profession: 'Profissão',
      address: 'Morada',
      membershipType: 'Tipo de Membership',
      photoUrl: 'URL da Foto',
      notes: 'Notas',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      view: 'Ver',
      memberDetails: 'Detalhes do Membro',
      joinDate: 'Data de Adesão',
      status: 'Status',
      qrCode: 'Código QR',
      confirmDelete: 'Tem certeza que deseja eliminar este membro?',
      memberAdded: 'Membro adicionado com sucesso!',
      memberUpdated: 'Membro atualizado com sucesso!',
      memberDeleted: 'Membro eliminado com sucesso!',
      noMembers: 'Nenhum membro encontrado'
    },
    en: {
      members: 'Member Management',
      addMember: 'Add Member',
      searchMembers: 'Search members...',
      allStatuses: 'All Statuses',
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      allMemberships: 'Plan Types',
      basic: 'Basic',
      premium: 'Premium',
      vip: 'Unlimited',
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      dateOfBirth: 'Date of Birth',
      nationality: 'Nationality',
      profession: 'Profession',
      address: 'Address',
      membershipType: 'Membership Type',
      photoUrl: 'Photo URL',
      notes: 'Notes',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      memberDetails: 'Member Details',
      joinDate: 'Join Date',
      status: 'Status',
      qrCode: 'QR Code',
      confirmDelete: 'Are you sure you want to delete this member?',
      memberAdded: 'Member added successfully!',
      memberUpdated: 'Member updated successfully!',
      memberDeleted: 'Member deleted successfully!',
      noMembers: 'No members found'
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (membershipFilter !== 'all') params.append('membership_type', membershipFilter);
      
      const response = await axios.get(`${API}/members?${params}`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erro ao carregar membros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, statusFilter, membershipFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMember) {
        await axios.put(`${API}/members/${editingMember.id}`, formData);
        toast.success(t[language].memberUpdated);
      } else {
        await axios.post(`${API}/members`, formData);
        toast.success(t[language].memberAdded);
      }
      
      setShowAddDialog(false);
      setEditingMember(null);
      resetForm();
      fetchMembers();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error('Erro ao guardar membro');
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setFormData({
      name: member.name || '',
      email: member.email || '',
      phone: member.phone || '',
      date_of_birth: member.date_of_birth || '',
      nationality: member.nationality || '',
      profession: member.profession || '',
      address: member.address || '',
      membership_type: member.membership_type || 'basic',
      photo_url: member.photo_url || '',
      notes: member.notes || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (memberId) => {
    if (window.confirm(t[language].confirmDelete)) {
      try {
        console.log('Deleting member with ID:', memberId);
        await axios.delete(`${API}/members/${memberId}`);
        toast.success(t[language].memberDeleted);
        fetchMembers();
      } catch (error) {
        console.error('Error deleting member:', error);
        toast.error('Erro ao eliminar membro: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleViewDetails = async (memberId) => {
    try {
      console.log('Fetching member details for ID:', memberId);
      const response = await axios.get(`${API}/members/${memberId}`);
      console.log('Member details response:', response.data);
      setSelectedMember(response.data);
      setShowDetailDialog(true);
      toast.success('Detalhes do membro carregados com sucesso');
    } catch (error) {
      console.error('Error fetching member details:', error);
      toast.error('Erro ao carregar detalhes do membro: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      nationality: '',
      profession: '',
      address: '',
      membership_type: 'basic',
      photo_url: '',
      notes: ''
    });
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusClassName = (status) => {
    switch (status) {
      case 'active': return 'bg-green-800 text-white hover:bg-green-900';
      case 'inactive': return 'bg-orange-600 text-white hover:bg-orange-700';
      case 'suspended': return 'bg-red-600 text-white hover:bg-red-700';
      default: return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

  const getMembershipColor = (type) => {
    switch (type) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'vip': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].members}
        </h1>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="btn-hover"
              onClick={() => {
                setEditingMember(null);
                resetForm();
              }}
              data-testid="add-member-btn"
            >
              <Plus className="mr-2" size={16} />
              {t[language].addMember}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? t[language].edit : t[language].addMember}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">{t[language].name} *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                    data-testid="member-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">{t[language].phone} *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                    data-testid="member-phone"
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">{t[language].email}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    data-testid="member-email"
                  />
                </div>
                
                <div>
                  <Label htmlFor="date_of_birth">{t[language].dateOfBirth} *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    required
                    data-testid="member-birthdate"
                  />
                </div>
                
                <div>
                  <Label htmlFor="nationality">{t[language].nationality} *</Label>
                  <Input
                    id="nationality"
                    value={formData.nationality}
                    onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                    required
                    data-testid="member-nationality"
                  />
                </div>
                
                <div>
                  <Label htmlFor="profession">{t[language].profession} *</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => setFormData({...formData, profession: e.target.value})}
                    required
                    data-testid="member-profession"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">{t[language].address} *</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  required
                  data-testid="member-address"
                />
              </div>
              
              <div>
                <Label htmlFor="membership_type">{t[language].membershipType} *</Label>
                <Select 
                  value={formData.membership_type} 
                  onValueChange={(value) => setFormData({...formData, membership_type: value})}
                >
                  <SelectTrigger data-testid="member-membership-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">{t[language].basic}</SelectItem>
                    <SelectItem value="premium">{t[language].premium}</SelectItem>
                    <SelectItem value="vip">{t[language].vip}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="photo_url">{t[language].photoUrl}</Label>
                <Input
                  id="photo_url"
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({...formData, photo_url: e.target.value})}
                  data-testid="member-photo-url"
                />
              </div>
              
              <div>
                <Label htmlFor="notes">{t[language].notes}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  data-testid="member-notes"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                >
                  {t[language].cancel}
                </Button>
                <Button type="submit" data-testid="save-member-btn">
                  {t[language].save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Procurar por nome, telefone, email ou nº sócio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="members-search"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allStatuses}</SelectItem>
                <SelectItem value="active">{t[language].active}</SelectItem>
                <SelectItem value="inactive">{t[language].inactive}</SelectItem>
                <SelectItem value="suspended">{t[language].suspended}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allMemberships} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allMemberships}</SelectItem>
                <SelectItem value="basic">{t[language].basic}</SelectItem>
                <SelectItem value="premium">{t[language].premium}</SelectItem>
                <SelectItem value="vip">{t[language].vip}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2" />
            {t[language].members} ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="rounded-full bg-gray-200 h-12 w-12"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-600">Nº Sócio</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].name}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].phone}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].membershipType}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].status}</th>
                    <th className="text-left p-4 font-medium text-gray-600">{t[language].joinDate}</th>
                    <th className="text-right p-4 font-medium text-gray-600">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <span className="font-mono text-sm font-semibold text-blue-600">#{member.member_number}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          {member.photo_url ? (
                            <img 
                              src={member.photo_url} 
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users size={16} className="text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{member.name}</p>
                            {member.email && (
                              <p className="text-sm text-gray-500">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Phone size={16} className="text-gray-400 mr-2" />
                          {member.phone}
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge className={getMembershipColor(member.membership_type)}>
                          {t[language][member.membership_type]}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={getStatusClassName(member.status)}>
                          {t[language][member.status] || member.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <Calendar size={16} className="text-gray-400 mr-2" />
                          {member.join_date ? new Date(member.join_date).toLocaleDateString('pt-PT') : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(member.id)}
                            data-testid={`view-member-${member.id}`}
                          >
                            <Eye size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(member)}
                            data-testid={`edit-member-${member.id}`}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`delete-member-${member.id}`}
                          >
                            <Trash2 size={16} />
                          </Button>
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
              <p className="text-gray-600">{t[language].noMembers}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Details Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t[language].memberDetails}</DialogTitle>
          </DialogHeader>
          
          {selectedMember && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Member Info */}
              <div className="space-y-6">
                {/* Member Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {selectedMember.photo_url ? (
                      <img 
                        src={selectedMember.photo_url} 
                        alt={selectedMember.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <Users size={24} className="text-gray-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold">{selectedMember.name}</h3>
                        <span className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          #{selectedMember.member_number}
                        </span>
                      </div>
                      <Badge className={getStatusClassName(selectedMember.status)}>
                        {t[language][selectedMember.status] || selectedMember.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedMember.email && (
                      <div className="flex items-center">
                        <Mail size={16} className="text-gray-400 mr-3" />
                        <span>{selectedMember.email}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Phone size={16} className="text-gray-400 mr-3" />
                      <span>{selectedMember.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <MapPin size={16} className="text-gray-400 mr-3" />
                      <span>{selectedMember.address}</span>
                    </div>
                    <div className="flex items-center">
                      <Flag size={16} className="text-gray-400 mr-3" />
                      <span>{selectedMember.nationality}</span>
                    </div>
                    <div className="flex items-center">
                      <Briefcase size={16} className="text-gray-400 mr-3" />
                      <span>{selectedMember.profession}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={16} className="text-gray-400 mr-3" />
                      <span>{new Date(selectedMember.date_of_birth).toLocaleDateString('pt-PT')}</span>
                    </div>
                  </div>
                </div>
                
                {/* Membership Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">{t[language].membershipType}</h4>
                    <Badge className={getMembershipColor(selectedMember.membership_type)}>
                      {t[language][selectedMember.membership_type]}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">{t[language].joinDate}</h4>
                    <p>{new Date(selectedMember.join_date).toLocaleDateString('pt-PT')}</p>
                  </div>
                  
                  {selectedMember.notes && (
                    <div>
                      <h4 className="font-medium mb-2">{t[language].notes}</h4>
                      <p className="text-gray-600">{selectedMember.notes}</p>
                    </div>
                  )}
                </div>
                
                {/* QR Code */}
                {selectedMember.qr_code && (
                  <div className="text-center p-6 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-4">{t[language].qrCode}</h4>
                    <div className="qr-code-container inline-block">
                      <img src={selectedMember.qr_code} alt="QR Code" className="w-32 h-32" />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">Para check-in na app móvel</p>
                  </div>
                )}
              </div>

              {/* Right Column - Attendance Calendar */}
              <div className="space-y-6">
                <MemberAttendanceCalendar 
                  memberId={selectedMember.id}
                  language={language}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Members;
