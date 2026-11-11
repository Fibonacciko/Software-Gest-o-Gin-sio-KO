import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Activity, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VAZIA = {
  assessment_date: '',
  weight_kg: '',
  height_cm: '',
  body_fat_pct: '',
  muscle_mass_kg: '',
  water_pct: '',
  visceral_fat: '',
  metabolic_age: '',
  notes: ''
};

/**
 * Os campos, por ordem de importância.
 *
 * `melhorADescer` diz para que lado é que a seta é boa notícia: no peso e na
 * massa gorda, descer; na massa muscular e na água, subir. Sem isto a seta
 * era só uma seta, e quem a lê ao balcão tinha de pensar duas vezes.
 */
const CAMPOS = [
  { campo: 'weight_kg', etiqueta: 'Peso', unidade: 'kg', passo: '0.1', melhorADescer: true },
  { campo: 'height_cm', etiqueta: 'Altura', unidade: 'cm', passo: '0.5', semTendencia: true },
  { campo: 'body_fat_pct', etiqueta: 'Massa gorda', unidade: '%', passo: '0.1', melhorADescer: true },
  { campo: 'muscle_mass_kg', etiqueta: 'Massa muscular', unidade: 'kg', passo: '0.1', melhorADescer: false },
  { campo: 'water_pct', etiqueta: 'Água', unidade: '%', passo: '0.1', melhorADescer: false },
  { campo: 'visceral_fat', etiqueta: 'Gordura visceral', unidade: '', passo: '0.1', melhorADescer: true },
  { campo: 'metabolic_age', etiqueta: 'Idade metabólica', unidade: 'anos', passo: '1', melhorADescer: true }
];

const dataPt = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-PT') : '—');

/** A data de hoje nos componentes locais: `toISOString()` recua um dia cá. */
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * As avaliações físicas de um sócio: o que a balança mediu, e a evolução.
 *
 * O IMC não se escreve — vem calculado do servidor, do peso e da altura da
 * própria avaliação. Um IMC escrito à mão sobrevive à correção do peso que
 * lhe deu origem, e aí o gráfico do sócio passa a mentir.
 */
const AvaliacoesDoSocio = ({ socio }) => {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aberta, setAberta] = useState(false);
  const [aEditar, setAEditar] = useState(null);
  const [form, setForm] = useState(VAZIA);

  const carregar = useCallback(async () => {
    if (!socio?.id) return;
    try {
      setACarregar(true);
      const r = await axios.get(`${API}/members/${socio.id}/assessments`);
      setAvaliacoes(r.data);
    } catch {
      setAvaliacoes([]);
    } finally {
      setACarregar(false);
    }
  }, [socio?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrir = (a) => {
    setAEditar(a || null);
    if (a) {
      setForm({
        ...VAZIA,
        ...Object.fromEntries(
          Object.keys(VAZIA).map((k) => [k, a[k] === null || a[k] === undefined ? '' : String(a[k])])
        ),
        assessment_date: a.assessment_date ? a.assessment_date.slice(0, 10) : hojeLocal()
      });
    } else {
      // A altura não muda de mês para mês: traz-se a da última medição
      const ultima = avaliacoes[0];
      setForm({
        ...VAZIA,
        assessment_date: hojeLocal(),
        height_cm: ultima?.height_cm ? String(ultima.height_cm) : ''
      });
    }
    setAberta(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const numero = (v) => (v === '' || v === null ? null : Number(v));
    const corpo = {
      assessment_date: form.assessment_date || hojeLocal(),
      weight_kg: numero(form.weight_kg),
      height_cm: numero(form.height_cm),
      body_fat_pct: numero(form.body_fat_pct),
      muscle_mass_kg: numero(form.muscle_mass_kg),
      water_pct: numero(form.water_pct),
      visceral_fat: numero(form.visceral_fat),
      metabolic_age: numero(form.metabolic_age),
      notes: form.notes.trim() || null
    };
    try {
      if (aEditar) {
        await axios.put(`${API}/assessments/${aEditar.id}`, corpo);
        toast.success('Avaliação corrigida.');
      } else {
        await axios.post(`${API}/members/${socio.id}/assessments`, corpo);
        toast.success('Avaliação registada.');
      }
      setAberta(false);
      carregar();
    } catch (erro) {
      toast.error(erro.response?.data?.detail || 'Erro ao guardar');
    }
  };

  const apagar = async (a) => {
    if (!window.confirm(`Apagar a avaliação de ${dataPt(a.assessment_date)}?`)) return;
    try {
      await axios.delete(`${API}/assessments/${a.id}`);
      toast.success('Avaliação eliminada.');
      carregar();
    } catch {
      toast.error('Erro ao eliminar');
    }
  };

  /** A diferença para a avaliação anterior, com a cor certa. */
  const Tendencia = ({ campo, indice }) => {
    const def = CAMPOS.find((c) => c.campo === campo);
    if (!def || def.semTendencia) return null;
    // A lista vem da mais recente para trás: a anterior é a seguinte
    const agora = avaliacoes[indice]?.[campo];
    const antes = avaliacoes[indice + 1]?.[campo];
    if (agora === null || agora === undefined || antes === null || antes === undefined) return null;

    const delta = Number(agora) - Number(antes);
    if (Math.abs(delta) < 0.05) return <span className="text-xs text-gray-400 ml-1">=</span>;

    const bom = def.melhorADescer ? delta < 0 : delta > 0;
    return (
      <span className={`text-xs ml-1 ${bom ? 'text-green-600' : 'text-red-600'}`}>
        {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
      </span>
    );
  };

  return (
    <div data-testid="avaliacoes">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium flex items-center gap-2">
          <Activity size={16} />
          Avaliação física
        </h4>
        <Button size="sm" variant="outline" onClick={() => abrir(null)} data-testid="nova-avaliacao">
          <Plus size={14} className="mr-1" /> Nova
        </Button>
      </div>

      {aCarregar ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
      ) : avaliacoes.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Ainda não há medições. Carregue em Nova depois de usar a balança — o sócio passa
          a ver a evolução no telemóvel.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {avaliacoes.map((a, i) => (
            <div
              key={a.id}
              className="p-3 rounded-lg"
              style={{ background: 'var(--background-elevated)', border: '1px solid var(--border-light)' }}
              data-testid={`avaliacao-${a.id}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">{dataPt(a.assessment_date)}</span>
                <div className="flex items-center gap-1">
                  {a.bmi !== null && a.bmi !== undefined && (
                    <Badge variant="outline" className="text-xs font-normal">IMC {a.bmi}</Badge>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => abrir(a)} data-testid={`editar-avaliacao-${a.id}`}>
                    <Edit size={13} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                          onClick={() => apagar(a)} data-testid={`apagar-avaliacao-${a.id}`}>
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-2">
                {CAMPOS.filter((c) => a[c.campo] !== null && a[c.campo] !== undefined).map((c) => (
                  <div key={c.campo} className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{c.etiqueta}: </span>
                    <span className="font-medium">
                      {a[c.campo]}{c.unidade ? ` ${c.unidade}` : ''}
                    </span>
                    <Tendencia campo={c.campo} indice={i} />
                  </div>
                ))}
              </div>

              {a.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{a.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={aberta} onOpenChange={setAberta}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{aEditar ? 'Corrigir avaliação' : 'Nova avaliação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <Label>Data *</Label>
              <Input
                type="date"
                value={form.assessment_date}
                onChange={(e) => setForm({ ...form, assessment_date: e.target.value })}
                required
                data-testid="avaliacao-data"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {CAMPOS.map((c) => (
                <div key={c.campo}>
                  <Label>
                    {c.etiqueta}{c.unidade ? ` (${c.unidade})` : ''}
                    {c.campo === 'weight_kg' ? ' *' : ''}
                  </Label>
                  <Input
                    type="number"
                    step={c.passo}
                    min="0"
                    value={form[c.campo]}
                    onChange={(e) => setForm({ ...form, [c.campo]: e.target.value })}
                    required={c.campo === 'weight_kg'}
                    data-testid={`avaliacao-${c.campo}`}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Só o peso é obrigatório — nem todas as balanças dão tudo. O IMC é calculado
              do peso e da altura, não se escreve.
            </p>

            <div>
              <Label>Notas</Label>
              <Input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Opcional"
                data-testid="avaliacao-notas"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAberta(false)}>
                Cancelar
              </Button>
              <Button type="submit" data-testid="guardar-avaliacao">Guardar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvaliacoesDoSocio;
