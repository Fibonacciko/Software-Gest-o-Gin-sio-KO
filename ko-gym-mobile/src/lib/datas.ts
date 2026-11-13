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
