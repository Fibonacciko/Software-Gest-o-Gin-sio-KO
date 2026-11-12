/**
 * O horário do ginásio, lido de um texto escrito à mão.
 *
 * Na ficha do ginásio o horário é **um campo de texto** — quem o preenche
 * escreve o que quer. Mostrado como está, numa linha só, não se lê.
 *
 * Aqui parte-se esse texto em linhas e, de cada uma, tiram-se **os dias** e
 * **os períodos**. São periodos no plural de propósito: o ginásio fecha para
 * almoço, e `10h00 – 14h00 / 16h00 – 22h00` são dois, não um. Ler só o
 * primeiro dizia que às quatro da tarde estava fechado.
 *
 * Com isto a aplicação responde ao que leva alguém a abrir este separador:
 * *está aberto agora?*
 *
 * **Nunca se perde texto.** O que não se conseguir ler devolve-se como está,
 * numa linha sua: mais vale um horário feio do que um horário que desapareceu
 * porque alguém o escreveu de outra maneira.
 */

export type Periodo = { abre: number; fecha: number; texto: string };

export type LinhaDoHorario = {
  /** Os dias, como estavam escritos: "Segunda, quarta e sexta" */
  dias: string;
  /** Os períodos desse dia, já arrumados */
  periodos: Periodo[];
  /** Os dias da semana a que esta linha se aplica. 0 = domingo, como o `getDay()` */
  numeros: number[];
};

const DIAS: { nomes: string[]; numero: number }[] = [
  { nomes: ['domingo', 'dom'], numero: 0 },
  { nomes: ['segunda', '2a'], numero: 1 },
  { nomes: ['terca', '3a'], numero: 2 },
  { nomes: ['quarta', '4a'], numero: 3 },
  { nomes: ['quinta', '5a'], numero: 4 },
  { nomes: ['sexta', '6a'], numero: 5 },
  { nomes: ['sabado', 'sab'], numero: 6 },
];

export const NOME_DO_DIA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const semAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** `585` para "9h45". Sem minutos, só a hora: "22h". */
export const escreverHora = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

// "10h00 - 14h00", "10:00 às 14:00", "10h-22h", "10 - 14". O travessao pode
// ser o curto ou o longo, que e o que vem colado dos documentos do Word.
//
// O "h" sozinho tem de ser previsto a parte do "h" com minutos: em "10h-22h"
// nao ha minutos para ele levar, e sem isto a hora nao era encontrada de todo.
const HORA = String.raw`(\d{1,2})(?:\s*[h:]\s*(\d{2})|\s*[h:])?`;
const ATE = String.raw`\s*(?:-|–|—|às|as|até|ate|a)\s*`;
const HORAS = new RegExp(HORA + ATE + HORA, 'gi');

/** Todos os períodos da linha, e onde é que o primeiro começa no texto. */
const lerPeriodos = (texto: string) => {
  const periodos: Periodo[] = [];
  let primeiro = -1;
  HORAS.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HORAS.exec(texto)) !== null) {
    const abre = Number(m[1]) * 60 + Number(m[2] || 0);
    const fecha = Number(m[3]) * 60 + Number(m[4] || 0);
    if (abre > 24 * 60 || fecha > 24 * 60 || fecha <= abre) continue;
    if (primeiro < 0) primeiro = m.index;
    periodos.push({ abre, fecha, texto: `${escreverHora(abre)} às ${escreverHora(fecha)}` });
  }
  return { periodos, primeiro };
};

/** Que dias da semana é que esta linha nomeia. */
const lerDias = (texto: string) => {
  const limpo = semAcentos(texto);
  if (/todos os dias|diariamente/.test(limpo)) return [0, 1, 2, 3, 4, 5, 6];
  if (/dias uteis|segunda a sexta|2a a 6a/.test(limpo)) return [1, 2, 3, 4, 5];
  if (/fim de semana|fins de semana/.test(limpo)) return [0, 6];
  return DIAS.filter((d) => d.nomes.some((n) => limpo.includes(n))).map((d) => d.numero);
};

/**
 * Parte o texto do horário em linhas legíveis.
 *
 * Os separadores são os que as pessoas usam a sério: mudança de linha, setas,
 * barras verticais, ponto e vírgula, asterisco. As setas duplas `»«` estão lá
 * porque é assim que o horário já esteve escrito.
 *
 * A **barra normal não separa linhas**: é ela que separa os dois períodos do
 * mesmo dia (`10h-14h / 16h-22h`).
 */
export function lerHorario(texto?: string | null): LinhaDoHorario[] {
  if (!texto || !texto.trim()) return [];

  return texto
    .replace(/[»«|;*]+/g, '\n')
    .split(/\n+/)
    .map((x) => x.trim().replace(/^[-–—•·,\s]+|[-–—•·,\s]+$/g, ''))
    .filter(Boolean)
    .map((pedaco) => {
      const { periodos, primeiro } = lerPeriodos(pedaco);
      const dias = primeiro > 0 ? pedaco.slice(0, primeiro) : periodos.length ? '' : pedaco;
      return {
        dias: dias.replace(/^[-–—:,\s]+|[-–—:,\s]+$/g, '') || pedaco,
        periodos,
        numeros: lerDias(pedaco),
      };
    });
}

/**
 * Está aberto agora?
 *
 * É a pergunta que leva alguém a abrir este separador a meio da tarde, e é a
 * única coisa verdadeiramente viva numa página de informação parada.
 *
 * Devolve `null` quando o horário não se deixou ler — e aí não se inventa
 * nada: mais vale não dizer do que dizer mal.
 */
export function estadoDeHoje(
  linhas: LinhaDoHorario[],
  agora = new Date()
): { aberto: boolean; texto: string } | null {
  const uteis = linhas.filter((l) => l.periodos.length > 0 && l.numeros.length > 0);
  if (uteis.length === 0) return null;

  const hoje = agora.getDay();
  const minutos = agora.getHours() * 60 + agora.getMinutes();

  const periodosDeHoje = uteis
    .filter((l) => l.numeros.includes(hoje))
    .flatMap((l) => l.periodos)
    .sort((a, b) => a.abre - b.abre);

  const agoraAberto = periodosDeHoje.find((p) => minutos >= p.abre && minutos < p.fecha);
  if (agoraAberto) {
    return { aberto: true, texto: `Aberto agora · fecha às ${escreverHora(agoraAberto.fecha)}` };
  }

  // Ainda nao abriu, ou e a pausa do almoco
  const porAbrir = periodosDeHoje.find((p) => minutos < p.abre);
  if (porAbrir) {
    return { aberto: false, texto: `Fechado · abre às ${escreverHora(porAbrir.abre)}` };
  }

  // O proximo dia com horario, a contar de amanha
  for (let i = 1; i <= 7; i++) {
    const dia = (hoje + i) % 7;
    const linha = uteis.find((l) => l.numeros.includes(dia));
    if (linha) {
      const quando = i === 1 ? 'amanhã' : NOME_DO_DIA[dia];
      return {
        aberto: false,
        texto: `Fechado · abre ${quando} às ${escreverHora(linha.periodos[0].abre)}`,
      };
    }
  }
  return { aberto: false, texto: 'Fechado' };
}
