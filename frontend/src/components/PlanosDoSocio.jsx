import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ClipboardList, Plus, Edit, Trash2, Upload, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND}/api`;

const TIPOS = {
  training: { etiqueta: 'Treino', cor: '#E8842A' },
  nutrition: { etiqueta: 'Alimentação', cor: '#16a34a' }
};

const VAZIO = { kind: 'training', title: '', content: '', notes: '', file_url: '', plan_date: '' };

const dataPt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : '—');

const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const enderecoCompleto = (url) => (url?.startsWith('http') ? url : `${BACKEND}${url}`);

/**
 * Os planos de treino e alimentares de um sócio.
 *
 * Um plano é um PDF ou um texto escrito — o que o professor tiver. Guardar um
 * plano novo **não apaga o anterior**: é o histórico que permite dizer ao
 * sócio o que mudou desde a última vez.
 *
 * Guardar um plano fecha sozinho o pedido que o sócio tenha feito pela
 * aplicação, para ninguém ter de se lembrar de o riscar da lista.
 */
const PlanosDoSocio = ({ socio }) => {
  const [planos, setPlanos] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aberta, setAberta] = useState(false);
  const [aEditar, setAEditar] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [aEnviar, setAEnviar] = useState(false);
  const ficheiro = useRef(null);

  const carregar = useCallback(async () => {
    if (!socio?.id) return;
    try {
      setACarregar(true);
      const r = await axios.get(`${API}/members/${socio.id}/plans`);
      setPlanos(r.data);
    } catch {
      setPlanos([]);
    } finally {
      setACarregar(false);
    }
  }, [socio?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrir = (p) => {
    setAEditar(p || null);
    setForm(
      p
        ? {
            kind: p.kind,
            title: p.title || '',
            content: p.content || '',
            notes: p.notes || '',
            file_url: p.file_url || '',
            plan_date: p.plan_date ? p.plan_date.slice(0, 10) : hojeLocal()
          }
        : { ...VAZIO, plan_date: hojeLocal() }
    );
    setAberta(true);
  };

  const escolherFicheiro = async (evento) => {
    const f = evento.target.files?.[0];
    if (!f) return;
    try {
      setAEnviar(true);
      const corpo = new FormData();
      corpo.append('ficheiro', f);
      const r = await axios.post(`${API}/uploads`, corpo, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm((x) => ({ ...x, file_url: r.data.url }));
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Não consegui enviar o ficheiro.');
    } finally {
      setAEnviar(false);
      evento.target.value = '';
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    const corpo = {
      kind: form.kind,
      title: form.title.trim() || TIPOS[form.kind].etiqueta,
      content: form.content.trim() || null,
      notes: form.notes.trim() || null,
      file_url: form.file_url || null,
      plan_date: form.plan_date || hojeLocal()
    };
    try {
      if (aEditar) {
        await axios.put(`${API}/plans/${aEditar.id}`, corpo);
        toast.success('Plano guardado.');
      } else {
        await axios.post(`${API}/members/${socio.id}/plans`, corpo);
        toast.success('Plano guardado. O sócio já o vê no telemóvel.');
      }
      setAberta(false);
      carregar();
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Erro ao guardar');
    }
  };

  const apagar = async (p) => {
    if (!window.confirm(`Apagar "${p.title}"? O sócio deixa de o ver.`)) return;
    try {
      await axios.delete(`${API}/plans/${p.id}`);
      toast.success('Plano eliminado.');
      carregar();
    } catch {
      toast.error('Erro ao eliminar');
    }
  };

  return (
    <div data-testid="planos">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <ClipboardList size={16} />
          Planos
        </h4>
        <Button size="sm" variant="outline" onClick={() => abrir(null)} data-testid="novo-plano">
          <Plus size={14} className="mr-1" /> Novo
        </Button>
      </div>

      {aCarregar ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
      ) : planos.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ainda não há planos. Carregue o PDF do professor ou escreva o plano — o sócio
          passa a vê-lo no telemóvel.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {planos.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-lg"
              style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-light)' }}
              data-testid={`plano-${p.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="text-xs font-normal"
                      style={{ borderColor: TIPOS[p.kind]?.cor, color: TIPOS[p.kind]?.cor }}
                    >
                      {TIPOS[p.kind]?.etiqueta || p.kind}
                    </Badge>
                    <span className="text-sm font-semibold truncate">{p.title}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {dataPt(p.plan_date)}
                    {p.file_url ? ' · PDF' : p.content ? ' · escrito' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.file_url && (
                    <a
                      href={enderecoCompleto(p.file_url)}
                      target="_blank"
                      rel="noreferrer"
                      title="Abrir o PDF"
                      className="h-7 w-7 flex items-center justify-center rounded hover:opacity-70"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => abrir(p)} data-testid={`editar-plano-${p.id}`}>
                    <Edit size={13} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                          onClick={() => apagar(p)} data-testid={`apagar-plano-${p.id}`}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
              {p.content && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 line-clamp-3 whitespace-pre-line">
                  {p.content}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{aEditar ? 'Corrigir plano' : 'Novo plano'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger data-testid="plano-tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Treino</SelectItem>
                    <SelectItem value="nutrition">Alimentação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.plan_date}
                  onChange={(e) => setForm({ ...form, plan_date: e.target.value })}
                  required
                  data-testid="plano-data"
                />
              </div>
            </div>

            <div>
              <Label>Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={`Ex: ${TIPOS[form.kind].etiqueta} de ${new Date().toLocaleDateString('pt-PT', { month: 'long' })}`}
                data-testid="plano-titulo"
              />
            </div>

            <div>
              <Label>Ficheiro (PDF)</Label>
              <div className="flex items-center gap-3 mt-1">
                {form.file_url && (
                  <a
                    href={enderecoCompleto(form.file_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-500 hover:underline"
                  >
                    <FileText size={14} /> ver
                  </a>
                )}
                <input type="file" accept="application/pdf" hidden ref={ficheiro}
                       onChange={escolherFicheiro} />
                <Button type="button" variant="outline" size="sm" disabled={aEnviar}
                        onClick={() => ficheiro.current?.click()} data-testid="plano-ficheiro">
                  <Upload size={14} className="mr-2" />
                  {aEnviar ? 'A enviar…' : form.file_url ? 'Trocar' : 'Escolher PDF'}
                </Button>
                {form.file_url && (
                  <Button type="button" variant="ghost" size="sm" className="text-red-600"
                          onClick={() => setForm({ ...form, file_url: '' })}>
                    Tirar
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Ou escrever o plano</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={5}
                placeholder={'Segunda: peito e tríceps\nQuarta: costas e bíceps\nSexta: pernas'}
                data-testid="plano-texto"
              />
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Tem de ter uma coisa ou a outra — um PDF ou texto. Guardar um plano novo não
              apaga o anterior, e fecha o pedido que o sócio tenha feito pela aplicação.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAberta(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="guardar-plano">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanosDoSocio;
