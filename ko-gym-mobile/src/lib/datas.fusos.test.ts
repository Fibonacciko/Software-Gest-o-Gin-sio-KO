import { dataPt } from './datas';

/**
 * A data não se converte, lê-se.
 *
 * É o teste que prende a correção do `dataPt`. O risco verdadeiro é o sócio
 * abrir a aplicação fora de Portugal — na Madeira, nos Açores, no Brasil —,
 * onde `new Date('2026-11-16T00:00:00+00:00')` é o dia **15** às 21h00 e o
 * cartão mostrava um dia a menos em todas as datas.
 *
 * **O fuso da máquina não se consegue mudar daqui**: tentou-se escrever o
 * `process.env.TZ` no topo do ficheiro e não teve efeito nenhum — o
 * `jest-expo` já usou o `Date` antes, e a partir daí o Node não o relê. Um
 * teste que não falha com o código errado não serve de nada, e esse não
 * falhava.
 *
 * Por isso o fuso vem **dentro do próprio texto**: um `+14:00` ou um `-11:00`
 * faz o `new Date` mudar de dia em qualquer máquina, esteja ela onde estiver.
 * É a mesma armadilha, posta onde o teste a alcança.
 */
describe('a data não se converte, lê-se', () => {
  const comFuso = [
    '2026-11-16T00:00:00+14:00', // em Lisboa, o new Date dá dia 15
    '2026-11-16T23:00:00-11:00', // em Lisboa, o new Date dá dia 17
  ];

  it('o new Date muda mesmo de dia nestes textos', () => {
    // Se este guarda falhar, o resto do ficheiro passa sem provar nada
    const dias = comFuso.map((s) => new Date(s).getDate());
    expect(dias.some((d) => d !== 16)).toBe(true);
  });

  it('o dia é o que está escrito, venha o texto com o fuso que vier', () => {
    for (const s of comFuso) {
      expect(dataPt(s)).toBe('16/11/2026');
    }
  });
});
