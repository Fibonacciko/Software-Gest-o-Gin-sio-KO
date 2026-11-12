import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CalendarDays, Plus, Edit, Trash2, Users, Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** 0 = segunda, como o Python. É a mesma numeração dos dois lados. */
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

const VAZIA = {
  activity_id: '',
  label: '',
  weekday: '0',
  start_time: '19:00',
  duration_min: '60',
  instructor: '',
  capacity: '20',
  is_active: true
};

/** A data de hoje nos componentes locais: `toISOString()` recua um dia cá. */
const diaLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dataPt = (iso) =>
  new Date(`${String(iso).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });

/**
 * O horário das aulas e as marcações.
 *
 * São duas leituras da mesma coisa, e por isso estão na mesma página:
 *
 * - a **grelha semanal**, que se escreve uma vez e se repete — só o
 *   administrador lhe mexe, porque é o horário do ginásio;
 * - os **próximos dias**, que é a grelha já aplicada ao calendário, com quem
 *   se inscreveu. Aqui o colaborador também cancela uma aula pontual: é ele
 *   que atende o telefone do professor doente.
 */
const Aulas = () => {
  const { isAdmin } = useAuth();
  const [grelha, setGrelha] = useState([]);
  const [modalidades, setModalidades] = useState([]);
  const [proximas, setProximas] = useState([]);
  const [aCarregar, setACarregar] = useState(true);

  const [aberta, setAberta] = useState(false);
  const [aEditar, setAEditar] = useState(null);
  const [form, setForm] = useState(VAZIA);

  const [inscritosAbertos, setInscritosAbertos] = useState(null);
  const [inscritos, setInscritos] = useState([]);

  const carregar = useCallback(async () => {
    try {
      setACarregar(true);
      const hoje = new Date();
      const daquiA14 = new Date();
      daquiA14.setDate(daquiA14.getDate() + 13);

      const [g, m, p] = await Promise.all([
        axios.get(`${API}/class-slots`),
        axios.get(`${API}/activities`),
        axios.get(`${API}/classes`, {
          params: { start_date: diaLocal(hoje), end_date: diaLocal(daquiA14) }
        })
      ]);
      setGrelha(g.data);
      setModalidades(m.data);
      setProximas(p.data);
    } catch {
      toast.error('Não consegui carregar as aulas.');
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrir = (aula) => {
    setAEditar(aula || null);
    setForm(
      aula
        ? {
            activity_id: aula.activity_id,
            label: aula.label || '',
            weekday: String(aula.weekday),
            start_time: aula.start_time,
            duration_min: String(aula.duration_min),
            instructor: aula.instructor || '',
            capacity: String(aula.capacity),
            is_active: aula.is_active
          }
        : { ...VAZIA, activity_id: modalidades[0]?.id || '' }
    );
    setAberta(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const corpo = {
      activity_id: form.activity_id,
      label: form.label.trim() || null,
      weekday: parseInt(form.weekday, 10),
      start_time: form.start_time,
      duration_min: parseInt(form.duration_min, 10) || 60,
      instructor: form.instructor.trim() || null,
      capacity: parseInt(form.capacity, 10) || 1,
      is_active: form.is_active
    };
    try {
      if (aEditar) {
        await axios.put(`${API}/class-slots/${aEditar.id}`, corpo);
        toast.success('Aula guardada.');
      } else {
        await axios.post(`${API}/class-slots`, corpo);
        toast.success('Aula criada. Repete-se todas as semanas.');
      }
      setAberta(false);
      carregar();
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Erro ao guardar');
    }
  };

  const apagar = async (aula) => {
    const nome = modalidades.find((m) => m.id === aula.activity_id)?.name || 'esta aula';
    if (
      !window.confirm(
        `Apagar ${nome} de ${DIAS[aula.weekday]} às ${aula.start_time}?\n\n` +
          'Sai da grelha e as inscrições que já existirem são apagadas.'
      )
    )
      return;
    try {
      await axios.delete(`${API}/class-slots/${aula.id}`);
      toast.success('Aula eliminada.');
      carregar();
    } catch {
      toast.error('Erro ao eliminar');
    }
  };

  const cancelarAula = async (ocorrencia) => {
    const nota = window.prompt(
      `Cancelar ${ocorrencia.activity_name} de ${dataPt(ocorrencia.class_date)}?\n\n` +
        'Porquê? (aparece ao sócio)',
      'Professor ausente'
    );
    if (nota === null) return;
    try {
      await axios.post(`${API}/class-slots/${ocorrencia.slot_id}/exceptions`, {
        class_date: String(ocorrencia.class_date).slice(0, 10),
        cancelled: true,
        note: nota || null
      });
      toast.success('Aula cancelada nesse dia.');
      carregar();
    } catch {
      toast.error('Erro ao cancelar');
    }
  };

  const reporAula = async (ocorrencia) => {
    try {
      await axios.delete(
        `${API}/class-slots/${ocorrencia.slot_id}/exceptions/${String(ocorrencia.class_date).slice(0, 10)}`
      );
      toast.success('Aula reposta.');
      carregar();
    } catch {
      toast.error('Erro ao repor');
    }
  };

  const verInscritos = async (ocorrencia) => {
    setInscritosAbertos(ocorrencia);
    try {
      const r = await axios.get(
        `${API}/classes/${ocorrencia.slot_id}/${String(ocorrencia.class_date).slice(0, 10)}/bookings`
      );
      setInscritos(r.data);
    } catch {
      setInscritos([]);
    }
  };

  const nomeDaModalidade = (id) => modalidades.find((m) => m.id === id)?.name || '—';
  const corDaModalidade = (id) => modalidades.find((m) => m.id === id)?.color || '#888';

  /** As ocorrências agrupadas por dia, para a lista dos próximos dias. */
  const porDia = () => {
    const grupos = new Map();
    proximas.forEach((o) => {
      const dia = String(o.class_date).slice(0, 10);
      if (!grupos.has(dia)) grupos.set(dia, []);
      grupos.get(dia).push(o);
    });
    return [...grupos.entries()];
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Aulas</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            O horário repete-se todas as semanas. As excepções são de um dia só.
          </p>
        </div>
        {isAdmin() && (
          <Button onClick={() => abrir(null)} className="btn-hover" data-testid="nova-aula">
            <Plus className="mr-2" size={16} /> Nova aula
          </Button>
        )}
      </div>

      {/* --------------------------------------------- a grelha semanal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays size={18} />
            Horário semanal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aCarregar ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
          ) : grelha.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ainda não há horário. {isAdmin() ? 'Carregue em Nova aula para começar.' : ''}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {DIAS.map((dia, i) => {
                const doDia = grelha
                  .filter((a) => a.weekday === i)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (doDia.length === 0) return null;
                return (
                  <div key={dia} data-testid={`dia-${i}`}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2"
                       style={{ color: 'var(--text-secondary)' }}>
                      {dia}
                    </p>
                    <div className="space-y-2">
                      {doDia.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-lg"
                          style={{
                            background: 'var(--background-elevated)',
                            border: '1px solid var(--border-light)',
                            opacity: a.is_active ? 1 : 0.5
                          }}
                          data-testid={`aula-${a.id}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm truncate"
                                 style={{ color: corDaModalidade(a.activity_id) }}>
                                {nomeDaModalidade(a.activity_id)}
                                {a.label ? ` · ${a.label}` : ''}
                              </p>
                              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {a.start_time} · {a.duration_min} min · {a.capacity} lugares
                              </p>
                              {a.instructor && (
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {a.instructor}
                                </p>
                              )}
                              {!a.is_active && (
                                <Badge variant="outline" className="text-xs mt-1">Desligada</Badge>
                              )}
                            </div>
                            {isAdmin() && (
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                        onClick={() => abrir(a)} data-testid={`editar-aula-${a.id}`}>
                                  <Edit size={13} />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                                        onClick={() => apagar(a)} data-testid={`apagar-aula-${a.id}`}>
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------- os próximos 14 dias */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Próximos dias</CardTitle>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Quem se inscreveu, e quem espera. Carregue no número para ver os nomes.
          </p>
        </CardHeader>
        <CardContent>
          {proximas.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sem aulas nos próximos dias.
            </p>
          ) : (
            <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-1">
              {porDia().map(([dia, aulas]) => (
                <div key={dia}>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2"
                     style={{ color: 'var(--text-secondary)' }}>
                    {dataPt(dia)}
                  </p>
                  <div className="space-y-2">
                    {aulas.map((o) => (
                      <div
                        key={`${o.slot_id}-${dia}`}
                        className="p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap"
                        style={{
                          background: 'var(--background-elevated)',
                          border: '1px solid var(--border-light)',
                          opacity: o.cancelled ? 0.55 : 1
                        }}
                        data-testid={`ocorrencia-${o.slot_id}-${dia}`}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-sm" style={{ color: o.activity_color }}>
                            {o.start_time} · {o.activity_name}
                            {o.label ? ` · ${o.label}` : ''}
                            {o.cancelled && (
                              <span className="ml-2 text-xs text-red-500">CANCELADA</span>
                            )}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {o.instructor || 'sem professor'}
                            {o.note ? ` · ${o.note}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verInscritos(o)}
                            data-testid={`inscritos-${o.slot_id}-${dia}`}
                          >
                            <Users size={13} className="mr-1" />
                            {o.booked}/{o.capacity}
                            {o.waiting > 0 && (
                              <span className="ml-1 text-amber-500">+{o.waiting}</span>
                            )}
                          </Button>
                          {o.cancelled ? (
                            <Button variant="ghost" size="icon" className="h-8 w-8"
                                    title="Repor a aula" onClick={() => reporAula(o)}>
                              <RotateCcw size={14} />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600"
                                    title="Cancelar só neste dia" onClick={() => cancelarAula(o)}>
                              <Ban size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* --------------------------------------------- criar / corrigir */}
      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{aEditar ? 'Corrigir aula' : 'Nova aula'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Modalidade *</Label>
                <Select value={form.activity_id}
                        onValueChange={(v) => setForm({ ...form, activity_id: v })}>
                  <SelectTrigger data-testid="aula-modalidade"><SelectValue placeholder="Escolher" /></SelectTrigger>
                  <SelectContent>
                    {modalidades.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Nível ou turma</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder="Ex: Kids, Iniciados, Nível I/II — deixe vazio se não houver"
                  data-testid="aula-nivel"
                />
              </div>

              <div>
                <Label>Dia da semana *</Label>
                <Select value={form.weekday} onValueChange={(v) => setForm({ ...form, weekday: v })}>
                  <SelectTrigger data-testid="aula-dia"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DIAS.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Hora *</Label>
                <Input type="time" value={form.start_time} required
                       onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                       data-testid="aula-hora" />
              </div>

              <div>
                <Label>Duração (min)</Label>
                <Input type="number" min="15" step="5" value={form.duration_min}
                       onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
                       data-testid="aula-duracao" />
              </div>

              <div>
                <Label>Lugares *</Label>
                <Input type="number" min="1" value={form.capacity} required
                       onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                       data-testid="aula-lugares" />
              </div>

              <div className="col-span-2">
                <Label>Professor</Label>
                <Input value={form.instructor}
                       onChange={(e) => setForm({ ...form, instructor: e.target.value })}
                       placeholder="Opcional" data-testid="aula-professor" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.is_active}
                     onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Aula a decorrer
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Desligar tira-a do horário sem a apagar — serve para uma pausa de verão.
              Para faltar só num dia, use o botão de cancelar nos Próximos dias.
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAberta(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="guardar-aula">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------- quem se inscreveu */}
      <Dialog open={!!inscritosAbertos} onOpenChange={(a) => !a && setInscritosAbertos(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inscritosAbertos
                ? `${inscritosAbertos.activity_name}${inscritosAbertos.label ? ` · ${inscritosAbertos.label}` : ''} · ${dataPt(inscritosAbertos.class_date)} · ${inscritosAbertos.start_time}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {inscritos.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ainda ninguém se inscreveu.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inscritos.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-2 p-2 rounded"
                     style={{ background: 'var(--background-elevated)' }}>
                  <span className="text-sm truncate">
                    <span className="font-mono text-xs opacity-60 mr-2">#{i.member_number}</span>
                    {i.member_name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs font-normal shrink-0"
                    style={{
                      borderColor: i.status === 'waiting' ? '#f59e0b' : i.status === 'attended' ? '#16a34a' : '#888',
                      color: i.status === 'waiting' ? '#f59e0b' : i.status === 'attended' ? '#16a34a' : '#888'
                    }}
                  >
                    {i.status === 'waiting' ? 'Em espera' : i.status === 'attended' ? 'Veio' : 'Inscrito'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Aulas;
