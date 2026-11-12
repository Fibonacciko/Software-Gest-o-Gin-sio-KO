import { createContext } from 'react';

/**
 * A tira dos seis ecrãs, vista de dentro.
 *
 * Serve para um filho dizer "agora não te mexas". É preciso porque em Android
 * quem está por fora **intercepta o arrasto horizontal** assim que o detecta:
 * a galeria de fotografias de um artigo da Loja ficava com o dedo meio
 * segundo e depois era a tira que lhe levava o gesto — mexia-se o ecrã em vez
 * da fotografia, quase sempre.
 *
 * **Isto não mexe em nenhum estado.** A primeira tentativa guardava um
 * `useState` no `App`, e cada toque obrigava a aplicação inteira a
 * redesenhar-se a meio do gesto: as fotografias continuaram sem rodar e, ao
 * abrir um artigo, a janela passou a aparecer sem imagem nenhuma. Agora o
 * `App` mexe directamente na tira (`setNativeProps`), sem redesenhar nada.
 *
 * O bloqueio liga no toque e desliga em **todas** as saídas possíveis — uma
 * esquecida deixava a aplicação sem deslize até se fechar.
 *
 * Fica em ficheiro próprio, e não no `App.tsx`, para não se fazer um círculo:
 * o `App` conhece os ecrãs, e os ecrãs conhecem isto.
 */
export const ContextoDaTira = createContext<{ bloquear: (sim: boolean) => void } | null>(null);
