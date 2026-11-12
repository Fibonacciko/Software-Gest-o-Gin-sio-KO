import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { CalendarDays, Users } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/** A data de hoje nos componentes locais: `toISOString()` recua um dia cá. */
const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ESTADOS = {
  attended: { texto: 'Veio', cor: '#16a34a' },
  booked: { texto: 'Inscrito', cor: '#888' },
  waiting: { texto: 'Em espera', cor: '#f59e0b' }
};

/**
 * As aulas de hoje, com quantos se inscreveram em cada.
 *
 * Vive no Painel e não só na página Aulas porque é a primeira coisa que quem
 * abre o balcão de manhã precisa de saber: o que o dia tem e quanta gente
 * esperar. A página Aulas continua a ser onde se mexe no horário.
 */
const AulasDeHoje = () => {
  const [aulas, setAulas] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [aberta, setAberta] = useState(null);
  const [inscritos, setInscritos] = useState([]);

  const carregar = useCallback(async () => {
    try {
      const dia = hojeLocal();
      const r = await axios.get(`${API}/classes`, {
        params: { start_date: dia, end_date: dia }
      });
      setAulas(r.data);
    } catch {
      setAulas([]);
    } finally {
      setACarregar(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const verInscritos = async (aula) => {
    setAberta(aula);
    setInscritos([]);
    try {
      const r = await axios.get(
        `${API}/classes/${aula.slot_id}/${String(aula.class_date).slice(0, 10)}/bookings`
      );
      setInscritos(r.data);
    } catch {
      setInscritos([]);
    }
  };

  // Sem horário carregado não há nada a dizer, e um cartão vazio só ocupa espaço
  if (!aCarregar && aulas.length === 0) return null;

  return (
    <>
      <Card
        style={{
          background: 'var(--gradient-card-bg)',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border-light)'
        }}
        data-testid="aulas-de-hoje"
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base" style={{ color: 'var(--text-primary)' }}>
            <CalendarDays size={18} className="ko-text-primary" />
            Aulas de hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aCarregar ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {aulas.map((a) => (
                <div
                  key={a.slot_id}
                  className="p-3 rounded-lg flex items-center justify-between gap-3"
                  style={{
                    background: 'var(--background-elevated)',
                    border: '1px solid var(--border-light)',
                    opacity: a.cancelled ? 0.55 : 1
                  }}
                  data-testid={`aula-hoje-${a.slot_id}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm" style={{ color: a.activity_color }}>
                      {a.start_time} · {a.activity_name}
                      {a.label ? ` · ${a.label}` : ''}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {a.cancelled ? `Cancelada${a.note ? ` — ${a.note}` : ''}` : a.instructor || '—'}
                    </p>
                  </div>

                  {!a.cancelled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => verInscritos(a)}
                      data-testid={`ver-inscritos-${a.slot_id}`}
                    >
                      <Users size={13} className="mr-1" />
                      {a.booked}/{a.capacity}
                      {a.waiting > 0 && <span className="ml-1 text-amber-500">+{a.waiting}</span>}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!aberta} onOpenChange={(x) => !x && setAberta(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {aberta
                ? `${aberta.start_time} · ${aberta.activity_name}${aberta.label ? ` · ${aberta.label}` : ''}`
                : ''}
            </DialogTitle>
          </DialogHeader>
          {inscritos.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Ainda ninguém se inscreveu.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {inscritos.map((i) => {
                const estado = ESTADOS[i.status] || { texto: i.status, cor: '#888' };
                return (
                  <div
                    key={i.id}
                    className="flex items-center justify-between gap-2 p-2 rounded"
                    style={{ background: 'var(--background-elevated)' }}
                  >
                    <span className="text-sm truncate">
                      <span className="font-mono text-xs opacity-60 mr-2">#{i.member_number}</span>
                      {i.member_name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs font-normal shrink-0"
                      style={{ borderColor: estado.cor, color: estado.cor }}
                    >
                      {estado.texto}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AulasDeHoje;
