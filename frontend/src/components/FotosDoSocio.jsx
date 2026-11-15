import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Images, Plus, Trash2, Upload, Eye, EyeOff, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;

const enderecoCompleto = (url) => (url?.startsWith('http') ? url : `${BACKEND}${url}`);

const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const VAZIO = { kind: 'photo', url: '', caption: '', taken_on: '', is_active: true };

/**
 * As fotografias partilhadas com um sócio.
 *
 * **Eram uma galeria igual para toda a gente**, em App do Sócio → Multimédia,
 * e mudaram-se para aqui por decisão do dono: o que ele quer partilhar são as
 * fotos *daquele* sócio — o filho na aula de Kids, o combate de sábado — e
 * isso não é para os outros trezentos verem. A galeria passou a viver onde o
 * sócio vive, ao lado das avaliações e dos planos.
 *
 * O sócio **não carrega nada**: só vê e guarda o que o ginásio lhe mandou.
 *
 * O **colaborador também publica** — é quem está no ginásio a tirar as fotos.
 *
 * As **fotografias ficam alojadas aqui**; os **vídeos são links** para as
 * redes do ginásio. Um minuto de vídeo de telemóvel são 50 a 100 MB, e as
 * redes já têm o conteúdo e já têm público.
 */
const FotosDoSocio = ({ socio }) => {
  const [fotos, setFotos] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aberta, setAberta] = useState(false);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);
  const ficheiro = useRef(null);

  const carregar = useCallback(async () => {
    if (!socio?.id) return;
    try {
      setACarregar(true);
      const r = await axios.get(`${API}/media`, { params: { member_id: socio.id } });
      setFotos(r.data);
    } catch {
      setFotos([]);
    } finally {
      setACarregar(false);
    }
  }, [socio?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const escolherImagem = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const dados = new FormData();
    dados.append('ficheiro', f);
    try {
      setAEnviar(true);
      const r = await axios.post(`${API}/uploads`, dados);
      setForm((x) => ({ ...x, url: r.data.url }));
    } catch (erro) {
      toast.error(erro?.response?.data?.detail || 'Não consegui enviar a fotografia');
    } finally {
      setAEnviar(false);
      e.target.value = '';
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.url) {
      toast.error(form.kind === 'photo' ? 'Escolha uma fotografia.' : 'Cole o link do vídeo.');
      return;
    }
    try {
      await axios.post(`${API}/media`, {
        member_id: socio.id,
        kind: form.kind,
        url: form.url,
        caption: form.caption.trim() || null,
        taken_on: form.taken_on || null,
        is_active: form.is_active,
      });
      toast.success(`Partilhado com ${socio.name.split(' ')[0]}`);
      setAberta(false);
      setForm(VAZIO);
      carregar();
    } catch (erro) {
      toast.error(erro?.response?.data?.detail || 'Não foi possível partilhar');
    }
  };

  const apagar = async (m) => {
    if (!window.confirm('Apagar esta partilha? O sócio deixa de a ver, e esta ação não se desfaz.')) {
      return;
    }
    try {
      await axios.delete(`${API}/media/${m.id}`);
      toast.success('Partilha apagada');
      carregar();
    } catch {
      toast.error('Não foi possível apagar');
    }
  };

  /** Esconder sem apagar: o sócio deixa de a ver, o ficheiro fica. */
  const trocarVisibilidade = async (m) => {
    try {
      await axios.put(`${API}/media/${m.id}`, {
        member_id: socio.id,
        kind: m.kind,
        url: m.url,
        caption: m.caption,
        taken_on: m.taken_on,
        is_active: !m.is_active,
      });
      carregar();
    } catch {
      toast.error('Não foi possível mudar');
    }
  };

  const abrirNova = () => {
    setForm({ ...VAZIO, taken_on: hojeLocal() });
    setAberta(true);
  };

  const primeiroNome = socio?.name?.split(' ')[0] || 'o sócio';

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Images size={16} />
          Fotografias
          {fotos.length > 0 && <Badge variant="outline" className="text-xs">{fotos.length}</Badge>}
        </h4>
        <Button size="sm" variant="outline" onClick={abrirNova} data-testid="nova-foto-socio">
          <Plus size={14} className="mr-1" />
          Partilhar
        </Button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Só {primeiroNome} as vê, na aplicação. Nenhum outro sócio lhes chega.
      </p>

      {aCarregar ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
      ) : fotos.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ainda não partilhou nada com {primeiroNome}.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {fotos.map((m) => (
            <div
              key={m.id}
              className="rounded-lg overflow-hidden"
              style={{ border: '1px solid var(--border-light)' }}
              data-testid={`foto-socio-${m.id}`}
            >
              <div className="aspect-square relative" style={{ background: 'var(--background-elevated)' }}>
                {m.kind === 'photo' ? (
                  <img
                    src={enderecoCompleto(m.url)}
                    alt={m.caption || ''}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <LinkIcon size={22} className="text-gray-400" />
                    <p className="text-[10px] text-center break-all" style={{ color: 'var(--text-secondary)' }}>
                      {m.url.replace(/^https?:\/\//, '').slice(0, 30)}
                    </p>
                  </div>
                )}
                {!m.is_active && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Badge variant="outline" className="text-white border-white text-xs">Escondida</Badge>
                  </div>
                )}
              </div>
              <div className="p-2">
                {m.caption && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{m.caption}</p>
                )}
                <div className="flex justify-end gap-1 mt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    title={m.is_active ? 'Esconder do sócio' : 'Voltar a mostrar'}
                    onClick={() => trocarVisibilidade(m)}
                    data-testid={`visibilidade-foto-${m.id}`}
                  >
                    {m.is_active ? <Eye size={13} /> : <EyeOff size={13} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    onClick={() => apagar(m)}
                    data-testid={`apagar-foto-${m.id}`}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partilhar com {socio?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v, url: '' })}
              >
                <SelectTrigger data-testid="foto-socio-tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="photo">Fotografia</SelectItem>
                  <SelectItem value="video_link">Vídeo (link)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.kind === 'photo' ? (
              <div>
                <Label>Fotografia *</Label>
                <div className="flex items-center gap-3 mt-1">
                  {form.url && (
                    <img
                      src={enderecoCompleto(form.url)}
                      alt=""
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                  {/* `image/*` sem `capture`: no telemóvel abre a galeria e a
                      câmara, e no computador o explorador de ficheiros. */}
                  <input
                    ref={ficheiro}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={escolherImagem}
                    data-testid="foto-socio-input"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={aEnviar}
                    onClick={() => ficheiro.current?.click()}
                    data-testid="foto-socio-btn"
                  >
                    <Upload className="mr-2" size={14} />
                    {aEnviar ? 'A enviar…' : 'Escolher ficheiro'}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="link-video">Link do vídeo *</Label>
                <Input
                  id="link-video"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://www.instagram.com/…"
                  data-testid="foto-socio-link"
                />
              </div>
            )}

            <div>
              <Label htmlFor="legenda">Legenda</Label>
              <Input
                id="legenda"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                placeholder="Aula de Kids, combate de sábado…"
                data-testid="foto-socio-legenda"
              />
            </div>

            <div>
              <Label htmlFor="quando">Quando</Label>
              <Input
                id="quando"
                type="date"
                value={form.taken_on}
                onChange={(e) => setForm({ ...form, taken_on: e.target.value })}
                data-testid="foto-socio-data"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Visível para {primeiroNome}
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAberta(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="guardar-foto-socio">Partilhar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FotosDoSocio;
