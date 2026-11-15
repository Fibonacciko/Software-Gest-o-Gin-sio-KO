/**
 * As datas, escritas como se lêem em Portugal.
 *
 * Estava copiada em **três ficheiros** — no cartão do sócio, nos planos e nas
 * fotografias — e as cópias já tinham divergido: duas devolviam `null` sem
 * data e a terceira devolvia texto vazio. É a mesma armadilha que o site teve
 * com as datas antes de irem todas para `frontend/src/lib/datas.js`.
 */

/**
 * `2026-11-16T00:00:00+00:00` → `16/11/2026`.
 *
 * Sem data devolve `null`, e quem mostra decide o que pôr no lugar. Devolver
 * texto vazio obrigava quem recebe a distinguir "não há data" de "a data é
 * uma cadeia vazia", e foi assim que as três cópias se separaram.
 */
export const dataPt = (iso?: string | null): string | null =>
  iso ? new Date(iso).toLocaleDateString('pt-PT') : null;

/**
 * O número do dia dentro do texto: `2026-11-16T00:00:00+00:00` → `20261116`.
 *
 * Lê-se do **próprio texto**, nunca com `new Date(texto)`. É a mesma regra do
 * site: em Portugal, construir uma data a partir de texto e tirar-lhe o dia
 * recua um dia durante o horário de verão, e o erro é silencioso — ninguém
 * repara até alguém ver um seguro válido marcado como caducado.
 */
const numeroDoDia = (iso?: string | null): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? Number(m[1] + m[2] + m[3]) : null;
};

/**
 * A data já passou? O próprio dia **não** passou: um seguro que vale até hoje
 * ainda vale hoje. Sem data devolve `null` — não se sabe, que é diferente de
 * ter passado.
 */
export const jaPassou = (iso?: string | null, hoje = new Date()): boolean | null => {
  const quando = numeroDoDia(iso);
  if (quando === null) return null;
  const n =
    hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
  return quando < n;
};
