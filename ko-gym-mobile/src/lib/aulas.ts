/**
 * As regras das aulas que a aplicação precisa de dizer por palavras.
 *
 * **O número vive no servidor** (`MINUTOS_PARA_DESMARCAR`, no `server.py`): é
 * ele que recusa a desmarcação tardia, e é a sua palavra que conta. Aqui está
 * a cópia que a frase do ecrã usa, porque a rota das aulas devolve uma lista
 * de aulas e não as regras do ginásio — e um pedido só para ir buscar um
 * número era um pedido a mais em cada abertura do separador.
 *
 * O que impede as duas de se separarem é um **teste que lê o `server.py`** e
 * compara (`aulas.test.ts`). Estava escrito à mão no meio do ecrã: mudar o
 * valor no servidor deixava a aplicação a prometer ao sócio um prazo que já
 * não existia, sem erro nenhum e sem ninguém dar por isso.
 */
export const MINUTOS_PARA_DESMARCAR = 120;

/**
 * `120` → `2 horas`, `60` → `1 hora`, `90` → `1h30`.
 *
 * O ginásio pode um dia querer meia hora ou noventa minutos, e a frase tem
 * de continuar a ler-se como português.
 */
export const prazoParaDesmarcar = (minutos = MINUTOS_PARA_DESMARCAR): string => {
  if (minutos < 60) return `${minutos} minutos`;
  const horas = Math.floor(minutos / 60);
  const sobram = minutos % 60;
  if (sobram) return `${horas}h${String(sobram).padStart(2, '0')}`;
  return horas === 1 ? '1 hora' : `${horas} horas`;
};
