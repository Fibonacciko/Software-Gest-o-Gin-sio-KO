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
  Package, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  AlertTriangle,
  TrendingUp,
  Shirt,
  ShoppingCart,
  Minus,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = ({ language, translations }) => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemForSale, setSelectedItemForSale] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'clothing',
    size: '',
    color: '',
    quantity: '',
    price: '',
    purchase_price: '',
    description: ''
  });

  const [saleFormData, setSaleFormData] = useState({
    quantity: '',
    sale_price: ''
  });

  // Helper function to check if user is admin
  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const t = {
    pt: {
      inventory: 'Gestão de Stock',
      addItem: 'Adicionar Artigo',
      sellItem: 'Venda Artigo',
      searchItems: 'Procurar items...',
      allCategories: 'Todas as Categorias',
      clothing: 'Roupa',
      equipment: 'Equipamento',
      name: 'Nome',
      category: 'Categoria',
      size: 'Tamanho',
      color: 'Cor',
      quantity: 'Quantidade',
      price: 'Preço',
      description: 'Descrição',
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      view: 'Ver',
      totalItems: 'Total de Items',
      totalValue: 'Valor Total',
      lowStock: 'Stock Baixo',
      outOfStock: 'Sem Stock',
      noItems: 'Nenhum item encontrado',
      itemAdded: 'Artigo adicionado com sucesso!',
      itemUpdated: 'Artigo atualizado com sucesso!',
      itemDeleted: 'Artigo eliminado com sucesso!',
      itemSold: 'Venda registada com sucesso!',
      confirmDelete: 'Tem certeza que deseja eliminar este artigo?',
      totalArticles: 'Total de Artigos',
      purchasePrice: 'Preço de Compra',
      salePrice: 'Preço de Venda',
      totalStockValue: 'Valor Total em Stock',
      totalSoldValue: 'Valor Total Vendido',
      netRevenue: 'Receita Líquida',
      monthlyRevenue: 'Receita do Mês',
      monthlyExpenses: 'Despesas do Mês',
      quantityToSell: 'Quantidade a Vender',
      stockLevel: 'Nível de Stock',
      inStock: 'Em Stock',
      itemDetails: 'Detalhes do Item',
      adjustStock: 'Ajustar Stock',
      addStock: 'Adicionar Stock',
      removeStock: 'Remover Stock',
      adjustQuantity: 'Ajustar Quantidade',
      newQuantity: 'Nova Quantidade',
      currentStock: 'Stock Atual',
      clothingItems: {
        tshirt: 'T-shirt',
        hoodie: 'Hoodie',
        shorts: 'Calções'
      },
      equipmentItems: {
        gloves: 'Luvas',
        bandages: 'Bandagens',
        helmet: 'Capacete',
        mouthguard: 'Protetor Bucal',
        shinguards: 'Caneleiras'
      }
    },
    en: {
      inventory: 'Inventory Management',
      addItem: 'Add Article',
      sellItem: 'Sell Article',
      searchItems: 'Search items...',
      allCategories: 'All Categories',
      clothing: 'Clothing',
      equipment: 'Equipment',
      name: 'Name',
      category: 'Category',
      size: 'Size',
      color: 'Color',
      quantity: 'Quantity',
      price: 'Price',
      description: 'Description',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      view: 'View',
      totalItems: 'Total Items',
      totalValue: 'Total Value',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      noItems: 'No items found',
      itemAdded: 'Item added successfully!',
      itemUpdated: 'Item updated successfully!',
      itemDeleted: 'Item deleted successfully!',
      confirmDelete: 'Are you sure you want to delete this item?',
      stockLevel: 'Stock Level',
      inStock: 'In Stock',
      itemDetails: 'Item Details',
      adjustStock: 'Adjust Stock',
      addStock: 'Add Stock',
      removeStock: 'Remove Stock',
      adjustQuantity: 'Adjust Quantity',
      newQuantity: 'New Quantity',
      currentStock: 'Current Stock',
      clothingItems: {
        tshirt: 'T-shirt',
        hoodie: 'Hoodie',
        shorts: 'Shorts'
      },
      equipmentItems: {
        gloves: 'Gloves',
        bandages: 'Bandages',
        helmet: 'Helmet',
        mouthguard: 'Mouthguard',
        shinguards: 'Shin Guards'
      }
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await axios.get(`${API}/inventory?${params}`);
      let inventoryData = response.data;
      
      // Filter by search term if provided
      if (searchTerm) {
        inventoryData = inventoryData.filter(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchInventory();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, categoryFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        quantity: parseInt(formData.quantity),
        price: parseFloat(formData.price)
      };
      
      if (editingItem) {
        await axios.put(`${API}/inventory/${editingItem.id}`, itemData);
        toast.success(t[language].itemUpdated);
      } else {
        await axios.post(`${API}/inventory`, itemData);
        toast.success(t[language].itemAdded);
      }
      
      setShowAddDialog(false);
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } catch (error) {
      console.error('Error saving item:', error);
      toast.error('Erro ao guardar item');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      category: item.category || 'clothing',
      size: item.size || '',
      color: item.color || '',
      quantity: item.quantity?.toString() || '',
      price: item.price?.toString() || '',
      description: item.description || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (itemId) => {
    if (window.confirm(t[language].confirmDelete)) {
      try {
        await axios.delete(`${API}/inventory/${itemId}`);
        toast.success(t[language].itemDeleted);
        fetchInventory();
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error('Erro ao eliminar item');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'clothing',
      size: '',
      color: '',
      quantity: '',
      price: '',
      description: ''
    });
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'clothing': return <Shirt size={16} className="text-blue-600" />;
      case 'equipment': return <Package size={16} className="text-green-600" />;
      default: return <Package size={16} className="text-gray-600" />;
    }
  };

  const getStockStatus = (quantity) => {
    if (quantity === 0) {
      return { status: 'outOfStock', variant: 'destructive', color: 'bg-red-100 text-red-800' };
    } else if (quantity <= 5) {
      return { status: 'lowStock', variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { status: 'inStock', variant: 'default', color: 'bg-green-100 text-green-800' };
    }
  };

  const getInventoryStats = () => {
    const totalItems = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity <= 5).length;
    const outOfStockItems = inventory.filter(item => item.quantity === 0).length;
    
    return { totalItems, totalValue, lowStockItems, outOfStockItems };
  };

  const stats = getInventoryStats();

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 lg:mb-0">
          {t[language].inventory}
        </h1>
        
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="btn-hover"
              onClick={() => {
                setEditingItem(null);
                resetForm();
              }}
              data-testid="add-item-btn"
            >
              <Plus className="mr-2" size={16} />
              {t[language].addItem}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t[language].edit : t[language].addItem}
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
                    data-testid="item-name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">{t[language].category} *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({...formData, category: value})}
                  >
                    <SelectTrigger data-testid="item-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clothing">{t[language].clothing}</SelectItem>
                      <SelectItem value="equipment">{t[language].equipment}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="size">{t[language].size}</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => setFormData({...formData, size: e.target.value})}
                    placeholder="XS, S, M, L, XL"
                    data-testid="item-size"
                  />
                </div>
                
                <div>
                  <Label htmlFor="color">{t[language].color}</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    data-testid="item-color"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity">{t[language].quantity} *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    required
                    data-testid="item-quantity"
                  />
                </div>
                
                <div>
                  <Label htmlFor="price">{t[language].price} (€) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    required
                    data-testid="item-price"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">{t[language].description}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  data-testid="item-description"
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
                <Button type="submit" data-testid="save-item-btn">
                  {t[language].save}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].totalItems}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500">
                <Package size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].totalValue}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  €{stats.totalValue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-500">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].lowStock}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems}</p>
              </div>
              <div className="p-3 rounded-full bg-yellow-500">
                <AlertTriangle size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  {t[language].outOfStock}
                </p>
                <p className="text-2xl font-bold text-gray-900">{stats.outOfStockItems}</p>
              </div>
              <div className="p-3 rounded-full bg-red-500">
                <Minus size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t[language].searchItems}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="inventory-search"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t[language].allCategories} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t[language].allCategories}</SelectItem>
                <SelectItem value="clothing">{t[language].clothing}</SelectItem>
                <SelectItem value="equipment">{t[language].equipment}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2" />
            {t[language].inventory} ({inventory.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="rounded bg-gray-200 h-16 w-16"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : inventory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity);
                return (
                  <Card key={item.id} className="card-shadow hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getCategoryIcon(item.category)}
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-sm text-gray-500">
                              {t[language][item.category]}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            data-testid={`edit-item-${item.id}`}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`delete-item-${item.id}`}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        {item.size && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">{t[language].size}:</span>
                            <span className="text-sm font-medium">{item.size}</span>
                          </div>
                        )}
                        {item.color && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">{t[language].color}:</span>
                            <span className="text-sm font-medium">{item.color}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">{t[language].price}:</span>
                          <span className="text-sm font-semibold">€{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">{t[language].stockLevel}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-bold">{item.quantity}</span>
                            <Badge className={stockStatus.color}>
                              {item.quantity === 0 ? t[language].outOfStock :
                               item.quantity <= 5 ? t[language].lowStock :
                               t[language].inStock}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {item.description && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600">{item.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{t[language].noItems}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
