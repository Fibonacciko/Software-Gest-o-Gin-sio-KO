/**
 * Datas, do lado do ecrã.
 *
 * Há uma só regra aqui, e é a que mais tempo custou nesta base de código:
 * **nunca `toISOString()` sobre uma data local**. O `toISOString()` passa a
 * data para UTC, e em Portugal, no horário de verão, isso recua um dia.
 *
 * O dia 1 de julho às 00:00 em Lisboa é 30 de junho às 23:00 em UTC, por isso
 * `new Date(2026, 6, 1).toISOString()` devolve `"2026-06-30"`. Um filtro de
 * "este mês" começava no último dia do mês anterior, todos os dias, durante
 * metade do ano — e sem dar erro nenhum, só um número que não batia certo.
 *
 * Lê-se o ano, o mês e o dia da própria data, e não se converte nada.
 */

/** O dia de uma data, como `AAAA-MM-DD`, nos componentes locais. */
export const diaLocal = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** O dia de hoje, como `AAAA-MM-DD`. */
export const hoje = () => diaLocal(new Date());

/**
 * O dia seguinte a uma data, como `AAAA-MM-DD`.
 *
 * Nas consultas ao servidor, o limite superior de um intervalo tem de ser o
 * dia seguinte (`$lt`), senão exclui o próprio dia.
 */
export const diaSeguinte = (d = new Date()) => {
  const seguinte = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return diaLocal(seguinte);
};

/** O primeiro dia do mês de uma data. */
export const primeiroDiaDoMes = (d = new Date()) =>
  diaLocal(new Date(d.getFullYear(), d.getMonth(), 1));

/** O último dia do mês de uma data. */
export const ultimoDiaDoMes = (d = new Date()) =>
  diaLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
