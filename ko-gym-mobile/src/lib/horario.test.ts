import { escreverHora, estadoDeHoje, lerHorario } from './horario';

/**
 * O horário do ginásio é um campo de texto escrito à mão, e quem o mostra é
 * que o lê. Estes testes são os casos que já apareceram a sério — o texto
 * como ele está hoje na ficha, o que lá esteve antes, e o que acontece
 * quando alguém escreve de outra maneira.
 */

// Como está hoje na ficha: tudo numa linha, porque o campo da gestão era de
// uma linha e as duas linhas do dono colaram-se.
const REAL =
  'Segunda, quarta e sexta: 10h00 - 14h00 / 16h00 - 22h00 ' +
  'Terça e quinta: 10h00 - 14h00 / 16h00 - 20h00';

// Dias de novembro de 2026: 9 é segunda, 10 terça, 11 quarta, 12 quinta,
// 13 sexta, 14 sábado, 15 domingo.
const as = (dia: number, hora: number, minuto = 0) => new Date(2026, 10, dia, hora, minuto);

describe('ler o horário', () => {
  it('separa os grupos mesmo quando vem tudo numa linha', () => {
    const linhas = lerHorario(REAL);

    expect(linhas).toHaveLength(2);
    expect(linhas[0].dias).toBe('Segunda, quarta e sexta');
    expect(linhas[0].numeros).toEqual([1, 3, 5]);
    expect(linhas[1].dias).toBe('Terça e quinta');
    expect(linhas[1].numeros).toEqual([2, 4]);
  });

  it('lê os dois períodos do dia, que o ginásio fecha para almoço', () => {
    // Ler só o primeiro dizia que às quatro da tarde estava fechado
    const [seg, ter] = lerHorario(REAL);

    expect(seg.periodos.map((p) => p.texto)).toEqual(['10h às 14h', '16h às 22h']);
    expect(ter.periodos.map((p) => p.texto)).toEqual(['10h às 14h', '16h às 20h']);
  });

  it('dá o mesmo resultado escrito em duas linhas', () => {
    const emDuas =
      'Segunda, quarta e sexta: 10h00 – 14h00 / 16h00 – 22h00\n' +
      'Terça e quinta: 10h00 – 14h00 / 16h00 – 20h00';

    expect(lerHorario(emDuas)).toEqual(lerHorario(REAL));
  });

  it('lê o horário antigo, com as setas', () => {
    const linhas = lerHorario('» Segunda, Quarta e Sexta 10h-22h «» Terça e Quinta 10h-20h «');

    expect(linhas).toHaveLength(2);
    expect(linhas[0].periodos.map((p) => p.texto)).toEqual(['10h às 22h']);
    expect(linhas[1].periodos.map((p) => p.texto)).toEqual(['10h às 20h']);
  });

  it('separa o sábado, que acaba na letra e não no algarismo', () => {
    // "22h Sábado": sem tratar o `h`, o sábado colava-se à linha de cima
    const linhas = lerHorario('Segunda a sexta: 10h-14h / 16h-22h Sábado: 10h30-12h30');

    expect(linhas).toHaveLength(2);
    expect(linhas[0].numeros).toEqual([1, 2, 3, 4, 5]);
    expect(linhas[1].dias).toBe('Sábado');
    expect(linhas[1].periodos.map((p) => p.texto)).toEqual(['10h30 às 12h30']);
  });

  it('não perde o que não conseguir ler', () => {
    // Mais vale um horário feio do que um horário que desapareceu
    const linhas = lerHorario('Aberto quando o professor puder');

    expect(linhas).toHaveLength(1);
    expect(linhas[0].dias).toBe('Aberto quando o professor puder');
    expect(linhas[0].periodos).toEqual([]);
  });

  it('sem horário nenhum não inventa linhas', () => {
    expect(lerHorario('')).toEqual([]);
    expect(lerHorario(null)).toEqual([]);
    expect(lerHorario(undefined)).toEqual([]);
  });

  it('não aceita um período que acaba antes de começar', () => {
    expect(lerHorario('Segunda: 22h-10h')[0].periodos).toEqual([]);
  });
});

describe('está aberto agora?', () => {
  const estado = (dia: number, hora: number, minuto = 0) =>
    estadoDeHoje(lerHorario(REAL), as(dia, hora, minuto));

  it('de manhã, num dia longo', () => {
    expect(estado(9, 11)).toEqual({ aberto: true, texto: 'Aberto agora · fecha às 14h' });
  });

  it('a pausa do almoço não é "fechado" e mais nada', () => {
    // Dizer só "fechado" fazia alguém desistir de vir
    expect(estado(10, 15)).toEqual({ aberto: false, texto: 'Fechado · abre às 16h' });
  });

  it('à noite, no dia que fecha às 22h', () => {
    expect(estado(11, 21)).toEqual({ aberto: true, texto: 'Aberto agora · fecha às 22h' });
  });

  it('à mesma hora, no dia que fecha às 20h', () => {
    expect(estado(10, 21)).toEqual({ aberto: false, texto: 'Fechado · abre amanhã às 10h' });
  });

  it('antes de abrir, diz a hora de hoje', () => {
    expect(estado(13, 9)).toEqual({ aberto: false, texto: 'Fechado · abre às 10h' });
  });

  it('ao sábado, salta para segunda', () => {
    expect(estado(14, 11)).toEqual({ aberto: false, texto: 'Fechado · abre segunda às 10h' });
  });

  it('ao domingo, diz "amanhã" e não "segunda"', () => {
    expect(estado(15, 11)).toEqual({ aberto: false, texto: 'Fechado · abre amanhã às 10h' });
  });

  it('no minuto em que fecha, já está fechado', () => {
    expect(estado(10, 20, 0)?.aberto).toBe(false);
    expect(estado(10, 19, 59)?.aberto).toBe(true);
  });

  it('sem horário que se leia, não inventa estado nenhum', () => {
    // Mais vale não dizer do que dizer mal
    expect(estadoDeHoje(lerHorario('Aberto quando o professor puder'))).toBeNull();
    expect(estadoDeHoje([])).toBeNull();
  });
});

describe('escrever a hora', () => {
  it('sem minutos, não mostra minutos', () => {
    expect(escreverHora(10 * 60)).toBe('10h');
  });

  it('com minutos, mostra-os com dois algarismos', () => {
    expect(escreverHora(10 * 60 + 5)).toBe('10h05');
    expect(escreverHora(12 * 60 + 30)).toBe('12h30');
  });
});
