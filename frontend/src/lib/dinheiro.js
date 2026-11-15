/**
 * O dinheiro, escrito como se escreve em Portugal.
 *
 * `35,00 €` — vírgula a separar os cêntimos e o símbolo **depois** do número,
 * com um espaço. O site escrevia `€35.00`, que é a forma inglesa, e escrevia-a
 * em 25 sítios com a fórmula copiada à mão em cada um. A aplicação do sócio já
 * escreve à portuguesa (`src/lib/dinheiro.ts`), e os dois lados têm de dizer o
 * mesmo: quando o sócio pergunta ao balcão quanto pagou, quem atende olha para
 * este ecrã e tem de ler o mesmo número que ele tem no telemóvel.
 *
 * **Os milhares levam ponto** — `1.250,00 €`. Só aparecem nas somas do ano e do
 * mês, nas Finanças e nos Relatórios, e é onde mais fazem falta: `12345.67`
 * conta-se com o dedo no ecrã, `12.345,67` lê-se de relance. Na aplicação do
 * sócio não há separador porque lá nunca há milhares — um pagamento é uma
 * mensalidade.
 *
 * **O sinal vem antes de tudo** (`-35,00 €`), e não entre o número e o símbolo.
 */

/** O número, sem o símbolo: `1.250,00`. Para onde o € já está escrito à mão. */
export const valorEmEuros = (valor) => {
  const n = Number(valor);
  const seguro = Number.isFinite(n) ? n : 0;
  const [inteiro, centimos] = Math.abs(seguro).toFixed(2).split('.');
  const comMilhares = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  // -0,00 não é um valor: um cêntimo negativo arredondado a zero é zero
  const sinal = seguro < 0 && Number(inteiro) + Number(centimos) > 0 ? '-' : '';
  return `${sinal}${comMilhares},${centimos}`;
};

/** O dinheiro escrito por inteiro: `1.250,00 €`. */
export const euros = (valor) => `${valorEmEuros(valor)} €`;
