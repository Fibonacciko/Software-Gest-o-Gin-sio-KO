import { createContext } from 'react';

/**
 * A tira dos seis ecrãs, vista de dentro.
 *
 * Serve para um filho poder dizer "agora não te mexas". É preciso porque em
 * Android quem está por fora **intercepta o arrasto horizontal** assim que o
 * detecta: a galeria de fotografias de um artigo da Loja ficava com o dedo
 * por meio segundo e depois era a tira que lhe levava o gesto — mexia-se o
 * ecrã em vez da fotografia, quase sempre.
 *
 * Não há maneira de pedir ao pai que deixe passar: o que há é desligar-lhe o
 * deslize enquanto o dedo está em cima de quem o quer para si, e voltar a
 * ligá-lo quando o dedo sai. Por isso o bloqueio é **ligado no toque e
 * desligado em todas as saídas possíveis** — sem isso, uma saída esquecida
 * deixava a aplicação sem deslize nenhum até se fechar.
 *
 * Fica em ficheiro próprio, e não no `App.tsx`, para não se fazer um círculo:
 * o `App` conhece os ecrãs, e os ecrãs conhecem isto.
 */
export const ContextoDaTira = createContext<{ bloquear: (sim: boolean) => void } | null>(null);
