/**
 * Os números com casas decimais, escritos como se escrevem em Portugal.
 *
 * `79,8` e não `79.8`. O ponto é inglês, e aparecia no maior número da
 * aplicação — o peso, em 56 pixeis no alto do ecrã do Corpo — logo a seguir
 * a termos arrumado o dinheiro pela mesma razão. Uma balança que diz `79.8`
 * a um sócio português está a falar a língua errada.
 *
 * **Não é o mesmo que o dinheiro** (`dinheiro.ts`), e por isso vive à parte:
 * ali há sempre duas casas e um símbolo no fim, aqui o número aparece como
 * foi medido — `79,8` tem uma casa, `7` não tem nenhuma, e acrescentar um
 * `,0` ao sete era inventar precisão que a balança não deu.
 */

/**
 * O número como foi medido, com vírgula: `79,8`, `7`, `55,25`.
 *
 * **Uma medida em falta não escreve nada**, e nunca `0`. `Number(null)` é
 * zero em JavaScript, e uma balança que não mediu a água não mediu 0% de
 * água — escrever o zero era pôr na ficha do sócio um número que ninguém
 * mediu.
 */
export const comVirgula = (valor: number | string | null | undefined): string => {
  if (valor === null || valor === undefined || valor === '') return '';
  const n = Number(valor);
  if (!Number.isFinite(n)) return '';
  return String(n).replace('.', ',');
};

/**
 * Uma diferença, com o sinal à frente e um número certo de casas: `+2,5`,
 * `-4,4`. O `+` é preciso: sem ele, "2,5 desde a primeira medição" não diz
 * se subiu ou desceu.
 */
export const diferenca = (valor: number, casas = 1): string => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return '';
  const texto = Math.abs(n).toFixed(casas).replace('.', ',');
  return `${n > 0 ? '+' : n < 0 ? '-' : ''}${texto}`;
};
