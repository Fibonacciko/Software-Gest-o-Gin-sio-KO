import React, { useState, useEffect, useRef } from 'react';
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
  Upload
} from 'lucide-react';
import { toast } from 'sonner';
import { filtrarEOrdenar } from '../lib/pesquisa';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Inventory = ({ language, translations }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [sellData, setSellData] = useState({ item_id: '', quantity: '1', unit_price: '' });
  // Quando a venda arranca do botao de um cartao, o artigo ja vem escolhido e
  // nao se mostra a lista: era aí que se enganava o artigo, porque a lista nao
  // dizia a cor
  const [artigoFixo, setArtigoFixo] = useState(null);
  const [selling, setSelling] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: 'clothing',
    size: '',
    color: '',
    quantity: '',
    price: '',
    description: '',
    photo_url: ''
  });
  const ficheiroArtigo = useRef(null);
  const [aEnviarFoto, setAEnviarFoto] = useState(false);
  // Reservas feitas na aplicacao do socio, para o balcao preparar
  const [reservas, setReservas] = useState([]);
  // A reserva que esta a ser entregue: a venda fecha-a no fim
  const [reservaAEntregar, setReservaAEntregar] = useState(null);

  const t = {
    pt: {
      inventory: 'Gestão de Stock',
      addItem: 'Adicionar Item',
      sell: 'Vender',
      soldFor: 'Preço de venda por unidade',
      listPrice: 'Preço de tabela',
      discount: 'com desconto',
      surcharge: 'acima da tabela',
      sellTitle: 'Vender Artigo',
      inStock: 'em stock',
      total: 'Total',
      confirmSale: 'Confirmar Venda',
      saleDone: 'Venda registada e stock atualizado!',
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
      photo: 'Fotografia',
      reservations: 'Reservas da Aplicação',
      reservationsHint: 'Pedidos feitos pelos sócios no telemóvel. Prepare o artigo e entregue quando ele chegar.',
      pending: 'Por preparar',
      ready: 'Preparada',
      markReady: 'Preparada',
      markDelivered: 'Entregue',
      fromReservation: 'Reserva de',
      cancelReservation: 'Cancelar a reserva',
      choosePhoto: 'Escolher fotografia',
      uploading: 'A enviar…',
      photoHint: 'Só os artigos com fotografia aparecem na montra da aplicação do sócio.',
      delete: 'Eliminar',
      view: 'Ver',
      totalItems: 'Total de Items',
      totalValue: 'Valor Total',
      lowStock: 'Stock Baixo',
      outOfStock: 'Sem Stock',
      noItems: 'Nenhum item encontrado',
      itemAdded: 'Item adicionado com sucesso!',
      itemUpdated: 'Item atualizado com sucesso!',
      itemDeleted: 'Item eliminado com sucesso!',
      confirmDelete: 'Tem certeza que deseja eliminar este item?',
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
      addItem: 'Add Item',
      sell: 'Sell',
      soldFor: 'Unit sale price',
      listPrice: 'List price',
      discount: 'discounted',
      surcharge: 'above list',
      sellTitle: 'Sell Item',
      inStock: 'in stock',
      total: 'Total',
      confirmSale: 'Confirm Sale',
      saleDone: 'Sale recorded and stock updated!',
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
      photo: 'Photo',
      reservations: 'App Reservations',
      reservationsHint: 'Requests made by members on their phone.',
      pending: 'To prepare',
      ready: 'Ready',
      markReady: 'Ready',
      markDelivered: 'Delivered',
      fromReservation: 'Reserved by',
      cancelReservation: 'Cancel reservation',
      choosePhoto: 'Choose photo',
      uploading: 'Uploading…',
      photoHint: 'Only items with a photo appear in the member app shop.',
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

  /** O artigo escrito por extenso: nome, tamanho e cor. */
  const descreverArtigo = (item) =>
    [item.name, item.size, item.color].filter(Boolean).join(' · ');

  /** Vender a partir do cartao do artigo, sem o ter de procurar numa lista. */
  const abrirVendaDoArtigo = (item) => {
    setArtigoFixo(item);
    setSellData({
      item_id: item.id,
      quantity: '1',
      unit_price: item.price.toFixed(2)
    });
    setShowSellDialog(true);
  };

  const artigoSelecionado = () => inventory.find((i) => i.id === sellData.item_id);

  const precoCobrado = () => {
    const artigo = artigoSelecionado();
    if (!artigo) return 0;
    // Campo vazio significa preço de tabela
    if (sellData.unit_price === '') return artigo.price;
    const p = parseFloat(sellData.unit_price);
    return isNaN(p) ? 0 : p;
  };

  const totalVenda = () => {
    const qtd = parseInt(sellData.quantity, 10);
    if (!artigoSelecionado() || !qtd || qtd < 1) return 0;
    return precoCobrado() * qtd;
  };

  const handleSell = async (e) => {
    e.preventDefault();
    const artigo = artigoSelecionado();
    const qtd = parseInt(sellData.quantity, 10);

    if (!artigo) {
      toast.error('Escolhe o artigo a vender.');
      return;
    }
    if (!qtd || qtd < 1) {
      toast.error('A quantidade tem de ser pelo menos 1.');
      return;
    }
    if (qtd > artigo.quantity) {
      toast.error(`Só existem ${artigo.quantity} unidades de ${artigo.name}.`);
      return;
    }
    if (sellData.unit_price !== '' && (isNaN(parseFloat(sellData.unit_price)) || precoCobrado() < 0)) {
      toast.error('Indica um preço de venda válido.');
      return;
    }

    try {
      setSelling(true);
      await axios.post(`${API}/sales`, {
        item_id: artigo.id,
        quantity: qtd,
        unit_price: sellData.unit_price === '' ? null : precoCobrado()
      });
      if (reservaAEntregar) {
        await axios.put(`${API}/reservations/${reservaAEntregar.id}?status=delivered`);
        setReservaAEntregar(null);
        carregarReservas();
      }

      toast.success(t[language].saleDone);
      setShowSellDialog(false);
      setArtigoFixo(null);
      setSellData({ item_id: '', quantity: '1', unit_price: '' });
      fetchInventory();
    } catch (error) {
      console.error('Error selling item:', error);
      toast.error(error.response?.data?.detail || 'Erro ao registar a venda');
    } finally {
      setSelling(false);
    }
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await axios.get(`${API}/inventory?${params}`);
      let inventoryData = response.data;
      
      // Mesma pesquisa do resto da aplicação: início das palavras, nome primeiro
      inventoryData = filtrarEOrdenar(inventoryData, searchTerm, (item) => ({
        principal: item.name,
        extras: [item.description, item.color, item.size],
        numeros: []
      }));
      
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

  useEffect(() => {
    carregarReservas();
    // eslint-disable-line
  }, []);

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
      description: item.description || '',
      photo_url: item.photo_url || ''
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
      description: '',
      photo_url: ''
    });
  };

  /** Envia a fotografia do artigo e guarda o endereco no formulario. */
  const escolherFotoDoArtigo = async (evento) => {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;
    try {
      setAEnviarFoto(true);
      const corpo = new FormData();
      corpo.append('ficheiro', ficheiro);
      const r = await axios.post(`${API}/uploads`, corpo, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFormData((f) => ({ ...f, photo_url: r.data.url }));
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Não consegui enviar a fotografia.');
    } finally {
      setAEnviarFoto(false);
      evento.target.value = '';
    }
  };

  const carregarReservas = async () => {
    try {
      const r = await axios.get(`${API}/reservations`);
      // So interessa o que esta por tratar: o que ja foi entregue sai da lista
      setReservas(r.data.filter((x) => x.status === 'pending' || x.status === 'ready'));
    } catch {
      setReservas([]);
    }
  };

  /**
   * Entregar uma reserva e vender o artigo.
   *
   * Sao a mesma coisa: o socio leva o artigo e paga. Se fossem dois botoes
   * separados, o stock ficava por dar baixa sempre que alguem se esquecesse
   * do segundo.
   */
  const entregarReserva = (reserva) => {
    const artigo = inventory.find((i) => i.id === reserva.item_id);
    if (!artigo) {
      toast.error('O artigo desta reserva já não existe no stock.');
      return;
    }
    setReservaAEntregar(reserva);
    setArtigoFixo(artigo);
    setSellData({
      item_id: artigo.id,
      quantity: String(reserva.quantity || 1),
      unit_price: artigo.price.toFixed(2)
    });
    setShowSellDialog(true);
  };

  const mudarReserva = async (reserva, estado) => {
    try {
      await axios.put(`${API}/reservations/${reserva.id}?status=${estado}`);
      toast.success(
        estado === 'ready' ? 'Reserva marcada como preparada.'
          : estado === 'delivered' ? 'Reserva entregue.'
            : 'Reserva cancelada.'
      );
      carregarReservas();
    } catch {
      toast.error('Erro ao alterar a reserva');
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'clothing': return <Shirt size={16} className="text-blue-600" />;
      case 'equipment': return <Package size={16} className="text-green-600" />;
      default: return <Package size={16} className="text-gray-600 dark:text-gray-300" />;
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 lg:mb-0">
          {t[language].inventory}
        </h1>
        
        <div className="flex flex-wrap gap-3">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button 
              className="btn-hover bg-orange-500 hover:bg-orange-600 text-white"
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

              {/* A fotografia e o que faz o artigo aparecer na montra da app */}
              <div>
                <Label>{t[language].photo}</Label>
                <div className="flex items-center gap-3 mt-1">
                  {formData.photo_url && (
                    <img
                      src={formData.photo_url.startsWith('http')
                        ? formData.photo_url
                        : `${BACKEND_URL}${formData.photo_url}`}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <input
                    ref={ficheiroArtigo}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={escolherFotoDoArtigo}
                    data-testid="item-photo-input"
                  />
                  <Button type="button" variant="outline" disabled={aEnviarFoto}
                          onClick={() => ficheiroArtigo.current?.click()}
                          data-testid="item-photo-btn">
                    <Upload className="mr-2" size={14} />
                    {aEnviarFoto ? t[language].uploading : t[language].choosePhoto}
                  </Button>
                  {formData.photo_url && (
                    <Button type="button" variant="ghost" size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => setFormData({ ...formData, photo_url: '' })}>
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {t[language].photoHint}
                </p>
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

        {/* Janela de venda */}
        <Dialog
          open={showSellDialog}
          onOpenChange={(aberto) => {
            setShowSellDialog(aberto);
            if (!aberto) {
              setArtigoFixo(null);
              setReservaAEntregar(null);
              setSellData({ item_id: '', quantity: '1', unit_price: '' });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t[language].sellTitle}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSell} className="space-y-4">
              {/* O artigo nao se escolhe aqui: a venda comeca sempre no cartao
                  do proprio artigo, e e por isso que se ve o nome, o tamanho e
                  a cor em vez de uma lista onde se podiam confundir */}
              {artigoFixo && (
                <div
                  className="rounded-lg p-3"
                  style={{ background: 'var(--background-elevated)' }}
                  data-testid="artigo-fixo"
                >
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {descreverArtigo(artigoFixo)}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    €{artigoFixo.price.toFixed(2)} · {artigoFixo.quantity} {t[language].inStock}
                  </p>
                  {reservaAEntregar && (
                    <p className="text-sm mt-1" style={{ color: 'var(--ko-primary-orange)' }}>
                      {t[language].fromReservation} #{reservaAEntregar.member_number} —{' '}
                      {reservaAEntregar.member_name}
                    </p>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="sell-quantity">{t[language].quantity} *</Label>
                <Input
                  id="sell-quantity"
                  type="number"
                  min="1"
                  max={artigoSelecionado()?.quantity || 1}
                  value={sellData.quantity}
                  onChange={(e) => setSellData({ ...sellData, quantity: e.target.value })}
                  required
                  data-testid="sell-quantity"
                />
              </div>

              <div>
                <Label htmlFor="sell-price">{t[language].soldFor} (€) *</Label>
                <Input
                  id="sell-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellData.unit_price}
                  onChange={(e) => setSellData({ ...sellData, unit_price: e.target.value })}
                  placeholder={artigoSelecionado() ? artigoSelecionado().price.toFixed(2) : '0.00'}
                  data-testid="sell-price"
                />
                {artigoSelecionado() && Math.abs(precoCobrado() - artigoSelecionado().price) > 0.001 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--ko-primary-orange)' }}>
                    {t[language].listPrice}: €{artigoSelecionado().price.toFixed(2)} ·{' '}
                    {precoCobrado() < artigoSelecionado().price ? t[language].discount : t[language].surcharge}
                  </p>
                )}
              </div>

              {artigoSelecionado() && (
                <div className="p-3 rounded-lg" style={{ background: 'var(--background-elevated)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {artigoSelecionado().name} · €{artigoSelecionado().price.toFixed(2)} cada
                  </p>
                  <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {t[language].total}: €{totalVenda().toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowSellDialog(false)}>
                  {t[language].cancel}
                </Button>
                <Button
                  type="submit"
                  disabled={selling || !artigoFixo || artigoFixo.quantity === 0}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="confirm-sale-btn"
                >
                  <ShoppingCart className="mr-2" size={16} />
                  {t[language].confirmSale}
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
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {t[language].totalItems}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{stats.totalItems}</p>
              </div>
              <div className="p-3 rounded-full shrink-0 bg-blue-500">
                <Package size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {t[language].totalValue}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">
                  €{stats.totalValue.toFixed(2)}
                </p>
              </div>
              <div className="p-3 rounded-full shrink-0 bg-green-500">
                <TrendingUp size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {t[language].lowStock}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{stats.lowStockItems}</p>
              </div>
              <div className="p-3 rounded-full shrink-0 bg-yellow-500">
                <AlertTriangle size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 truncate">
                  {t[language].outOfStock}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white truncate">{stats.outOfStockItems}</p>
              </div>
              <div className="p-3 rounded-full shrink-0 bg-red-500">
                <Minus size={24} className="text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservas feitas na aplicacao: aparecem so quando ha alguma por tratar */}
      {reservas.length > 0 && (
        <Card className="card-shadow" style={{ borderColor: 'var(--ko-primary-orange)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2" size={20} style={{ color: 'var(--ko-primary-orange)' }} />
              {t[language].reservations} ({reservas.length})
            </CardTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t[language].reservationsHint}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {reservas.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--background-elevated)' }}
                  data-testid={`reserva-${r.id}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.quantity}x {r.item_name}
                      {r.item_details ? ` · ${r.item_details}` : ''}
                    </p>
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                      #{r.member_number} — {r.member_name}
                      {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString('pt-PT')}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      style={{
                        borderColor: r.status === 'ready' ? '#16a34a' : 'var(--ko-primary-orange)',
                        color: r.status === 'ready' ? '#16a34a' : 'var(--ko-primary-orange)'
                      }}
                    >
                      {r.status === 'ready' ? t[language].ready : t[language].pending}
                    </Badge>
                    {r.status === 'pending' && (
                      <Button size="sm" variant="outline"
                              onClick={() => mudarReserva(r, 'ready')}
                              data-testid={`preparar-${r.id}`}>
                        {t[language].markReady}
                      </Button>
                    )}
                    <Button size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => entregarReserva(r)}
                            data-testid={`entregar-${r.id}`}>
                      {t[language].markDelivered}
                    </Button>
                    <Button size="sm" variant="ghost"
                            className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                            title={t[language].cancelReservation}
                            onClick={() => mudarReserva(r, 'cancelled')}
                            data-testid={`cancelar-${r.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 dark:text-gray-500" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {inventory.map((item) => {
                const stockStatus = getStockStatus(item.quantity);
                return (
                  <Card key={item.id} className="card-shadow hover:shadow-lg transition-all duration-200">
                    <CardContent className="p-6">
                      {/* Os botoes passam para baixo quando o nome do artigo
                          nao cabe ao lado deles */}
                      <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                        <div className="flex items-center space-x-3 min-w-0">
                          {getCategoryIcon(item.category)}
                          <div className="min-w-0">
                            <h3 className="font-semibold text-lg truncate" title={item.name}>{item.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {t[language][item.category]}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-auto">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirVendaDoArtigo(item)}
                            disabled={item.quantity === 0}
                            title={item.quantity === 0 ? t[language].outOfStock : t[language].sell}
                            className="text-green-700 hover:text-green-800 border-green-600/40"
                            data-testid={`sell-item-${item.id}`}
                          >
                            <ShoppingCart size={14} className="mr-1" />
                            {t[language].sell}
                          </Button>
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
                            <span className="text-sm text-gray-600 dark:text-gray-300">{t[language].size}:</span>
                            <span className="text-sm font-medium">{item.size}</span>
                          </div>
                        )}
                        {item.color && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-300">{t[language].color}:</span>
                            <span className="text-sm font-medium">{item.color}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-300">{t[language].price}:</span>
                          <span className="text-sm font-semibold">€{item.price.toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">{t[language].stockLevel}</p>
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
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-gray-600 dark:text-gray-300">{t[language].noItems}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
