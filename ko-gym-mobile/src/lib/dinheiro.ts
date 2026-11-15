/**
 * O dinheiro, escrito como se escreve em Portugal.
 *
 * `35,00 €` — vírgula a separar os cêntimos e o símbolo **depois** do número,
 * com um espaço. Estava escrito de duas maneiras dentro da própria aplicação:
 * a loja punha `15.00 €`, com ponto, e os pagamentos `35,00 €`. E o site de
 * gestão escreve de uma terceira, `€35.00`, que é a forma inglesa.
 *
 * Aqui fica uma só, e com testes. O site é obra à parte: mexe nas Finanças,
 * nos Relatórios e no Painel, e o dono quer ver antes.
 */
export const euros = (valor: number): string =>
  `${(Number(valor) || 0).toFixed(2).replace('.', ',')} €`;
