/**
 * As datas, escritas como se lêem em Portugal.
 *
 * Estava copiada em **três ficheiros** — no cartão do sócio, nos planos e nas
 * fotografias — e as cópias já tinham divergido: duas devolviam `null` sem
 * data e a terceira devolvia texto vazio. É a mesma armadilha que o site teve
 * com as datas antes de irem todas para `frontend/src/lib/datas.js`.
 *
 * **Lê-se sempre do próprio texto, nunca com `new Date(texto)`.** As datas
 * vêm do servidor como `2026-11-16T00:00:00+00:00`, e a meia-noite em UTC é
 * o dia anterior às 23h00 em qualquer fuso a oeste de Londres. Em Lisboa não
 * dá erro — dá 00h ou 01h do dia certo —, mas o sócio que abre a aplicação
 * no Brasil, na Madeira ou nos Açores lia um dia a menos em cada data do
 * cartão. O `jaPassou` já lia do texto por esta razão; o `dataPt` ficou para
 * trás e era o único sítio da aplicação onde a armadilha estava de pé.
 */

/** O ano, o mês e o dia tal como estão escritos no texto. */
const partes = (iso?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((iso ?? '').trim());
  return m ? { ano: m[1], mes: m[2], dia: m[3] } : null;
};

/**
 * `2026-11-16T00:00:00+00:00` → `16/11/2026`.
 *
 * Sem data devolve `null`, e quem mostra decide o que pôr no lugar. Devolver
 * texto vazio obrigava quem recebe a distinguir "não há data" de "a data é
 * uma cadeia vazia", e foi assim que as três cópias se separaram.
 *
 * O que não se conseguir ler **devolve-se como está**, em vez de desaparecer:
 * uma data estranha à vista diz a quem está ao balcão que há ali algo para
 * emendar, e um `null` dizia "Sem registo", que é mentira.
 */
export const dataPt = (iso?: string | null): string | null => {
  const p = partes(iso);
  if (p) return `${p.dia}/${p.mes}/${p.ano}`;
  return (iso ?? '').trim() || null;
};

/**
 * O número do dia dentro do texto: `2026-11-16T00:00:00+00:00` → `20261116`.
 *
 * Comparam-se como números (`20261116 < 20261201`), que é a mesma regra do
 * site em `frontend/src/lib/estatisticas.js`.
 */
const numeroDoDia = (iso?: string | null): number | null => {
  const p = partes(iso);
  return p ? Number(p.ano + p.mes + p.dia) : null;
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
