import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { KeyRound, RotateCcw, Mail, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const horaPt = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * O PIN com que o sócio entra na aplicação.
 *
 * Até novembro de 2026 entrava-se com o **número de sócio e o telemóvel**.
 * Os números vão de 001 a 340 e o telemóvel sabe-o qualquer colega de treino:
 * entrar na conta de outra pessoa não exigia saber nada que não se soubesse
 * já. Hoje é número + PIN, de seis dígitos, escolhido pelo próprio.
 *
 * **Este cartão não mostra o PIN, e não há como o ver.** O que o balcão
 * precisa de saber é se o sócio já escolheu um — para perceber se a pessoa à
 * frente se esqueceu ou se ainda nem chegou a instalar a aplicação.
 *
 * **Esquecido, há dois caminhos**, e este cartão diz qual é o desta ficha:
 *
 * - **Por email**, se houver email na ficha: o sócio pede o código na
 *   aplicação e resolve-o sem sair de casa. É o caminho a preferir — não
 *   ocupa ninguém ao balcão.
 * - **Apagando o PIN aqui**, para quem não tem email, ou perdeu o acesso a
 *   ele. O **colaborador também pode**: é ele que está ao balcão quando a
 *   pessoa chega a dizer que não entra.
 *
 * O que **não pode haver** é um "esqueci-me" que volte ao telemóvel: bastava
 * dizer que se esqueceu para entrar na conta de qualquer pessoa sabendo-lhe
 * o número, que é o buraco que o PIN tapa.
 */
const PinDoSocio = ({ socio }) => {
  const [estado, setEstado] = useState(null);
  const [aGuardar, setAGuardar] = useState(false);

  const carregar = useCallback(async () => {
    if (!socio?.id) return;
    try {
      const r = await axios.get(`${API}/members/${socio.id}/pin`);
      setEstado(r.data);
    } catch {
      setEstado(null);
    }
  }, [socio?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const email = (socio?.email || '').trim();
  const temEmail = email.includes('@');

  const limpar = async () => {
    const nome = socio.name.split(' ')[0];
    const alternativa = temEmail
      ? `\n\nAtenção: ${nome} tem email na ficha (${email}) e pode pedir um ` +
        `código sozinho, em "Esqueci-me do PIN", na aplicação. Só vale a pena ` +
        `apagar aqui se não tiver acesso a esse email.`
      : '';
    if (!window.confirm(
      `Apagar o PIN de ${socio.name}?\n\n` +
      `${nome} deixa de entrar na aplicação até escolher outro. ` +
      `Para isso entra uma vez com o número de sócio e o telemóvel, como da primeira.` +
      alternativa
    )) return;
    try {
      setAGuardar(true);
      await axios.post(`${API}/members/${socio.id}/limpar-pin`);
      toast.success(`PIN apagado. ${nome} escolhe um novo ao entrar com o telemóvel.`);
      carregar();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Não foi possível apagar o PIN');
    } finally {
      setAGuardar(false);
    }
  };

  if (!socio) return null;

  const temPin = estado?.definido;
  const travado = estado?.bloqueado_ate;
  const codigoAAguardar = estado?.codigo_a_aguardar;

  return (
    <div className="text-center p-6 bg-gray-50 dark:bg-white/5 rounded-lg">
      <h4 className="font-medium mb-2 flex items-center justify-center gap-2">
        <KeyRound size={16} />
        PIN da aplicação
      </h4>

      {estado === null ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">A carregar…</p>
      ) : temPin ? (
        <>
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            Já escolheu um PIN
          </p>

          {travado && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Travado por tentativas erradas até às {horaPt(travado)}.
            </p>
          )}

          {/* Quem chega a dizer que não entra pode já ter pedido o código e
              não ter ido ao email. Sem isto, apagava-se o PIN a quem já tinha
              a resposta na caixa de correio. */}
          {codigoAAguardar && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 flex items-center justify-center gap-1">
              <Clock size={14} />
              Pediu um código por email, e ainda é válido.
            </p>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            O PIN não se vê.{' '}
            {temEmail ? (
              <>
                Se se esqueceu, pode pedir um código em <strong>Esqueci-me do
                PIN</strong>, na aplicação — chega a {email}. Apague-o aqui só
                se ele não tiver acesso a esse email.
              </>
            ) : (
              <>
                <strong>Não há email nesta ficha</strong>, por isso a aplicação
                não lhe pode mandar código. Se se esqueceu, apague-o aqui — ele
                escolhe outro ao entrar com o telemóvel.
              </>
            )}
          </p>

          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={limpar}
            disabled={aGuardar}
            data-testid="limpar-pin"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Apagar o PIN
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ainda não escolheu nenhum.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Entra na aplicação com o número de sócio e o telemóvel, e escolhe o
            PIN ali. A partir daí o telemóvel deixa de servir para entrar.
          </p>
          {!temEmail && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
              <Mail size={14} />
              Sem email na ficha, só se recupera ao balcão.
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PinDoSocio;
