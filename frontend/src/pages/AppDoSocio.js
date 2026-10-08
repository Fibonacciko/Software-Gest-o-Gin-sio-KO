import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Handshake,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  Upload,
  Link as LinkIcon,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/** O endereço completo de uma imagem guardada no servidor. */
export const enderecoDaImagem = (url) => {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

const PARCEIRO_VAZIO = {
  name: '', benefit: '', category: '', description: '',
  logo_url: '', address: '', phone: '', website: '', is_active: true
};

const MEDIA_VAZIA = { kind: 'photo', url: '', caption: '', taken_on: '', is_active: true };

const AppDoSocio = ({ language }) => {
  const [aba, setAba] = useState('parceiros');
  const [parceiros, setParceiros] = useState([]);
  const [media, setMedia] = useState([]);
  const [aCarregar, setACarregar] = useState(true);

  const [parceiroAberto, setParceiroAberto] = useState(false);
  const [parceiroForm, setParceiroForm] = useState(PARCEIRO_VAZIO);
  const [parceiroAEditar, setParceiroAEditar] = useState(null);

  const [mediaAberta, setMediaAberta] = useState(false);
  const [mediaForm, setMediaForm] = useState(MEDIA_VAZIA);
  const [aEnviar, setAEnviar] = useState(false);

  const ficheiroLogo = useRef(null);
  const ficheiroFoto = useRef(null);

  const t = {
    pt: {
      titulo: 'Aplicação do Sócio',
      subtitulo: 'O que o sócio vê no telemóvel. O que puser aqui aparece-lhe lá.',
      parceiros: 'Parceiros',
      multimedia: 'Multimédia',
      novoParceiro: 'Novo Parceiro',
      novaFoto: 'Nova Publicação',
      nome: 'Nome',
      beneficio: 'Vantagem para o sócio',
      beneficioAjuda: 'É o que mais conta. Ex: "10% em consultas de fisioterapia"',
      categoria: 'Categoria',
      descricao: 'Descrição',
      logotipo: 'Logótipo',
      morada: 'Morada',
      telefone: 'Telefone',
      site: 'Site',
      visivel: 'Visível na aplicação',
      escolherFicheiro: 'Escolher imagem',
      aEnviar: 'A enviar…',
      guardar: 'Guardar',
      cancelar: 'Cancelar',
      tipo: 'Tipo',
      fotografia: 'Fotografia',
      videoLink: 'Vídeo (link)',
      legenda: 'Legenda',
      data: 'Data',
      linkDoVideo: 'Link do vídeo',
      linkAjuda: 'Cole o endereço do Instagram, YouTube ou Facebook',
      semParceiros: 'Ainda não há parceiros. Carregue em Novo Parceiro para começar.',
      semMedia: 'Ainda não há fotografias nem vídeos publicados.',
      escondido: 'Escondido',
      apagar: 'Apagar',
      editar: 'Editar'
    },
    en: {
      titulo: 'Member App',
      subtitulo: 'What the member sees on their phone.',
      parceiros: 'Partners',
      multimedia: 'Media',
      novoParceiro: 'New Partner',
      novaFoto: 'New Post',
      nome: 'Name',
      beneficio: 'Member benefit',
      beneficioAjuda: 'This is what matters most. E.g. "10% off physiotherapy"',
      categoria: 'Category',
      descricao: 'Description',
      logotipo: 'Logo',
      morada: 'Address',
      telefone: 'Phone',
      site: 'Website',
      visivel: 'Visible in the app',
      escolherFicheiro: 'Choose image',
      aEnviar: 'Uploading…',
      guardar: 'Save',
      cancelar: 'Cancel',
      tipo: 'Type',
      fotografia: 'Photo',
      videoLink: 'Video (link)',
      legenda: 'Caption',
      data: 'Date',
      linkDoVideo: 'Video link',
      linkAjuda: 'Paste the Instagram, YouTube or Facebook address',
      semParceiros: 'No partners yet.',
      semMedia: 'No photos or videos published yet.',
      escondido: 'Hidden',
      apagar: 'Delete',
      editar: 'Edit'
    }
  };
  const txt = t[language] || t.pt;

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    try {
      setACarregar(true);
      const [p, m] = await Promise.all([
        axios.get(`${API}/partners`).catch(() => ({ data: [] })),
        axios.get(`${API}/media`).catch(() => ({ data: [] }))
      ]);
      setParceiros(p.data);
      setMedia(m.data);
    } finally {
      setACarregar(false);
    }
  };

  /** Envia a imagem e devolve o endereço onde ficou. */
  const enviarImagem = async (ficheiro) => {
    const corpo = new FormData();
    corpo.append('ficheiro', ficheiro);
    const r = await axios.post(`${API}/uploads`, corpo, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return r.data.url;
  };

  const escolherImagem = async (evento, aoTerminar) => {
    const ficheiro = evento.target.files?.[0];
    if (!ficheiro) return;
    try {
      setAEnviar(true);
      aoTerminar(await enviarImagem(ficheiro));
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Não consegui enviar a imagem.');
    } finally {
      setAEnviar(false);
      evento.target.value = '';
    }
  };

  /* ------------------------------------------------------------ parceiros */

  const abrirParceiro = (p) => {
    setParceiroAEditar(p || null);
    setParceiroForm(p ? { ...PARCEIRO_VAZIO, ...p } : PARCEIRO_VAZIO);
    setParceiroAberto(true);
  };

  const guardarParceiro = async (e) => {
    e.preventDefault();
    const corpo = {
      name: parceiroForm.name.trim(),
      benefit: parceiroForm.benefit.trim(),
      category: parceiroForm.category.trim() || null,
      description: parceiroForm.description.trim() || null,
      logo_url: parceiroForm.logo_url || null,
      address: parceiroForm.address.trim() || null,
      phone: parceiroForm.phone.trim() || null,
      website: parceiroForm.website.trim() || null,
      is_active: parceiroForm.is_active
    };
    try {
      if (parceiroAEditar) {
        await axios.put(`${API}/partners/${parceiroAEditar.id}`, corpo);
        toast.success('Parceiro corrigido.');
      } else {
        await axios.post(`${API}/partners`, corpo);
        toast.success('Parceiro criado.');
      }
      setParceiroAberto(false);
      carregarTudo();
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Erro ao guardar o parceiro');
    }
  };

  const apagarParceiro = async (p) => {
    if (!window.confirm(`Apagar o parceiro "${p.name}"?`)) return;
    try {
      await axios.delete(`${API}/partners/${p.id}`);
      toast.success('Parceiro eliminado.');
      carregarTudo();
    } catch {
      toast.error('Erro ao eliminar o parceiro');
    }
  };

  /* ----------------------------------------------------------- multimédia */

  const guardarMedia = async (e) => {
    e.preventDefault();
    if (!mediaForm.url) {
      toast.error(mediaForm.kind === 'photo' ? 'Escolha uma fotografia.' : 'Cole o link do vídeo.');
      return;
    }
    try {
      await axios.post(`${API}/media`, {
        kind: mediaForm.kind,
        url: mediaForm.url,
        caption: mediaForm.caption.trim() || null,
        taken_on: mediaForm.taken_on || null,
        is_active: mediaForm.is_active
      });
      toast.success('Publicado na aplicação.');
      setMediaAberta(false);
      setMediaForm(MEDIA_VAZIA);
      carregarTudo();
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Erro ao publicar');
    }
  };

  const apagarMedia = async (m) => {
    if (!window.confirm('Apagar esta publicação?')) return;
    try {
      await axios.delete(`${API}/media/${m.id}`);
      toast.success('Publicação eliminada.');
      carregarTudo();
    } catch {
      toast.error('Erro ao eliminar');
    }
  };

  const trocarVisibilidade = async (m) => {
    try {
      await axios.put(`${API}/media/${m.id}`, {
        kind: m.kind, url: m.url, caption: m.caption,
        taken_on: m.taken_on, is_active: !m.is_active
      });
      carregarTudo();
    } catch {
      toast.error('Erro ao alterar');
    }
  };

  /* ---------------------------------------------------------------- ecrã */

  const Separador = ({ id, icone: Icone, texto, quantos }) => (
    <button
      type="button"
      onClick={() => setAba(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
        aba === id ? 'text-white' : 'hover:opacity-80'
      }`}
      style={{
        backgroundColor: aba === id ? 'var(--ko-primary-orange)' : 'var(--background-elevated)',
        color: aba === id ? 'white' : 'var(--text-primary)'
      }}
      data-testid={`aba-${id}`}
    >
      <Icone size={16} />
      {texto}
      <span className="text-xs opacity-80">({quantos})</span>
    </button>
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{txt.titulo}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{txt.subtitulo}</p>
        </div>
        <Button
          onClick={() => (aba === 'parceiros' ? abrirParceiro(null) : setMediaAberta(true))}
          className="btn-hover"
          data-testid="novo-item"
        >
          <Plus className="mr-2" size={16} />
          {aba === 'parceiros' ? txt.novoParceiro : txt.novaFoto}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Separador id="parceiros" icone={Handshake} texto={txt.parceiros} quantos={parceiros.length} />
        <Separador id="multimedia" icone={ImageIcon} texto={txt.multimedia} quantos={media.length} />
      </div>

      {aCarregar ? (
        <Card><CardContent className="p-12 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto" />
        </CardContent></Card>
      ) : aba === 'parceiros' ? (
        parceiros.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
            {txt.semParceiros}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {parceiros.map((p) => (
              <Card key={p.id} className="card-shadow" data-testid={`parceiro-${p.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    {p.logo_url ? (
                      <img
                        src={enderecoDaImagem(p.logo_url)}
                        alt={p.name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center"
                           style={{ background: 'var(--background-elevated)' }}>
                        <Handshake size={22} className="text-gray-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {p.name}
                      </p>
                      <p className="text-sm" style={{ color: 'var(--ko-primary-orange)' }}>
                        {p.benefit}
                      </p>
                      {p.category && (
                        <Badge variant="outline" className="mt-1 text-xs">{p.category}</Badge>
                      )}
                      {!p.is_active && (
                        <Badge variant="outline" className="mt-1 ml-1 text-xs text-gray-500">
                          {txt.escondido}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {(p.address || p.phone) && (
                    <p className="text-xs mt-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                      {[p.address, p.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => abrirParceiro(p)}
                            data-testid={`editar-parceiro-${p.id}`}>
                      <Edit size={14} />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700"
                            onClick={() => apagarParceiro(p)} data-testid={`apagar-parceiro-${p.id}`}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : media.length === 0 ? (
        <Card><CardContent className="p-12 text-center text-gray-500 dark:text-gray-400">
          {txt.semMedia}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {media.map((m) => (
            <Card key={m.id} className="card-shadow overflow-hidden" data-testid={`media-${m.id}`}>
              <div className="aspect-square relative" style={{ background: 'var(--background-elevated)' }}>
                {m.kind === 'photo' ? (
                  <img src={enderecoDaImagem(m.url)} alt={m.caption || ''}
                       className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                    <LinkIcon size={28} className="text-gray-400" />
                    <p className="text-xs text-center break-all" style={{ color: 'var(--text-secondary)' }}>
                      {m.url.replace(/^https?:\/\//, '').slice(0, 40)}
                    </p>
                  </div>
                )}
                {!m.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="outline" className="text-white border-white">{txt.escondido}</Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                {m.caption && (
                  <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{m.caption}</p>
                )}
                <div className="flex justify-end gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                          title={m.is_active ? txt.escondido : txt.visivel}
                          onClick={() => trocarVisibilidade(m)}
                          data-testid={`visibilidade-${m.id}`}>
                    {m.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          onClick={() => apagarMedia(m)} data-testid={`apagar-media-${m.id}`}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Janela do parceiro */}
      <Dialog open={parceiroAberto} onOpenChange={setParceiroAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{parceiroAEditar ? txt.editar : txt.novoParceiro}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarParceiro} className="space-y-4">
            <div>
              <Label htmlFor="p-nome">{txt.nome} *</Label>
              <Input id="p-nome" value={parceiroForm.name} required
                     onChange={(e) => setParceiroForm({ ...parceiroForm, name: e.target.value })}
                     data-testid="parceiro-nome" />
            </div>
            <div>
              <Label htmlFor="p-beneficio">{txt.beneficio} *</Label>
              <Input id="p-beneficio" value={parceiroForm.benefit} required
                     placeholder="10% em consultas de fisioterapia"
                     onChange={(e) => setParceiroForm({ ...parceiroForm, benefit: e.target.value })}
                     data-testid="parceiro-beneficio" />
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                {txt.beneficioAjuda}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="p-categoria">{txt.categoria}</Label>
                <Input id="p-categoria" value={parceiroForm.category} placeholder="Saúde"
                       onChange={(e) => setParceiroForm({ ...parceiroForm, category: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="p-telefone">{txt.telefone}</Label>
                <Input id="p-telefone" value={parceiroForm.phone}
                       onChange={(e) => setParceiroForm({ ...parceiroForm, phone: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="p-morada">{txt.morada}</Label>
              <Input id="p-morada" value={parceiroForm.address}
                     onChange={(e) => setParceiroForm({ ...parceiroForm, address: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="p-site">{txt.site}</Label>
              <Input id="p-site" value={parceiroForm.website} placeholder="https://"
                     onChange={(e) => setParceiroForm({ ...parceiroForm, website: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="p-descricao">{txt.descricao}</Label>
              <Textarea id="p-descricao" rows={3} value={parceiroForm.description}
                        onChange={(e) => setParceiroForm({ ...parceiroForm, description: e.target.value })} />
            </div>

            <div>
              <Label>{txt.logotipo}</Label>
              <div className="flex items-center gap-3 mt-1">
                {parceiroForm.logo_url && (
                  <img src={enderecoDaImagem(parceiroForm.logo_url)} alt=""
                       className="w-16 h-16 rounded-lg object-cover" />
                )}
                <input ref={ficheiroLogo} type="file" accept="image/*" className="hidden"
                       onChange={(e) => escolherImagem(e, (url) =>
                         setParceiroForm((f) => ({ ...f, logo_url: url })))}
                       data-testid="parceiro-logo-input" />
                <Button type="button" variant="outline" disabled={aEnviar}
                        onClick={() => ficheiroLogo.current?.click()}
                        data-testid="parceiro-logo-btn">
                  <Upload className="mr-2" size={14} />
                  {aEnviar ? txt.aEnviar : txt.escolherFicheiro}
                </Button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={parceiroForm.is_active}
                     onChange={(e) => setParceiroForm({ ...parceiroForm, is_active: e.target.checked })} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{txt.visivel}</span>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setParceiroAberto(false)}>
                {txt.cancelar}
              </Button>
              <Button type="submit" data-testid="guardar-parceiro">{txt.guardar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Janela da multimédia */}
      <Dialog open={mediaAberta} onOpenChange={setMediaAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txt.novaFoto}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardarMedia} className="space-y-4">
            <div>
              <Label>{txt.tipo}</Label>
              <Select value={mediaForm.kind}
                      onValueChange={(v) => setMediaForm({ ...mediaForm, kind: v, url: '' })}>
                <SelectTrigger data-testid="media-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">{txt.fotografia}</SelectItem>
                  <SelectItem value="video_link">{txt.videoLink}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mediaForm.kind === 'photo' ? (
              <div>
                <Label>{txt.fotografia} *</Label>
                <div className="flex items-center gap-3 mt-1">
                  {mediaForm.url && (
                    <img src={enderecoDaImagem(mediaForm.url)} alt=""
                         className="w-20 h-20 rounded-lg object-cover" />
                  )}
                  <input ref={ficheiroFoto} type="file" accept="image/*" className="hidden"
                         onChange={(e) => escolherImagem(e, (url) =>
                           setMediaForm((f) => ({ ...f, url })))}
                         data-testid="media-foto-input" />
                  <Button type="button" variant="outline" disabled={aEnviar}
                          onClick={() => ficheiroFoto.current?.click()}
                          data-testid="media-foto-btn">
                    <Upload className="mr-2" size={14} />
                    {aEnviar ? txt.aEnviar : txt.escolherFicheiro}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="m-link">{txt.linkDoVideo} *</Label>
                <Input id="m-link" value={mediaForm.url} placeholder="https://instagram.com/p/..."
                       onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
                       data-testid="media-link" />
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {txt.linkAjuda}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="m-legenda">{txt.legenda}</Label>
              <Input id="m-legenda" value={mediaForm.caption} placeholder="Aula de Boxe de sábado"
                     onChange={(e) => setMediaForm({ ...mediaForm, caption: e.target.value })}
                     data-testid="media-legenda" />
            </div>
            <div>
              <Label htmlFor="m-data">{txt.data}</Label>
              <Input id="m-data" type="date" value={mediaForm.taken_on}
                     onChange={(e) => setMediaForm({ ...mediaForm, taken_on: e.target.value })} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setMediaAberta(false)}>
                {txt.cancelar}
              </Button>
              <Button type="submit" disabled={aEnviar} data-testid="guardar-media">{txt.guardar}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppDoSocio;
