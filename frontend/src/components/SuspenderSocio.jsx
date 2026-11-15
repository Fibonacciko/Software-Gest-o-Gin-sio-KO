import React, { useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Ban, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Suspender um sócio, e levantar a suspensão.
 *
 * A regra "uma suspensão manda sempre" existe desde o princípio e é
 * respeitada em todo o lado — nos filtros, no painel, no check-in, na
 * aplicação —, mas até aqui **não havia por onde a accionar**: o campo só
 * estava preenchido em fichas antigas, vindas do sistema anterior.
 *
 * **Só o administrador.** É a única coisa que passa à frente da quota paga,
 * e por isso não é decisão de quem está ao balcão — esse cobra. Ao
 * colaborador o cartão nem aparece.
 *
 * Não mexe na quota nem no seguro: as validades ficam onde estão e voltam a
 * valer quando a suspensão for levantada. E levantar **não torna o sócio
 * activo**: devolve-o ao que a quota disser.
 */
export default function SuspenderSocio({ socio, aoMudar }) {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  if (!socio || user?.role !== 'admin') return null;

  const suspenso = socio.status === 'suspended';

  const suspender = async () => {
    setAGuardar(true);
    try {
      const r = await axios.post(`${API}/members/${socio.id}/suspender`, {
        motivo: motivo.trim() || null,
      });
      toast.success('Sócio suspenso');
      setAberto(false);
      setMotivo('');
      aoMudar?.(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Não foi possível suspender');
    } finally {
      setAGuardar(false);
    }
  };

  const levantar = async () => {
    setAGuardar(true);
    try {
      const r = await axios.post(`${API}/members/${socio.id}/levantar-suspensao`);
      toast.success('Suspensão levantada');
      aoMudar?.(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Não foi possível levantar');
    } finally {
      setAGuardar(false);
    }
  };

  return (
    <div className="text-center p-6 bg-gray-50 dark:bg-white/5 rounded-lg">
      <h4 className="font-medium mb-2">Suspensão</h4>

      {suspenso ? (
        <>
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">
            Sócio suspenso
          </p>
          {socio.suspension_reason && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {socio.suspension_reason}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Enquanto estiver suspenso não entra, mesmo com a quota paga.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={levantar}
            disabled={aGuardar}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Levantar suspensão
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Suspender impede a entrada mesmo com a quota paga. A quota e o
            seguro não são tocados.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setAberto(true)}
            disabled={aGuardar}
          >
            <Ban className="w-4 h-4 mr-2" />
            Suspender sócio
          </Button>
        </>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender {socio.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Deixa de poder entrar, mesmo com a mensalidade paga. A validade
              da quota e do seguro fica onde está — volta a valer quando
              levantar a suspensão.
            </p>
            <div>
              <Label htmlFor="motivo">Porquê (opcional)</Label>
              <Textarea
                id="motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Fica escrito na ficha e no registo de alterações"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={suspender} disabled={aGuardar}>
                Suspender
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
